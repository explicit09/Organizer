// GitHub Repository Analyzer
// Analyzes repository structure, patterns, and generates implementation suggestions

import {
  getGitHubConnection,
  getActiveTrackedRepos,
  type TrackedRepo,
} from "./github";

// ============ Types ============

export type RepoAnalysis = {
  name: string;
  owner: string;
  description?: string;
  structure: DirectoryStructure;
  techStack: TechStack;
  patterns: CodePattern[];
  metrics: RepoMetrics;
  recommendations: Recommendation[];
};

export type DirectoryStructure = {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: DirectoryStructure[];
  language?: string;
  size?: number;
};

export type TechStack = {
  languages: Array<{ name: string; percentage: number }>;
  frameworks: string[];
  tools: string[];
  packageManager?: string;
  buildTools: string[];
};

export type CodePattern = {
  name: string;
  type: "architecture" | "design" | "style" | "convention";
  description: string;
  files: string[];
  confidence: number; // 0-100
};

export type RepoMetrics = {
  totalFiles: number;
  totalLines?: number;
  contributors: number;
  commits: number;
  branches: number;
  openIssues: number;
  openPRs: number;
  lastUpdated: string;
};

export type Recommendation = {
  type: "improvement" | "warning" | "suggestion";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: "code-quality" | "security" | "performance" | "documentation" | "testing";
};

export type ImplementationSuggestion = {
  feature: string;
  approach: string;
  steps: ImplementationStep[];
  estimatedTime: string;
  complexity: "low" | "medium" | "high";
  relatedFiles: string[];
  codeExamples: CodeExample[];
};

export type ImplementationStep = {
  order: number;
  title: string;
  description: string;
  files?: string[];
  codeChanges?: string;
};

export type CodeExample = {
  file: string;
  language: string;
  code: string;
  description: string;
};

export type PRDraft = {
  title: string;
  description: string;
  branch: string;
  baseBranch: string;
  commits: Array<{
    message: string;
    changes: Array<{
      file: string;
      action: "create" | "modify" | "delete";
      diff?: string;
    }>;
  }>;
  reviewers?: string[];
  labels?: string[];
};

// ============ GitHub API Helpers ============

async function githubFetch(
  endpoint: string,
  accessToken: string
): Promise<Response> {
  return fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// ============ Repository Analysis ============

export async function analyzeRepository(
  owner: string,
  repo: string,
  options: { userId: string; depth?: "shallow" | "deep" }
): Promise<RepoAnalysis> {
  const connection = getGitHubConnection(options.userId);
  
  if (!connection) {
    // Return analysis based on available information
    return getBasicAnalysis(owner, repo);
  }

  const accessToken = connection.accessToken;
  const depth = options.depth || "shallow";

  try {
    // Fetch repository info
    const repoRes = await githubFetch(`/repos/${owner}/${repo}`, accessToken);
    const repoData = repoRes.ok ? await repoRes.json() : null;

    // Fetch languages
    const langRes = await githubFetch(`/repos/${owner}/${repo}/languages`, accessToken);
    const languages = langRes.ok ? await langRes.json() : {};

    // Fetch contributors
    const contribRes = await githubFetch(`/repos/${owner}/${repo}/contributors?per_page=1`, accessToken);
    const contributorCount = parseInt(contribRes.headers.get("x-total-count") || "0") || 
      (contribRes.ok ? (await contribRes.json()).length : 0);

    // Fetch branches
    const branchRes = await githubFetch(`/repos/${owner}/${repo}/branches?per_page=1`, accessToken);
    const branchCount = parseInt(branchRes.headers.get("x-total-count") || "0") || 
      (branchRes.ok ? (await branchRes.json()).length : 0);

    // Fetch directory structure (root level for shallow, recursive for deep)
    const structure = await fetchDirectoryStructure(owner, repo, accessToken, depth);

    // Analyze tech stack
    const techStack = analyzeTechStack(languages, structure);

    // Detect patterns
    const patterns = detectPatterns(structure, techStack);

    // Generate recommendations
    const recommendations = generateRecommendations(structure, techStack, patterns);

    return {
      name: repo,
      owner,
      description: repoData?.description,
      structure,
      techStack,
      patterns,
      metrics: {
        totalFiles: countFiles(structure),
        contributors: contributorCount,
        commits: 0, // Would need additional API call
        branches: branchCount,
        openIssues: repoData?.open_issues_count || 0,
        openPRs: 0, // Would need additional API call
        lastUpdated: repoData?.updated_at || new Date().toISOString(),
      },
      recommendations,
    };
  } catch (error) {
    console.error("Error analyzing repository:", error);
    return getBasicAnalysis(owner, repo);
  }
}

async function fetchDirectoryStructure(
  owner: string,
  repo: string,
  accessToken: string,
  depth: "shallow" | "deep"
): Promise<DirectoryStructure> {
  const res = await githubFetch(`/repos/${owner}/${repo}/contents`, accessToken);
  
  if (!res.ok) {
    return { name: repo, type: "directory", path: "/", children: [] };
  }

  const contents = await res.json();
  const children: DirectoryStructure[] = [];

  for (const item of contents) {
    if (item.type === "file") {
      children.push({
        name: item.name,
        type: "file",
        path: item.path,
        language: getLanguageFromExtension(item.name),
        size: item.size,
      });
    } else if (item.type === "dir") {
      if (depth === "deep" && !shouldSkipDirectory(item.name)) {
        // Recursively fetch subdirectory
        const subContents = await fetchDirectoryContents(
          owner, repo, item.path, accessToken
        );
        children.push({
          name: item.name,
          type: "directory",
          path: item.path,
          children: subContents,
        });
      } else {
        children.push({
          name: item.name,
          type: "directory",
          path: item.path,
          children: [],
        });
      }
    }
  }

  return {
    name: repo,
    type: "directory",
    path: "/",
    children,
  };
}

async function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  accessToken: string
): Promise<DirectoryStructure[]> {
  const res = await githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    accessToken
  );

  if (!res.ok) return [];

  const contents = await res.json();
  return contents.map((item: { name: string; type: string; path: string; size?: number }) => ({
    name: item.name,
    type: item.type === "file" ? "file" : "directory",
    path: item.path,
    language: item.type === "file" ? getLanguageFromExtension(item.name) : undefined,
    size: item.size,
    children: item.type === "dir" ? [] : undefined,
  }));
}

function shouldSkipDirectory(name: string): boolean {
  const skipDirs = ["node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__", "venv"];
  return skipDirs.includes(name);
}

function getLanguageFromExtension(filename: string): string | undefined {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript/React",
    js: "JavaScript",
    jsx: "JavaScript/React",
    py: "Python",
    rb: "Ruby",
    go: "Go",
    rs: "Rust",
    java: "Java",
    kt: "Kotlin",
    swift: "Swift",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    sql: "SQL",
  };
  return ext ? languageMap[ext] : undefined;
}

function countFiles(structure: DirectoryStructure): number {
  if (structure.type === "file") return 1;
  return (structure.children || []).reduce(
    (sum, child) => sum + countFiles(child),
    0
  );
}

// ============ Tech Stack Analysis ============

function analyzeTechStack(
  languages: Record<string, number>,
  structure: DirectoryStructure
): TechStack {
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
  const languageList = Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      percentage: Math.round((bytes / totalBytes) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const frameworks: string[] = [];
  const tools: string[] = [];
  const buildTools: string[] = [];
  let packageManager: string | undefined;

  // Analyze structure for framework detection
  const files = flattenStructure(structure);
  const fileNames = files.map(f => f.name.toLowerCase());

  // Detect frameworks
  if (fileNames.includes("next.config.js") || fileNames.includes("next.config.ts")) {
    frameworks.push("Next.js");
  }
  if (fileNames.includes("vite.config.js") || fileNames.includes("vite.config.ts")) {
    frameworks.push("Vite");
  }
  if (fileNames.includes("angular.json")) {
    frameworks.push("Angular");
  }
  if (fileNames.includes("vue.config.js")) {
    frameworks.push("Vue");
  }
  if (files.some(f => f.path.includes("components") && f.language?.includes("React"))) {
    frameworks.push("React");
  }

  // Detect tools
  if (fileNames.includes("tailwind.config.js") || fileNames.includes("tailwind.config.ts")) {
    tools.push("Tailwind CSS");
  }
  if (fileNames.includes("prisma")) {
    tools.push("Prisma");
  }
  if (fileNames.includes("docker-compose.yml") || fileNames.includes("dockerfile")) {
    tools.push("Docker");
  }
  if (fileNames.includes(".eslintrc.js") || fileNames.includes("eslint.config.mjs")) {
    tools.push("ESLint");
  }
  if (fileNames.includes("prettier.config.js") || fileNames.includes(".prettierrc")) {
    tools.push("Prettier");
  }

  // Detect package manager
  if (fileNames.includes("pnpm-lock.yaml")) {
    packageManager = "pnpm";
  } else if (fileNames.includes("yarn.lock")) {
    packageManager = "yarn";
  } else if (fileNames.includes("package-lock.json")) {
    packageManager = "npm";
  }

  // Detect build tools
  if (fileNames.includes("tsconfig.json")) {
    buildTools.push("TypeScript");
  }
  if (fileNames.includes("webpack.config.js")) {
    buildTools.push("Webpack");
  }
  if (fileNames.includes("rollup.config.js")) {
    buildTools.push("Rollup");
  }

  return {
    languages: languageList,
    frameworks,
    tools,
    packageManager,
    buildTools,
  };
}

function flattenStructure(structure: DirectoryStructure): DirectoryStructure[] {
  const result: DirectoryStructure[] = [structure];
  if (structure.children) {
    for (const child of structure.children) {
      result.push(...flattenStructure(child));
    }
  }
  return result;
}

// ============ Pattern Detection ============

function detectPatterns(
  structure: DirectoryStructure,
  techStack: TechStack
): CodePattern[] {
  const patterns: CodePattern[] = [];
  const files = flattenStructure(structure);

  // Detect component-based architecture
  if (files.some(f => f.path.includes("components/"))) {
    patterns.push({
      name: "Component-Based Architecture",
      type: "architecture",
      description: "Uses modular, reusable components for UI organization",
      files: files.filter(f => f.path.includes("components/")).map(f => f.path),
      confidence: 90,
    });
  }

  // Detect API routes pattern
  if (files.some(f => f.path.includes("api/") || f.path.includes("routes/"))) {
    patterns.push({
      name: "API Routes",
      type: "architecture",
      description: "Organized API endpoints in dedicated directory structure",
      files: files.filter(f => f.path.includes("api/") || f.path.includes("routes/")).map(f => f.path),
      confidence: 85,
    });
  }

  // Detect hooks pattern
  if (files.some(f => f.path.includes("hooks/") || f.name.startsWith("use"))) {
    patterns.push({
      name: "Custom Hooks",
      type: "design",
      description: "Uses custom React hooks for reusable logic",
      files: files.filter(f => f.path.includes("hooks/") || f.name.startsWith("use")).map(f => f.path),
      confidence: 85,
    });
  }

  // Detect lib/utils pattern
  if (files.some(f => f.path.includes("lib/") || f.path.includes("utils/"))) {
    patterns.push({
      name: "Utility Functions",
      type: "convention",
      description: "Centralized utility and helper functions",
      files: files.filter(f => f.path.includes("lib/") || f.path.includes("utils/")).map(f => f.path),
      confidence: 80,
    });
  }

  // Detect TypeScript usage
  if (techStack.languages.some(l => l.name === "TypeScript")) {
    patterns.push({
      name: "TypeScript",
      type: "style",
      description: "Uses TypeScript for type safety",
      files: files.filter(f => f.language?.includes("TypeScript")).map(f => f.path),
      confidence: 95,
    });
  }

  return patterns;
}

// ============ Recommendations ============

function generateRecommendations(
  structure: DirectoryStructure,
  techStack: TechStack,
  patterns: CodePattern[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const files = flattenStructure(structure);

  // Check for tests
  const hasTests = files.some(f => 
    f.path.includes("test") || 
    f.path.includes("spec") || 
    f.name.includes(".test.") ||
    f.name.includes(".spec.")
  );

  if (!hasTests) {
    recommendations.push({
      type: "suggestion",
      title: "Add Unit Tests",
      description: "Consider adding unit tests to improve code reliability and catch bugs early.",
      priority: "high",
      category: "testing",
    });
  }

  // Check for README
  const hasReadme = files.some(f => f.name.toLowerCase() === "readme.md");
  if (!hasReadme) {
    recommendations.push({
      type: "suggestion",
      title: "Add README",
      description: "Add a README.md file to document your project and help contributors.",
      priority: "medium",
      category: "documentation",
    });
  }

  // Check for environment file handling
  const hasEnvExample = files.some(f => f.name === ".env.example" || f.name === ".env.template");
  const hasEnv = files.some(f => f.name === ".env" || f.name === ".env.local");
  if (hasEnv && !hasEnvExample) {
    recommendations.push({
      type: "warning",
      title: "Add Environment Template",
      description: "Add a .env.example file to help others set up the project.",
      priority: "medium",
      category: "security",
    });
  }

  // Check for TypeScript strict mode
  if (techStack.buildTools.includes("TypeScript")) {
    recommendations.push({
      type: "suggestion",
      title: "Enable Strict TypeScript",
      description: "Consider enabling strict mode in tsconfig.json for better type safety.",
      priority: "low",
      category: "code-quality",
    });
  }

  return recommendations;
}

// ============ Basic Analysis Fallback ============

function getBasicAnalysis(owner: string, repo: string): RepoAnalysis {
  return {
    name: repo,
    owner,
    structure: {
      name: repo,
      type: "directory",
      path: "/",
      children: [],
    },
    techStack: {
      languages: [],
      frameworks: [],
      tools: [],
      buildTools: [],
    },
    patterns: [],
    metrics: {
      totalFiles: 0,
      contributors: 0,
      commits: 0,
      branches: 0,
      openIssues: 0,
      openPRs: 0,
      lastUpdated: new Date().toISOString(),
    },
    recommendations: [
      {
        type: "suggestion",
        title: "Connect GitHub",
        description: "Connect your GitHub account to get detailed repository analysis.",
        priority: "high",
        category: "documentation",
      },
    ],
  };
}

// ============ Implementation Suggestions ============

export function generateImplementationSuggestion(
  feature: string,
  analysis?: RepoAnalysis
): ImplementationSuggestion {
  const featureName = feature.trim();
  const hasReact = analysis?.techStack.frameworks.includes("React") || 
                   analysis?.techStack.frameworks.includes("Next.js");
  const hasTypeScript = analysis?.techStack.buildTools.includes("TypeScript");

  // Generate context-aware suggestions
  const steps: ImplementationStep[] = [];
  const codeExamples: CodeExample[] = [];

  if (hasReact) {
    steps.push({
      order: 1,
      title: "Create Component",
      description: `Create a new React component for ${featureName}`,
      files: ["src/components/"],
    });

    codeExamples.push({
      file: `src/components/${toPascalCase(featureName)}.tsx`,
      language: hasTypeScript ? "typescript" : "javascript",
      code: `${hasTypeScript ? '"use client";\n\n' : ''}export function ${toPascalCase(featureName)}() {
  return (
    <div>
      <h2>${featureName}</h2>
      {/* Implementation here */}
    </div>
  );
}`,
      description: "Basic component structure",
    });
  }

  steps.push(
    {
      order: 2,
      title: "Define Types/Interfaces",
      description: "Create TypeScript types for the feature data",
      files: ["src/types/", "src/lib/"],
    },
    {
      order: 3,
      title: "Implement Core Logic",
      description: "Build the main functionality",
      files: ["src/lib/"],
    },
    {
      order: 4,
      title: "Add API Endpoints",
      description: "Create necessary API routes",
      files: ["src/app/api/"],
    },
    {
      order: 5,
      title: "Connect UI to Logic",
      description: "Wire up components to data and handlers",
    },
    {
      order: 6,
      title: "Add Tests",
      description: "Write unit and integration tests",
      files: ["src/test/", "__tests__/"],
    }
  );

  return {
    feature: featureName,
    approach: `Based on your project structure, here's the recommended approach for implementing "${featureName}".`,
    steps,
    estimatedTime: "2-4 hours",
    complexity: "medium",
    relatedFiles: analysis?.patterns
      .flatMap(p => p.files)
      .slice(0, 5) || [],
    codeExamples,
  };
}

function toPascalCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// ============ PR Draft Generation ============

export function generatePRDraft(
  title: string,
  description: string,
  changes: Array<{ file: string; action: "create" | "modify" | "delete"; content?: string }>
): PRDraft {
  const branchName = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    title,
    description,
    branch: `feature/${branchName}`,
    baseBranch: "main",
    commits: [
      {
        message: `feat: ${title.toLowerCase()}`,
        changes,
      },
    ],
    labels: ["enhancement"],
  };
}
