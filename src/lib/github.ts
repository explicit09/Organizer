import { z } from "zod";
import { getDb } from "./db";
import { randomUUID } from "node:crypto";

// ============ Types ============

export type GitHubConnection = {
  id: string;
  userId: string;
  accessToken: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type TrackedRepo = {
  id: string;
  userId: string;
  itemId: string; // The task/project item this repo is linked to
  repoOwner: string;
  repoName: string;
  branch?: string; // Optional: specific branch to track
  trackingCriteria: TrackingCriteria;
  lastCheckedAt?: string;
  lastActivityAt?: string;
  status: "active" | "completed" | "needs_update";
  createdAt: string;
  updatedAt: string;
};

export type TrackingCriteria = {
  // What to look for in the repo to consider the task "done"
  requireCommits?: boolean; // Any commits since last check
  requireKeywords?: string[]; // Commit messages must contain these
  requireFiles?: string[]; // Changes to specific files
  requirePRMerged?: boolean; // A PR must be merged
  minCommits?: number; // Minimum number of commits
};

export type RepoActivity = {
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    state: "open" | "closed" | "merged";
    url: string;
    mergedAt?: string;
  }>;
  hasActivity: boolean;
  meetsCriteria: boolean;
};

export type DailyCheckResult = {
  repoId: string;
  itemId: string;
  itemTitle: string;
  repoFullName: string;
  hasActivity: boolean;
  meetsCriteria: boolean;
  needsFollowUp: boolean;
  activity: RepoActivity;
  checkedAt: string;
};

// ============ Schemas ============

const trackingCriteriaSchema = z.object({
  requireCommits: z.boolean().optional(),
  requireKeywords: z.array(z.string()).optional(),
  requireFiles: z.array(z.string()).optional(),
  requirePRMerged: z.boolean().optional(),
  minCommits: z.number().int().positive().optional(),
});

const trackedRepoCreateSchema = z.object({
  itemId: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  branch: z.string().optional(),
  trackingCriteria: trackingCriteriaSchema.optional().default({ requireCommits: true }),
});

// ============ Database Operations ============

function getGitHubConnectionsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS github_connections (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      accessToken TEXT NOT NULL,
      username TEXT NOT NULL,
      avatarUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  return db;
}

function getTrackedReposTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_repos (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      repoOwner TEXT NOT NULL,
      repoName TEXT NOT NULL,
      branch TEXT,
      trackingCriteria TEXT NOT NULL,
      lastCheckedAt TEXT,
      lastActivityAt TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  return db;
}

// ============ GitHub Connection ============

export function saveGitHubConnection(
  userId: string,
  accessToken: string,
  username: string,
  avatarUrl?: string
): GitHubConnection {
  const db = getGitHubConnectionsTable();
  const now = new Date().toISOString();
  
  // Check if connection exists
  const existing = db.prepare(
    "SELECT * FROM github_connections WHERE userId = ?"
  ).get(userId) as GitHubConnection | undefined;
  
  if (existing) {
    db.prepare(`
      UPDATE github_connections 
      SET accessToken = ?, username = ?, avatarUrl = ?, updatedAt = ?
      WHERE userId = ?
    `).run(accessToken, username, avatarUrl || null, now, userId);
    
    return { ...existing, accessToken, username, avatarUrl, updatedAt: now };
  }
  
  const connection: GitHubConnection = {
    id: randomUUID(),
    userId,
    accessToken,
    username,
    avatarUrl,
    createdAt: now,
    updatedAt: now,
  };
  
  db.prepare(`
    INSERT INTO github_connections (id, userId, accessToken, username, avatarUrl, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(connection.id, userId, accessToken, username, avatarUrl || null, now, now);
  
  return connection;
}

export function getGitHubConnection(userId: string): GitHubConnection | null {
  const db = getGitHubConnectionsTable();
  const row = db.prepare(
    "SELECT * FROM github_connections WHERE userId = ?"
  ).get(userId) as GitHubConnection | undefined;
  return row || null;
}

export function removeGitHubConnection(userId: string): boolean {
  const db = getGitHubConnectionsTable();
  const result = db.prepare("DELETE FROM github_connections WHERE userId = ?").run(userId);
  return result.changes > 0;
}

// ============ Tracked Repos ============

export function createTrackedRepo(
  userId: string,
  data: z.infer<typeof trackedRepoCreateSchema>
): TrackedRepo {
  const parsed = trackedRepoCreateSchema.parse(data);
  const db = getTrackedReposTable();
  const now = new Date().toISOString();
  
  const repo: TrackedRepo = {
    id: randomUUID(),
    userId,
    itemId: parsed.itemId,
    repoOwner: parsed.repoOwner,
    repoName: parsed.repoName,
    branch: parsed.branch,
    trackingCriteria: parsed.trackingCriteria,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  
  db.prepare(`
    INSERT INTO tracked_repos (id, userId, itemId, repoOwner, repoName, branch, trackingCriteria, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    repo.id,
    userId,
    repo.itemId,
    repo.repoOwner,
    repo.repoName,
    repo.branch || null,
    JSON.stringify(repo.trackingCriteria),
    repo.status,
    now,
    now
  );
  
  return repo;
}

export function getTrackedRepo(id: string, userId: string): TrackedRepo | null {
  const db = getTrackedReposTable();
  const row = db.prepare(
    "SELECT * FROM tracked_repos WHERE id = ? AND userId = ?"
  ).get(id, userId) as (Omit<TrackedRepo, 'trackingCriteria'> & { trackingCriteria: string }) | undefined;
  
  if (!row) return null;
  return { ...row, trackingCriteria: JSON.parse(row.trackingCriteria) };
}

export function getTrackedReposForItem(itemId: string, userId: string): TrackedRepo[] {
  const db = getTrackedReposTable();
  const rows = db.prepare(
    "SELECT * FROM tracked_repos WHERE itemId = ? AND userId = ?"
  ).all(itemId, userId) as Array<Omit<TrackedRepo, 'trackingCriteria'> & { trackingCriteria: string }>;
  
  return rows.map(row => ({ ...row, trackingCriteria: JSON.parse(row.trackingCriteria) }));
}

export function getActiveTrackedRepos(userId: string): TrackedRepo[] {
  const db = getTrackedReposTable();
  const rows = db.prepare(
    "SELECT * FROM tracked_repos WHERE userId = ? AND status = 'active'"
  ).all(userId) as Array<Omit<TrackedRepo, 'trackingCriteria'> & { trackingCriteria: string }>;
  
  return rows.map(row => ({ ...row, trackingCriteria: JSON.parse(row.trackingCriteria) }));
}

export function getAllActiveTrackedRepos(): TrackedRepo[] {
  const db = getTrackedReposTable();
  const rows = db.prepare(
    "SELECT * FROM tracked_repos WHERE status = 'active'"
  ).all() as Array<Omit<TrackedRepo, 'trackingCriteria'> & { trackingCriteria: string }>;
  
  return rows.map(row => ({ ...row, trackingCriteria: JSON.parse(row.trackingCriteria) }));
}

export function updateTrackedRepo(
  id: string,
  userId: string,
  updates: Partial<Pick<TrackedRepo, 'status' | 'lastCheckedAt' | 'lastActivityAt' | 'trackingCriteria'>>
): TrackedRepo | null {
  const db = getTrackedReposTable();
  const existing = getTrackedRepo(id, userId);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  const updated: TrackedRepo = {
    ...existing,
    ...updates,
    updatedAt: now,
  };
  
  db.prepare(`
    UPDATE tracked_repos 
    SET status = ?, lastCheckedAt = ?, lastActivityAt = ?, trackingCriteria = ?, updatedAt = ?
    WHERE id = ? AND userId = ?
  `).run(
    updated.status,
    updated.lastCheckedAt || null,
    updated.lastActivityAt || null,
    JSON.stringify(updated.trackingCriteria),
    now,
    id,
    userId
  );
  
  return updated;
}

export function deleteTrackedRepo(id: string, userId: string): boolean {
  const db = getTrackedReposTable();
  const result = db.prepare("DELETE FROM tracked_repos WHERE id = ? AND userId = ?").run(id, userId);
  return result.changes > 0;
}

// ============ GitHub API Calls ============

async function githubFetch(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  return response;
}

export async function fetchUserRepos(accessToken: string): Promise<Array<{ owner: string; name: string; fullName: string; private: boolean }>> {
  const response = await githubFetch("/user/repos?per_page=100&sort=pushed", accessToken);
  if (!response.ok) {
    throw new Error("Failed to fetch repos");
  }
  
  const repos = await response.json();
  return repos.map((repo: { owner: { login: string }; name: string; full_name: string; private: boolean }) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
  }));
}

export async function fetchRepoActivity(
  accessToken: string,
  owner: string,
  repo: string,
  since?: string,
  branch?: string
): Promise<RepoActivity> {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default: last 24 hours
  
  // Fetch commits
  const commitsUrl = `/repos/${owner}/${repo}/commits?since=${sinceDate}${branch ? `&sha=${branch}` : ""}`;
  const commitsResponse = await githubFetch(commitsUrl, accessToken);
  const commitsData = commitsResponse.ok ? await commitsResponse.json() : [];
  
  const commits = Array.isArray(commitsData) ? commitsData.map((c: {
    sha: string;
    commit: { message: string; author: { name: string; date: string } };
    html_url: string;
  }) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
  })) : [];
  
  // Fetch PRs
  const prsUrl = `/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=10`;
  const prsResponse = await githubFetch(prsUrl, accessToken);
  const prsData = prsResponse.ok ? await prsResponse.json() : [];
  
  const pullRequests: Array<{
    number: number;
    title: string;
    state: "open" | "closed" | "merged";
    url: string;
    mergedAt?: string;
  }> = Array.isArray(prsData) ? prsData.map((pr: {
    number: number;
    title: string;
    state: string;
    html_url: string;
    merged_at?: string;
  }) => ({
    number: pr.number,
    title: pr.title,
    state: (pr.merged_at ? "merged" : pr.state) as "open" | "closed" | "merged",
    url: pr.html_url,
    mergedAt: pr.merged_at,
  })) : [];
  
  return {
    commits,
    pullRequests,
    hasActivity: commits.length > 0 || pullRequests.some(pr => pr.state === "merged"),
    meetsCriteria: false, // Will be evaluated separately
  };
}

export function evaluateCriteria(
  activity: RepoActivity,
  criteria: TrackingCriteria
): boolean {
  // If no specific criteria, just check for any commits
  if (!criteria.requireCommits && !criteria.requireKeywords && !criteria.requireFiles && !criteria.requirePRMerged && !criteria.minCommits) {
    return activity.commits.length > 0;
  }
  
  let passed = true;
  
  if (criteria.requireCommits && activity.commits.length === 0) {
    passed = false;
  }
  
  if (criteria.minCommits && activity.commits.length < criteria.minCommits) {
    passed = false;
  }
  
  if (criteria.requireKeywords && criteria.requireKeywords.length > 0) {
    const hasKeyword = activity.commits.some(commit =>
      criteria.requireKeywords!.some(keyword =>
        commit.message.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    if (!hasKeyword) passed = false;
  }
  
  if (criteria.requirePRMerged) {
    const hasMergedPR = activity.pullRequests.some(pr => pr.state === "merged");
    if (!hasMergedPR) passed = false;
  }
  
  return passed;
}

// ============ Daily Check ============

export async function runDailyCheck(userId: string): Promise<DailyCheckResult[]> {
  const connection = getGitHubConnection(userId);
  if (!connection) {
    throw new Error("No GitHub connection found");
  }
  
  const trackedRepos = getActiveTrackedRepos(userId);
  const results: DailyCheckResult[] = [];
  
  // Import getItem to get item details
  const { getItem } = await import("./items");
  
  for (const repo of trackedRepos) {
    try {
      const activity = await fetchRepoActivity(
        connection.accessToken,
        repo.repoOwner,
        repo.repoName,
        repo.lastCheckedAt,
        repo.branch
      );
      
      const meetsCriteria = evaluateCriteria(activity, repo.trackingCriteria);
      activity.meetsCriteria = meetsCriteria;
      
      const item = getItem(repo.itemId, { userId });
      const now = new Date().toISOString();
      
      // Update the tracked repo with check results
      updateTrackedRepo(repo.id, userId, {
        lastCheckedAt: now,
        lastActivityAt: activity.hasActivity ? now : repo.lastActivityAt,
        status: meetsCriteria ? "completed" : activity.hasActivity ? "active" : "needs_update",
      });
      
      results.push({
        repoId: repo.id,
        itemId: repo.itemId,
        itemTitle: item?.title || "Unknown Item",
        repoFullName: `${repo.repoOwner}/${repo.repoName}`,
        hasActivity: activity.hasActivity,
        meetsCriteria,
        needsFollowUp: !activity.hasActivity && repo.status === "active",
        activity,
        checkedAt: now,
      });
    } catch (error) {
      console.error(`Error checking repo ${repo.repoOwner}/${repo.repoName}:`, error);
    }
  }
  
  return results;
}

// ============ Follow-up Notifications ============

export function createFollowUpNotifications(results: DailyCheckResult[]): void {
  for (const result of results) {
    if (result.needsFollowUp) {
      // Log the follow-up needed
      console.log(`[GitHub Check] No activity on "${result.itemTitle}" in ${result.repoFullName}`);
      
      // The status is already updated to "needs_update" during the check
      // The UI will show a warning and prompt the user to update
    }
  }
}
