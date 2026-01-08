"use client";

import { clsx } from "clsx";
import {
  Inbox,
  CheckSquare,
  Calendar,
  BookOpen,
  FolderOpen,
  Search,
  Bell,
  FileText,
  Users,
  Zap,
  BarChart3,
  Clock,
  Star,
} from "lucide-react";

type EmptyStateType =
  | "tasks"
  | "inbox"
  | "calendar"
  | "projects"
  | "notes"
  | "search"
  | "notifications"
  | "meetings"
  | "school"
  | "automations"
  | "analytics"
  | "favorites"
  | "activity";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStateConfig: Record<
  EmptyStateType,
  { icon: typeof Inbox; defaultTitle: string; defaultDescription: string; color: string }
> = {
  tasks: {
    icon: CheckSquare,
    defaultTitle: "No tasks yet",
    defaultDescription: "Create your first task to get started",
    color: "text-blue-500",
  },
  inbox: {
    icon: Inbox,
    defaultTitle: "Inbox is empty",
    defaultDescription: "All caught up! No new items to process",
    color: "text-emerald-500",
  },
  calendar: {
    icon: Calendar,
    defaultTitle: "No events scheduled",
    defaultDescription: "Your calendar is clear",
    color: "text-purple-500",
  },
  projects: {
    icon: FolderOpen,
    defaultTitle: "No projects",
    defaultDescription: "Create a project to organize your work",
    color: "text-amber-500",
  },
  notes: {
    icon: FileText,
    defaultTitle: "No notes yet",
    defaultDescription: "Start writing to capture your thoughts",
    color: "text-cyan-500",
  },
  search: {
    icon: Search,
    defaultTitle: "No results found",
    defaultDescription: "Try adjusting your search or filters",
    color: "text-muted-foreground",
  },
  notifications: {
    icon: Bell,
    defaultTitle: "No notifications",
    defaultDescription: "You're all caught up",
    color: "text-rose-500",
  },
  meetings: {
    icon: Users,
    defaultTitle: "No meetings",
    defaultDescription: "No meetings scheduled",
    color: "text-indigo-500",
  },
  school: {
    icon: BookOpen,
    defaultTitle: "No assignments",
    defaultDescription: "Add your courses and assignments",
    color: "text-teal-500",
  },
  automations: {
    icon: Zap,
    defaultTitle: "No automations",
    defaultDescription: "Create rules to automate your workflow",
    color: "text-amber-500",
  },
  analytics: {
    icon: BarChart3,
    defaultTitle: "No data yet",
    defaultDescription: "Start completing tasks to see your analytics",
    color: "text-blue-500",
  },
  favorites: {
    icon: Star,
    defaultTitle: "No favorites",
    defaultDescription: "Star items for quick access",
    color: "text-amber-500",
  },
  activity: {
    icon: Clock,
    defaultTitle: "No activity",
    defaultDescription: "Activity will appear here as you work",
    color: "text-muted-foreground",
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Decorative background circles */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-muted/50 to-transparent" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-muted to-transparent" />
        </div>
        <div
          className={clsx(
            "relative flex h-16 w-16 items-center justify-center rounded-full bg-muted/50",
            config.color
          )}
        >
          <Icon size={28} strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-1">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[250px] mb-4">
        {description || config.defaultDescription}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Compact variant for smaller spaces
interface CompactEmptyStateProps {
  icon?: typeof Inbox;
  message: string;
  className?: string;
}

export function CompactEmptyState({
  icon: Icon = Inbox,
  message,
  className,
}: CompactEmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-6 text-center",
        className
      )}
    >
      <Icon size={20} className="text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
