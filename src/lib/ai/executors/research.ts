import type { ToolResult, ToolExecutionContext } from "../types";

// Web search using a search API (we'll use DuckDuckGo or similar)
export async function executeSearchWeb(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const query = input.query as string;
    const searchType = (input.searchType as string) || "general";
    const maxResults = (input.maxResults as number) || 5;

    // Enhance query based on search type
    let enhancedQuery = query;
    if (searchType === "jobs") {
      enhancedQuery = `${query} job internship career`;
    } else if (searchType === "academic") {
      enhancedQuery = `${query} research paper academic`;
    } else if (searchType === "tutorials") {
      enhancedQuery = `${query} tutorial guide how to`;
    }

    // Use DuckDuckGo Instant Answer API (free, no key required)
    // For more comprehensive results, could integrate with SerpAPI or similar
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(enhancedQuery)}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse DuckDuckGo response
    const results: Array<{
      title: string;
      url: string;
      snippet: string;
    }> = [];

    // Abstract (main answer)
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || "Main Result",
        url: data.AbstractURL,
        snippet: data.Abstract,
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text.substring(0, 50),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    // If we don't have enough results, add a note
    if (results.length === 0) {
      return {
        success: true,
        data: {
          message: "No direct results found. Try rephrasing the query or being more specific.",
          query: enhancedQuery,
          suggestion: "For job searches, try including the company name or specific job title.",
        },
      };
    }

    return {
      success: true,
      data: {
        query: enhancedQuery,
        resultCount: results.length,
        results,
        note: searchType === "jobs"
          ? "For comprehensive job listings, also check LinkedIn, Indeed, Glassdoor directly."
          : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

// Fetch and parse webpage content
export async function executeFetchWebPage(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const url = input.url as string;
    const extractType = (input.extractType as string) || "main_content";

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: "Invalid URL provided" };
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrganizerBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch page: ${response.statusText}` };
    }

    const html = await response.text();

    // Basic HTML to text extraction
    let content = html
      // Remove scripts and styles
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Extract based on type
    if (extractType === "summary") {
      content = content.substring(0, 500) + "...";
    } else if (extractType === "main_content") {
      content = content.substring(0, 2000);
    } else if (extractType === "links") {
      const linkMatches = html.match(/href="([^"]+)"/g) || [];
      const links = linkMatches
        .map((m) => m.replace('href="', "").replace('"', ""))
        .filter((l) => l.startsWith("http"))
        .slice(0, 20);
      return {
        success: true,
        data: {
          url,
          linkCount: links.length,
          links,
        },
      };
    }

    return {
      success: true,
      data: {
        url,
        extractType,
        contentLength: content.length,
        content,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch webpage",
    };
  }
}

// Research topic by combining multiple searches
export async function executeResearchTopic(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const topic = input.topic as string;
    const context = input.context as string | undefined;
    const depth = (input.depth as string) || "moderate";
    const focus = input.focus as string[] | undefined;

    const findings: Array<{
      aspect: string;
      summary: string;
      sources: string[];
    }> = [];

    // Determine search queries based on depth and focus
    const queries: string[] = [topic];

    if (focus && focus.length > 0) {
      for (const f of focus) {
        queries.push(`${topic} ${f}`);
      }
    }

    if (depth === "thorough") {
      queries.push(`${topic} guide`);
      queries.push(`${topic} best practices`);
      queries.push(`${topic} examples`);
    }

    // Limit queries based on depth
    const maxQueries = depth === "quick" ? 1 : depth === "moderate" ? 3 : 5;
    const searchQueries = queries.slice(0, maxQueries);

    // Execute searches
    for (const query of searchQueries) {
      const result = await executeSearchWeb({ query, maxResults: 3 }, ctx);
      if (result.success && result.data) {
        const data = result.data as { results?: Array<{ title: string; snippet: string; url: string }> };
        if (data.results && data.results.length > 0) {
          findings.push({
            aspect: query,
            summary: data.results.map((r) => r.snippet).join(" "),
            sources: data.results.map((r) => r.url),
          });
        }
      }
    }

    return {
      success: true,
      data: {
        topic,
        context,
        depth,
        findingsCount: findings.length,
        findings,
        recommendations: findings.length === 0
          ? "Consider breaking down the topic into more specific queries."
          : `Found information on ${findings.length} aspects of "${topic}".`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    };
  }
}
