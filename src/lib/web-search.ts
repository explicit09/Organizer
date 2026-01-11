// Web Search Service
// Supports multiple search providers with fallback to simulated results

export type SearchResult = {
  title: string;
  url: string;
  description: string;
  source: string;
  type: "internship" | "company" | "resource" | "tutorial" | "job" | "general";
  metadata?: {
    company?: string;
    location?: string;
    salary?: string;
    remote?: boolean;
    date?: string;
  };
};

export type SearchOptions = {
  query: string;
  type?: "internships" | "companies" | "resources" | "tutorials" | "jobs" | "all";
  location?: string;
  remote?: boolean;
  limit?: number;
};

// ============ Main Search Function ============

export async function webSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { query, type = "all", limit = 10 } = options;

  // Try real search providers if API keys are available
  const serperKey = process.env.SERPER_API_KEY;
  const bingKey = process.env.BING_SEARCH_API_KEY;

  if (serperKey) {
    try {
      return await searchWithSerper(options, serperKey);
    } catch (error) {
      console.error("Serper search failed:", error);
    }
  }

  if (bingKey) {
    try {
      return await searchWithBing(options, bingKey);
    } catch (error) {
      console.error("Bing search failed:", error);
    }
  }

  // Fallback to simulated/curated results
  return getSimulatedResults(options);
}

// ============ Serper API (Google Search) ============

async function searchWithSerper(
  options: SearchOptions,
  apiKey: string
): Promise<SearchResult[]> {
  const { query, type, location, limit = 10 } = options;

  // Build enhanced query based on type
  let enhancedQuery = query;
  if (type === "internships") {
    enhancedQuery = `${query} internship 2026 site:linkedin.com OR site:glassdoor.com OR site:indeed.com`;
  } else if (type === "companies") {
    enhancedQuery = `${query} company careers hiring`;
  } else if (type === "jobs") {
    enhancedQuery = `${query} job opening site:linkedin.com OR site:indeed.com`;
  }

  if (location) {
    enhancedQuery += ` ${location}`;
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: enhancedQuery,
      num: limit,
    }),
  });

  if (!response.ok) {
    throw new Error("Serper API error");
  }

  const data = await response.json();
  const results: SearchResult[] = [];

  for (const item of data.organic || []) {
    results.push({
      title: item.title,
      url: item.link,
      description: item.snippet,
      source: new URL(item.link).hostname,
      type: classifyResult(item.title, item.snippet, type),
      metadata: extractMetadata(item.title, item.snippet),
    });
  }

  return results.slice(0, limit);
}

// ============ Bing Search API ============

async function searchWithBing(
  options: SearchOptions,
  apiKey: string
): Promise<SearchResult[]> {
  const { query, type, location, limit = 10 } = options;

  let enhancedQuery = query;
  if (type === "internships") {
    enhancedQuery = `${query} internship`;
  }
  if (location) {
    enhancedQuery += ` ${location}`;
  }

  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(enhancedQuery)}&count=${limit}`,
    {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Bing API error");
  }

  const data = await response.json();
  const results: SearchResult[] = [];

  for (const item of data.webPages?.value || []) {
    results.push({
      title: item.name,
      url: item.url,
      description: item.snippet,
      source: new URL(item.url).hostname,
      type: classifyResult(item.name, item.snippet, type),
      metadata: extractMetadata(item.name, item.snippet),
    });
  }

  return results.slice(0, limit);
}

// ============ Simulated Results ============

function getSimulatedResults(options: SearchOptions): SearchResult[] {
  const { query, type, location } = options;
  const queryLower = query.toLowerCase();

  // Curated results for common searches
  const results: SearchResult[] = [];

  if (type === "internships" || queryLower.includes("internship")) {
    results.push(
      {
        title: "Software Engineering Intern, Summer 2026 - Google",
        url: "https://careers.google.com/jobs/results/",
        description: "Join Google's engineering team for a 12-week summer internship. Work on products used by billions of people. Open to CS students graduating 2027.",
        source: "careers.google.com",
        type: "internship",
        metadata: {
          company: "Google",
          location: "Mountain View, CA (Hybrid)",
          remote: false,
        },
      },
      {
        title: "Microsoft Explore Internship Program",
        url: "https://careers.microsoft.com/students/us/en/usexploremicrosoftprogram",
        description: "A 12-week summer internship for first and second-year college students. Explore software engineering, program management, and design.",
        source: "careers.microsoft.com",
        type: "internship",
        metadata: {
          company: "Microsoft",
          location: "Redmond, WA",
          remote: false,
        },
      },
      {
        title: "Meta University Engineering Internship",
        url: "https://www.metacareers.com/jobs/",
        description: "Build products that connect billions of people. 12-week internship for students pursuing CS degrees. Mentorship and real-world projects.",
        source: "metacareers.com",
        type: "internship",
        metadata: {
          company: "Meta",
          location: "Menlo Park, CA (Hybrid)",
          remote: false,
        },
      },
      {
        title: "Amazon SDE Internship 2026",
        url: "https://www.amazon.jobs/en/jobs/",
        description: "Software Development Engineer internship. Work on real features, dive deep into Amazon's technology, and deliver impactful projects.",
        source: "amazon.jobs",
        type: "internship",
        metadata: {
          company: "Amazon",
          location: "Seattle, WA (Multiple locations)",
          remote: false,
        },
      },
      {
        title: "Apple Software Engineering Internship",
        url: "https://jobs.apple.com/en-us/search",
        description: "Join Apple's engineering teams and work on products that delight customers. iOS, macOS, ML, and infrastructure opportunities.",
        source: "jobs.apple.com",
        type: "internship",
        metadata: {
          company: "Apple",
          location: "Cupertino, CA",
          remote: false,
        },
      }
    );
  }

  if (type === "companies" || queryLower.includes("company") || queryLower.includes("hiring")) {
    results.push(
      {
        title: "Stripe - Careers",
        url: "https://stripe.com/jobs",
        description: "Help build the economic infrastructure for the internet. Known for excellent engineering culture and work on payments at scale.",
        source: "stripe.com",
        type: "company",
        metadata: {
          company: "Stripe",
          remote: true,
        },
      },
      {
        title: "Figma - Design & Engineering Jobs",
        url: "https://www.figma.com/careers/",
        description: "Build tools that help teams design together. Strong engineering culture with focus on collaboration and creativity.",
        source: "figma.com",
        type: "company",
        metadata: {
          company: "Figma",
          remote: true,
        },
      },
      {
        title: "Vercel - Join Our Team",
        url: "https://vercel.com/careers",
        description: "Build the future of web development. Work on Next.js, edge computing, and developer tools used by millions.",
        source: "vercel.com",
        type: "company",
        metadata: {
          company: "Vercel",
          remote: true,
        },
      },
      {
        title: "Linear - Careers",
        url: "https://linear.app/careers",
        description: "Build the best software project management tool. Small team, high impact, beautiful product.",
        source: "linear.app",
        type: "company",
        metadata: {
          company: "Linear",
          remote: true,
        },
      }
    );
  }

  if (type === "resources" || type === "tutorials" || queryLower.includes("learn") || queryLower.includes("skill")) {
    results.push(
      {
        title: "Roadmap.sh - Developer Roadmaps",
        url: "https://roadmap.sh/",
        description: "Community-driven roadmaps, articles and resources for developers. Frontend, backend, DevOps, and more.",
        source: "roadmap.sh",
        type: "resource",
      },
      {
        title: "The Odin Project - Full Stack Curriculum",
        url: "https://www.theodinproject.com/",
        description: "Free full-stack curriculum. Learn web development with hands-on projects and community support.",
        source: "theodinproject.com",
        type: "tutorial",
      },
      {
        title: "LeetCode - Coding Interview Prep",
        url: "https://leetcode.com/",
        description: "Practice coding problems to prepare for technical interviews. Used by millions of developers.",
        source: "leetcode.com",
        type: "resource",
      }
    );
  }

  // Filter by location if specified
  if (location) {
    const locationLower = location.toLowerCase();
    return results.filter(r => 
      !r.metadata?.location || 
      r.metadata.location.toLowerCase().includes(locationLower) ||
      r.metadata.remote
    );
  }

  return results;
}

// ============ Helper Functions ============

function classifyResult(
  title: string,
  description: string,
  requestedType?: string
): SearchResult["type"] {
  const text = `${title} ${description}`.toLowerCase();

  if (requestedType === "internships" || text.includes("internship") || text.includes("intern ")) {
    return "internship";
  }
  if (requestedType === "jobs" || text.includes("job opening") || text.includes("hiring")) {
    return "job";
  }
  if (requestedType === "companies" || text.includes("career") || text.includes("join our team")) {
    return "company";
  }
  if (requestedType === "tutorials" || text.includes("tutorial") || text.includes("course") || text.includes("learn")) {
    return "tutorial";
  }
  if (requestedType === "resources" || text.includes("guide") || text.includes("roadmap")) {
    return "resource";
  }

  return "general";
}

function extractMetadata(title: string, description: string): SearchResult["metadata"] {
  const text = `${title} ${description}`;
  const metadata: SearchResult["metadata"] = {};

  // Extract company name
  const companyMatch = text.match(/(?:at|@)\s+(\w+(?:\s+\w+)?)/i);
  if (companyMatch) {
    metadata.company = companyMatch[1];
  }

  // Check for remote
  if (text.toLowerCase().includes("remote")) {
    metadata.remote = true;
  }

  // Extract location patterns
  const locationMatch = text.match(/(?:in|at|location:?)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z]{2})?)/);
  if (locationMatch) {
    metadata.location = locationMatch[1];
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

// ============ Search with Categories ============

export async function searchByCategory(
  category: "internships" | "companies" | "resources",
  filters?: {
    location?: string;
    remote?: boolean;
    keywords?: string[];
  }
): Promise<SearchResult[]> {
  const categoryQueries: Record<string, string> = {
    internships: "software engineering internship 2026",
    companies: "top tech companies hiring junior developers",
    resources: "learn programming developer resources",
  };

  let query = categoryQueries[category] || category;
  
  if (filters?.keywords) {
    query += ` ${filters.keywords.join(" ")}`;
  }

  return webSearch({
    query,
    type: category,
    location: filters?.location,
    remote: filters?.remote,
    limit: 10,
  });
}
