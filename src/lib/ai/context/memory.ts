import type { MemoryContext, PreferenceItem } from "./types";
import { getDb } from "../../db";

export function getMemoryContext(userId: string): MemoryContext {
  const db = getDb();

  // Get recent conversation topics from AI conversations
  const recentConversations = db
    .prepare(
      `
      SELECT content FROM ai_conversations
      WHERE user_id = ? AND role = 'user'
      ORDER BY created_at DESC
      LIMIT 20
    `
    )
    .all(userId) as Array<{ content: string }>;

  // Extract topics from conversations (simple keyword extraction)
  const topicKeywords = new Set<string>();
  for (const conv of recentConversations) {
    const words = conv.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 4 && !commonWords.has(word)) {
        topicKeywords.add(word);
      }
    }
  }
  const recentTopics = Array.from(topicKeywords).slice(0, 10);

  // Get ongoing projects
  const projects = db
    .prepare(
      `
      SELECT name FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 5
    `
    )
    .all(userId) as Array<{ name: string }>;

  const ongoingProjects = projects.map((p) => p.name);

  // Get mentioned constraints from preferences
  const constraints = db
    .prepare(
      `
      SELECT value FROM user_preferences
      WHERE user_id = ? AND category = 'constraints'
    `
    )
    .all(userId) as Array<{ value: string }>;

  const mentionedConstraints = constraints.map((c) => c.value);

  // Get expressed frustrations from observations
  const frustrations = db
    .prepare(
      `
      SELECT content FROM ai_memory
      WHERE user_id = ? AND category = 'struggles'
      ORDER BY created_at DESC
      LIMIT 5
    `
    )
    .all(userId) as Array<{ content: string }>;

  const expressedFrustrations = frustrations.map((f) => f.content);

  return {
    recentTopics,
    ongoingProjects,
    mentionedConstraints,
    expressedFrustrations,
  };
}

export function getUserPreferences(userId: string): PreferenceItem[] {
  const db = getDb();

  // Check if table exists
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'")
    .get();

  if (!tableExists) {
    return [];
  }

  const prefs = db
    .prepare(
      `
      SELECT category, key, value FROM user_preferences
      WHERE user_id = ?
    `
    )
    .all(userId) as Array<{ category: string; key: string; value: string }>;

  return prefs.map((p) => ({
    category: p.category,
    key: p.key,
    value: p.value,
  }));
}

// Common words to filter out
const commonWords = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "day", "had", "has", "his", "how", "its",
  "may", "new", "now", "old", "see", "way", "who", "boy", "did", "get",
  "let", "put", "say", "she", "too", "use", "what", "this", "that", "with",
  "have", "from", "they", "will", "would", "there", "their", "been", "call",
  "could", "make", "like", "time", "just", "know", "take", "come", "some",
  "than", "them", "then", "think", "also", "back", "after", "most", "other",
  "about", "these", "please", "thanks", "help", "want", "need", "show",
]);
