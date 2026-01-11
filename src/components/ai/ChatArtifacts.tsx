"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  X,
  Target,
  Code2,
  Globe,
  GitBranch,
  FileText,
  ChevronRight,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";

export type Artifact = {
  type: "plan" | "code" | "search_results" | "repo_analysis" | "pr_draft";
  title: string;
  content: unknown;
};

type PlanStep = {
  id: string;
  title: string;
  completed: boolean;
  details?: string;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type RepoAnalysis = {
  name: string;
  description: string;
  languages: string[];
  suggestions: string[];
};

interface ChatArtifactsProps {
  artifacts: Artifact[];
  onClose: () => void;
}

const artifactConfig = {
  plan: {
    icon: Target,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    label: "Plan",
  },
  code: {
    icon: Code2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    label: "Code",
  },
  search_results: {
    icon: Globe,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "Search",
  },
  repo_analysis: {
    icon: GitBranch,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "Analysis",
  },
  pr_draft: {
    icon: FileText,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    label: "PR Draft",
  },
};

export function ChatArtifacts({ artifacts, onClose }: ChatArtifactsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const selectedArtifact = artifacts[selectedIndex] || null;

  // Update selection when artifacts change
  useEffect(() => {
    if (selectedIndex >= artifacts.length) {
      setSelectedIndex(Math.max(0, artifacts.length - 1));
    }
  }, [artifacts.length, selectedIndex]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getConfig = (type: Artifact["type"]) => artifactConfig[type];

  const renderArtifactContent = (artifact: Artifact) => {
    const config = getConfig(artifact.type);

    switch (artifact.type) {
      case "plan":
        const steps = artifact.content as PlanStep[];
        const completedCount = steps.filter((s) => s.completed).length;
        return (
          <div className="space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className={config.color}>
                {completedCount}/{steps.length} completed
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-2 pt-2">
              {steps.map((step, i) => (
                <div
                  key={step.id || i}
                  className={clsx(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all",
                    step.completed
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/50 bg-card/50 hover:bg-card"
                  )}
                >
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={clsx(
                        "text-sm font-medium",
                        step.completed
                          ? "text-emerald-400 line-through opacity-70"
                          : "text-foreground"
                      )}
                    >
                      {step.title}
                    </p>
                    {step.details && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {step.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "code":
        const code = artifact.content as string;
        return (
          <div className="relative group">
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => handleCopy(code)}
                className="p-2 rounded-lg bg-card/90 hover:bg-card border border-border/50 transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} className="text-muted-foreground" />
                )}
              </button>
              <button
                className="p-2 rounded-lg bg-card/90 hover:bg-card border border-border/50 transition-colors"
                title="Download"
              >
                <Download size={14} className="text-muted-foreground" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#0a0a0c] border border-border/30 overflow-x-auto text-sm">
              <code className="text-foreground/90 font-mono leading-relaxed">
                {code}
              </code>
            </pre>
          </div>
        );

      case "search_results":
        const results = artifact.content as SearchResult[];
        return (
          <div className="space-y-2">
            {results.map((result, i) => (
              <a
                key={i}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl border border-border/50 bg-card/30 hover:bg-card hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {result.title}
                  </h4>
                  <ExternalLink
                    size={14}
                    className="text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {result.snippet}
                </p>
                <p className="text-[10px] text-primary/60 mt-2 truncate font-mono">
                  {result.url}
                </p>
              </a>
            ))}
          </div>
        );

      case "repo_analysis":
        const analysis = artifact.content as RepoAnalysis;
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitBranch size={14} className="text-amber-400" />
                {analysis.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-1.5">
                {analysis.description}
              </p>
            </div>

            {analysis.languages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Languages
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Suggestions
                </p>
                <ul className="space-y-2">
                  {analysis.suggestions.map((suggestion, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <span className="text-primary mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case "pr_draft":
        const pr = artifact.content as {
          title: string;
          body: string;
          branch: string;
        };
        return (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">
                Branch
              </p>
              <p className="text-sm font-mono text-cyan-400">{pr.branch}</p>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">
                Title
              </p>
              <p className="text-sm font-semibold text-foreground">{pr.title}</p>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">
                Description
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {pr.body}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <pre className="text-sm text-muted-foreground p-4 rounded-xl bg-card/50 overflow-auto">
            {JSON.stringify(artifact.content, null, 2)}
          </pre>
        );
    }
  };

  if (artifacts.length === 0) return null;

  return (
    <div
      className={clsx(
        "border-l border-border/50 flex flex-col bg-card/30 backdrop-blur-sm transition-all duration-300",
        expanded ? "w-[600px]" : "w-96"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Artifacts</h3>
          <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">
            {artifacts.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Artifact Tabs */}
      {artifacts.length > 1 && (
        <div className="px-2 py-2 border-b border-border/50 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1">
            {artifacts.map((artifact, i) => {
              const config = getConfig(artifact.type);
              const Icon = config.icon;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    selectedIndex === i
                      ? `${config.bgColor} ${config.color} border ${config.borderColor}`
                      : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
                  )}
                >
                  <Icon size={14} />
                  <span className="truncate max-w-[100px]">{artifact.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedArtifact && (
          <div className="animate-in fade-in duration-200">
            {/* Artifact Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
              <div
                className={clsx(
                  "h-9 w-9 rounded-lg flex items-center justify-center",
                  getConfig(selectedArtifact.type).bgColor
                )}
              >
                {(() => {
                  const Icon = getConfig(selectedArtifact.type).icon;
                  return (
                    <Icon
                      size={16}
                      className={getConfig(selectedArtifact.type).color}
                    />
                  );
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {selectedArtifact.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {getConfig(selectedArtifact.type).label}
                </p>
              </div>
            </div>

            {/* Content */}
            {renderArtifactContent(selectedArtifact)}
          </div>
        )}
      </div>
    </div>
  );
}
