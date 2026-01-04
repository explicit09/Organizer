import { getDefaultUserId } from "./auth";
import { listItems, type Item } from "./items";

// ========== Duplicate Detection ==========

export type DuplicateGroup = {
  items: Item[];
  similarity: number;
  reason: string;
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "i", "you", "he", "she", "it", "we", "they", "my", "your", "his",
    "her", "its", "our", "their", "this", "that", "these", "those",
  ]);

  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.has(word))
  );
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = getWords(text1);
  const words2 = getWords(text2);

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size; // Jaccard similarity
}

export function detectDuplicates(
  options?: { userId?: string; threshold?: number }
): DuplicateGroup[] {
  const userId = options?.userId ?? getDefaultUserId();
  const threshold = options?.threshold ?? 0.5;
  const items = listItems(undefined, { userId });

  const duplicates: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    if (processed.has(items[i].id)) continue;

    const group: Item[] = [items[i]];
    let maxSimilarity = 0;
    let reason = "";

    for (let j = i + 1; j < items.length; j++) {
      if (processed.has(items[j].id)) continue;

      const titleSimilarity = calculateSimilarity(items[i].title, items[j].title);

      // Check for exact title match (case insensitive)
      if (normalizeText(items[i].title) === normalizeText(items[j].title)) {
        group.push(items[j]);
        processed.add(items[j].id);
        maxSimilarity = 1;
        reason = "Exact title match";
        continue;
      }

      // Check title similarity
      if (titleSimilarity >= threshold) {
        group.push(items[j]);
        processed.add(items[j].id);
        if (titleSimilarity > maxSimilarity) {
          maxSimilarity = titleSimilarity;
          reason = `Similar titles (${Math.round(titleSimilarity * 100)}% match)`;
        }
        continue;
      }

      // Check if details are similar
      const iDetails = items[i].details;
      const jDetails = items[j].details;
      if (iDetails && jDetails) {
        const detailsSimilarity = calculateSimilarity(
          iDetails,
          jDetails
        );
        if (detailsSimilarity >= threshold) {
          group.push(items[j]);
          processed.add(items[j].id);
          if (detailsSimilarity > maxSimilarity) {
            maxSimilarity = detailsSimilarity;
            reason = `Similar details (${Math.round(detailsSimilarity * 100)}% match)`;
          }
        }
      }
    }

    if (group.length > 1) {
      duplicates.push({
        items: group,
        similarity: maxSimilarity,
        reason,
      });
      processed.add(items[i].id);
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

// ========== Related Items (Context-Aware) ==========

export type RelatedItem = {
  item: Item;
  score: number;
  reasons: string[];
};

export function findRelatedItems(
  itemId: string,
  options?: { userId?: string; limit?: number }
): RelatedItem[] {
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 5;
  const items = listItems(undefined, { userId });

  const targetItem = items.find((i) => i.id === itemId);
  if (!targetItem) return [];

  const related: RelatedItem[] = [];

  for (const item of items) {
    if (item.id === itemId) continue;

    let score = 0;
    const reasons: string[] = [];

    // Same type bonus
    if (item.type === targetItem.type) {
      score += 0.1;
      reasons.push("Same type");
    }

    // Same project
    if (targetItem.projectId && item.projectId === targetItem.projectId) {
      score += 0.3;
      reasons.push("Same project");
    }

    // Same course
    if (targetItem.courseId && item.courseId === targetItem.courseId) {
      score += 0.3;
      reasons.push("Same course");
    }

    // Shared tags
    const sharedTags = targetItem.tags.filter((tag) => item.tags.includes(tag));
    if (sharedTags.length > 0) {
      score += 0.2 * Math.min(sharedTags.length, 3);
      reasons.push(`Shared tags: ${sharedTags.join(", ")}`);
    }

    // Title similarity
    const titleSimilarity = calculateSimilarity(targetItem.title, item.title);
    if (titleSimilarity > 0.2) {
      score += titleSimilarity * 0.3;
      reasons.push("Similar title");
    }

    // Close due dates (within 3 days)
    if (targetItem.dueAt && item.dueAt) {
      const daysDiff = Math.abs(
        (new Date(targetItem.dueAt).getTime() - new Date(item.dueAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 3) {
        score += 0.15 * (1 - daysDiff / 3);
        reasons.push("Similar deadline");
      }
    }

    // Parent-child relationship
    if (item.parentId === targetItem.id) {
      score += 0.5;
      reasons.push("Subtask");
    }
    if (targetItem.parentId === item.id) {
      score += 0.5;
      reasons.push("Parent task");
    }

    // Sibling tasks (same parent)
    if (targetItem.parentId && item.parentId === targetItem.parentId) {
      score += 0.3;
      reasons.push("Sibling task");
    }

    if (score > 0) {
      related.push({ item, score, reasons });
    }
  }

  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ========== Smart Search with Context ==========

export type SearchResult = {
  item: Item;
  matchType: "title" | "details" | "tags" | "related";
  relevance: number;
  highlights: string[];
};

export function smartSearch(
  query: string,
  options?: { userId?: string; limit?: number; includeRelated?: boolean }
): SearchResult[] {
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 20;
  const includeRelated = options?.includeRelated ?? true;
  const items = listItems(undefined, { userId });

  const queryWords = getWords(query);
  const queryNormalized = normalizeText(query);
  const results: SearchResult[] = [];

  for (const item of items) {
    const titleNormalized = normalizeText(item.title);
    const detailsNormalized = item.details ? normalizeText(item.details) : "";
    const tagsNormalized = item.tags.map((t) => normalizeText(t));

    let relevance = 0;
    let matchType: SearchResult["matchType"] = "title";
    const highlights: string[] = [];

    // Exact phrase match in title (highest priority)
    if (titleNormalized.includes(queryNormalized)) {
      relevance += 1.0;
      highlights.push(`Title contains "${query}"`);
    }

    // Word matches in title
    const titleWords = getWords(item.title);
    const titleMatches = [...queryWords].filter((w) => titleWords.has(w));
    if (titleMatches.length > 0) {
      relevance += 0.3 * (titleMatches.length / queryWords.size);
      highlights.push(`Title words: ${titleMatches.join(", ")}`);
    }

    // Exact phrase match in details
    if (detailsNormalized.includes(queryNormalized)) {
      relevance += 0.6;
      matchType = "details";
      highlights.push(`Details contains "${query}"`);
    }

    // Word matches in details
    if (item.details) {
      const detailsWords = getWords(item.details);
      const detailsMatches = [...queryWords].filter((w) => detailsWords.has(w));
      if (detailsMatches.length > 0) {
        relevance += 0.2 * (detailsMatches.length / queryWords.size);
        matchType = matchType === "title" && titleMatches.length === 0 ? "details" : matchType;
        highlights.push(`Details words: ${detailsMatches.join(", ")}`);
      }
    }

    // Tag matches
    const tagMatches = tagsNormalized.filter((tag) =>
      [...queryWords].some((w) => tag.includes(w))
    );
    if (tagMatches.length > 0) {
      relevance += 0.4 * tagMatches.length;
      matchType = relevance === 0 ? "tags" : matchType;
      highlights.push(`Tags: ${tagMatches.join(", ")}`);
    }

    if (relevance > 0) {
      results.push({ item, matchType, relevance, highlights });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  // Add related items if requested and we have direct matches
  if (includeRelated && results.length > 0 && results.length < limit) {
    const topResult = results[0];
    const relatedItems = findRelatedItems(topResult.item.id, { userId, limit: 3 });

    for (const related of relatedItems) {
      if (!results.some((r) => r.item.id === related.item.id)) {
        results.push({
          item: related.item,
          matchType: "related",
          relevance: related.score * 0.5, // Lower relevance for related items
          highlights: related.reasons,
        });
      }
    }
  }

  return results.slice(0, limit);
}
