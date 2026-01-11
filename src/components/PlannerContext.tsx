"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  Briefcase,
  GitBranch,
  ListTodo,
  Target,
  Clock,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { PlanMode } from "./PlannerModes";

type Project = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

type TrackedRepo = {
  id: string;
  repoOwner: string;
  repoName: string;
  status: string;
  lastCheckedAt?: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt?: string;
};

type Plan = {
  id: string;
  title: string;
  status: string;
  mode: string;
  stepsCompleted: number;
  totalSteps: number;
};

type Props = {
  mode: PlanMode;
};

export function PlannerContext({ mode }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [repos, setRepos] = useState<TrackedRepo[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [activePlans, setActivePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    projects: true,
    repos: mode === "code",
    tasks: mode === "planning",
    plans: true,
  });

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    setLoading(true);
    try {
      // Load all context in parallel
      const [projectsRes, reposRes, tasksRes, plansRes] = await Promise.all([
        fetch("/api/items?type=task&limit=5"),
        fetch("/api/github/tracked"),
        fetch("/api/items?status=not_started&limit=5"),
        fetch("/api/planner/plans?status=active&limit=5"),
      ]);

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.items?.slice(0, 5) || []);
      }

      if (reposRes.ok) {
        const data = await reposRes.json();
        setRepos(data.repos?.slice(0, 5) || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setUpcomingTasks(data.items?.slice(0, 5) || []);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setActivePlans(data.plans?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error("Failed to load context:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-rose-400";
      case "high": return "text-orange-400";
      case "medium": return "text-primary";
      case "low": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "completed": return "bg-blue-500";
      case "needs_update": return "bg-amber-500";
      default: return "bg-muted";
    }
  };

  return (
    <div className="w-80 border-l border-border/50 flex flex-col bg-gradient-to-b from-card/30 to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="text-sm font-semibold">Context</h3>
        <button
          onClick={loadContext}
          disabled={loading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Refresh"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Active Plans */}
        <ContextSection
          title="Active Plans"
          icon={Target}
          expanded={expanded.plans}
          onToggle={() => toggleSection("plans")}
          count={activePlans.length}
        >
          {activePlans.length === 0 ? (
            <EmptyState message="No active plans" />
          ) : (
            <div className="space-y-2">
              {activePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="group flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                    <Target size={12} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {plan.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all"
                          style={{ width: `${plan.totalSteps > 0 ? (plan.stepsCompleted / plan.totalSteps) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {plan.stepsCompleted}/{plan.totalSteps}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContextSection>

        {/* Projects */}
        <ContextSection
          title="Projects"
          icon={Briefcase}
          expanded={expanded.projects}
          onToggle={() => toggleSection("projects")}
          count={projects.length}
        >
          {projects.length === 0 ? (
            <EmptyState message="No projects found" />
          ) : (
            <div className="space-y-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full", getPriorityColor(project.priority).replace("text-", "bg-"))} />
                  <span className="text-sm truncate flex-1 group-hover:text-primary transition-colors">
                    {project.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ContextSection>

        {/* GitHub Repos */}
        <ContextSection
          title="Tracked Repos"
          icon={GitBranch}
          expanded={expanded.repos}
          onToggle={() => toggleSection("repos")}
          count={repos.length}
        >
          {repos.length === 0 ? (
            <EmptyState message="No tracked repos" />
          ) : (
            <div className="space-y-2">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="group flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <GitBranch size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {repo.repoOwner}/{repo.repoName}
                      </span>
                      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", getStatusColor(repo.status))} />
                    </div>
                    {repo.lastCheckedAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Checked {new Date(repo.lastCheckedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          )}
        </ContextSection>

        {/* Upcoming Tasks */}
        <ContextSection
          title="Upcoming Tasks"
          icon={ListTodo}
          expanded={expanded.tasks}
          onToggle={() => toggleSection("tasks")}
          count={upcomingTasks.length}
        >
          {upcomingTasks.length === 0 ? (
            <EmptyState message="No upcoming tasks" />
          ) : (
            <div className="space-y-1">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", getPriorityColor(task.priority).replace("text-", "bg-"))} />
                  <span className="text-sm truncate flex-1 group-hover:text-primary transition-colors">
                    {task.title}
                  </span>
                  {task.dueAt && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(task.dueAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ContextSection>
      </div>

      {/* Mode-specific Tips */}
      <div className="p-4 border-t border-border/50">
        <div className={clsx(
          "p-3 rounded-lg",
          "bg-gradient-to-br from-primary/5 to-[hsl(280_60%_55%/0.05)]",
          "border border-primary/10"
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium">Tip for {mode} mode</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {mode === "research" && "Mention specific skills, locations, or companies for more targeted results."}
                {mode === "code" && "Reference a tracked repo or describe the feature you want to implement."}
                {mode === "planning" && "Break down large goals into smaller, actionable steps for better planning."}
                {mode === "general" && "Ask about your tasks, productivity, or get help organizing your day."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Context Section Component
function ContextSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  count,
  children,
}: {
  title: string;
  icon: typeof Target;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent/30 transition-colors"
      >
        <Icon size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold flex-1 text-left">{title}</span>
        {count > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
            {count}
          </span>
        )}
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

// Empty State
function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-xs text-muted-foreground text-center py-3">
      {message}
    </p>
  );
}
