"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  ArrowRight,
  User,
} from "lucide-react";

type ActivityEntry = {
  id: string;
  userId?: string;
  itemId?: string;
  action: string;
  data?: Record<string, unknown>;
  createdAt: string;
};

interface ActivityFeedProps {
  itemId?: string;
  limit?: number;
  className?: string;
}

const actionConfig: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  item_created: { icon: Plus, color: "text-emerald-400", label: "created" },
  item_updated: { icon: Pencil, color: "text-blue-400", label: "updated" },
  item_deleted: { icon: Trash2, color: "text-rose-400", label: "deleted" },
  status_changed: { icon: ArrowRight, color: "text-amber-400", label: "changed status" },
  comment_added: { icon: MessageSquare, color: "text-purple-400", label: "commented" },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActionDescription(action: string, data?: Record<string, unknown>): string {
  if (action === "item_updated" && data) {
    const fields = Object.keys(data);
    if (fields.includes("status") && typeof data.status === "string") {
      return `changed status to ${data.status}`;
    }
    if (fields.includes("title") && typeof data.title === "string") {
      return `renamed to "${data.title}"`;
    }
    if (fields.includes("priority") && typeof data.priority === "string") {
      return `set priority to ${data.priority}`;
    }
    return `updated ${fields.join(", ")}`;
  }
  return actionConfig[action]?.label || action;
}

export function ActivityFeed({ itemId, limit = 20, className }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const params = new URLSearchParams();
        if (itemId) params.set("itemId", itemId);
        if (limit) params.set("limit", String(limit));

        const res = await fetch(`/api/activity?${params}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [itemId, limit]);

  if (loading) {
    return (
      <div className={clsx("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={clsx("flex flex-col items-center justify-center py-8 text-center", className)}>
        <Clock size={24} className="text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-1", className)}>
      {activities.map((activity, index) => {
        const config = actionConfig[activity.action] || {
          icon: Circle,
          color: "text-muted-foreground",
          label: activity.action,
        };
        const Icon = config.icon;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className={clsx("flex h-8 w-8 items-center justify-center rounded-full bg-muted/50", config.color)}>
                <Icon size={14} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground capitalize">
                  {typeof activity.data?.type === "string" ? activity.data.type : "Item"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getActionDescription(activity.action, activity.data)}
                </span>
              </div>
              {(() => {
                const title = activity.data?.title;
                return typeof title === "string" ? (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    &quot;{title}&quot;
                  </p>
                ) : null;
              })()}
              <p className="text-xs text-muted-foreground/70 mt-1">
                {formatTimeAgo(activity.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
