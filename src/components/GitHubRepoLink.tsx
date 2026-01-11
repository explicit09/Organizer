"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  Github,
  Link2,
  Unlink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "./ui/Button";

type TrackedRepo = {
  id: string;
  repoOwner: string;
  repoName: string;
  branch?: string;
  status: "active" | "completed" | "needs_update";
  lastCheckedAt?: string;
  lastActivityAt?: string;
};

type RepoOption = {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
};

type GitHubRepoLinkProps = {
  itemId: string;
  onUpdate?: () => void;
};

export function GitHubRepoLink({ itemId, onUpdate }: GitHubRepoLinkProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trackedRepos, setTrackedRepos] = useState<TrackedRepo[]>([]);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<RepoOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Check GitHub connection status
  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch("/api/github");
        const data = await res.json();
        setIsConnected(data.connected);
        setUsername(data.username || null);
      } catch {
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkConnection();
  }, []);

  // Fetch tracked repos for this item
  useEffect(() => {
    async function fetchTrackedRepos() {
      if (!isConnected) return;
      try {
        const res = await fetch(`/api/github/tracked?itemId=${itemId}`);
        const data = await res.json();
        setTrackedRepos(data.repos || []);
      } catch {
        console.error("Failed to fetch tracked repos");
      }
    }
    fetchTrackedRepos();
  }, [itemId, isConnected]);

  async function connectGitHub() {
    if (!tokenInput.trim()) return;
    setConnectError(null);
    setIsLinking(true);
    
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: tokenInput.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setConnectError(data.error || "Failed to connect");
        return;
      }
      
      setIsConnected(true);
      setUsername(data.username);
      setShowTokenInput(false);
      setTokenInput("");
    } catch {
      setConnectError("Failed to connect to GitHub");
    } finally {
      setIsLinking(false);
    }
  }

  async function fetchRepos() {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();
      setAvailableRepos(data.repos || []);
      setShowRepoSelector(true);
    } catch {
      console.error("Failed to fetch repos");
    } finally {
      setLoadingRepos(false);
    }
  }

  async function linkRepo(repo: RepoOption) {
    setIsLinking(true);
    try {
      const res = await fetch("/api/github/tracked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          repoOwner: repo.owner,
          repoName: repo.name,
          trackingCriteria: { requireCommits: true },
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setTrackedRepos([...trackedRepos, data.repo]);
        setShowRepoSelector(false);
        onUpdate?.();
      }
    } catch {
      console.error("Failed to link repo");
    } finally {
      setIsLinking(false);
    }
  }

  async function unlinkRepo(repoId: string) {
    try {
      await fetch(`/api/github/tracked?id=${repoId}`, { method: "DELETE" });
      setTrackedRepos(trackedRepos.filter(r => r.id !== repoId));
      onUpdate?.();
    } catch {
      console.error("Failed to unlink repo");
    }
  }

  async function checkRepo(repoId: string) {
    setIsChecking(true);
    try {
      const res = await fetch("/api/github/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });
      
      const data = await res.json();
      if (res.ok) {
        // Update the tracked repo status locally
        setTrackedRepos(trackedRepos.map(r => 
          r.id === repoId 
            ? { 
                ...r, 
                status: data.meetsCriteria ? "completed" : data.hasActivity ? "active" : "needs_update",
                lastCheckedAt: new Date().toISOString(),
              }
            : r
        ));
      }
    } catch {
      console.error("Failed to check repo");
    } finally {
      setIsChecking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Loading...
      </div>
    );
  }

  // Not connected - show connect prompt
  if (!isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Github size={14} />
          <span>Link a GitHub repo to track progress</span>
        </div>
        
        {showTokenInput ? (
          <div className="space-y-2">
            <input
              type="password"
              placeholder="GitHub Personal Access Token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-muted border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground">
              Create a token at GitHub → Settings → Developer settings → Personal access tokens
            </p>
            {connectError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle size={12} />
                {connectError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={connectGitHub}
                disabled={!tokenInput.trim() || isLinking}
              >
                {isLinking ? <Loader2 size={14} className="animate-spin mr-1" /> : <Github size={14} className="mr-1" />}
                Connect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTokenInput(false);
                  setTokenInput("");
                  setConnectError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTokenInput(true)}
            className="w-full"
          >
            <Github size={14} className="mr-2" />
            Connect GitHub
          </Button>
        )}
      </div>
    );
  }

  // Connected - show linked repos and link option
  return (
    <div className="space-y-3">
      {/* Connected status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Github size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Connected as</span>
          <span className="font-medium text-foreground">@{username}</span>
        </div>
      </div>

      {/* Tracked repos */}
      {trackedRepos.length > 0 && (
        <div className="space-y-2">
          {trackedRepos.map((repo) => (
            <div
              key={repo.id}
              className={clsx(
                "flex items-center justify-between p-3 rounded-lg border",
                repo.status === "completed" && "border-emerald-500/20 bg-emerald-500/5",
                repo.status === "needs_update" && "border-amber-500/20 bg-amber-500/5",
                repo.status === "active" && "border-border bg-accent/30"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {repo.status === "completed" && <Check size={14} className="text-emerald-500 shrink-0" />}
                {repo.status === "needs_update" && <AlertCircle size={14} className="text-amber-500 shrink-0" />}
                {repo.status === "active" && <GitBranch size={14} className="text-muted-foreground shrink-0" />}
                <span className="text-sm font-medium truncate">
                  {repo.repoOwner}/{repo.repoName}
                </span>
                {repo.branch && (
                  <span className="text-xs text-muted-foreground">({repo.branch})</span>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`https://github.com/${repo.repoOwner}/${repo.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => checkRepo(repo.id)}
                  disabled={isChecking}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  title="Check for activity"
                >
                  <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => unlinkRepo(repo.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Unlink repo"
                >
                  <Unlink size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add repo button / selector */}
      {showRepoSelector ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Select a repository</span>
            <button
              onClick={() => setShowRepoSelector(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
            {loadingRepos ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : availableRepos.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No repositories found
              </div>
            ) : (
              availableRepos.map((repo) => (
                <button
                  key={repo.fullName}
                  onClick={() => linkRepo(repo)}
                  disabled={isLinking || trackedRepos.some(t => t.repoOwner === repo.owner && t.repoName === repo.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Github size={14} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{repo.fullName}</span>
                  {repo.private && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      Private
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRepos}
          disabled={loadingRepos}
          className="w-full"
        >
          {loadingRepos ? (
            <Loader2 size={14} className="animate-spin mr-2" />
          ) : (
            <Link2 size={14} className="mr-2" />
          )}
          Link Repository
        </Button>
      )}

      {/* Status info */}
      {trackedRepos.some(r => r.status === "needs_update") && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200">
            <p className="font-medium">No recent activity detected</p>
            <p className="text-amber-200/70 mt-0.5">
              Consider updating the task status or adding notes about progress.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
