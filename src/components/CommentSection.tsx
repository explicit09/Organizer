"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/Avatar";
import { MessageSquare, Send, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
import { clsx } from "clsx";

type Comment = {
  id: string;
  itemId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

interface CommentSectionProps {
  itemId: string;
  className?: string;
}

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

export function CommentSection({ itemId, className }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch(`/api/items/${itemId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [itemId]);

  async function handleSubmit() {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editContent.trim()) return;

    try {
      const res = await fetch(`/api/items/${itemId}/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)));
        setEditingId(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/items/${itemId}/comments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  }

  if (loading) {
    return (
      <div className={clsx("space-y-4", className)}>
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">Comments</span>
        <span className="text-xs text-muted-foreground">({comments.length})</span>
      </div>

      {/* Comment List */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  <User size={14} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">User</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                  {comment.updatedAt !== comment.createdAt && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(comment.id)}
                        className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                        className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </div>

              {editingId !== comment.id && (
                <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Comment */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            <User size={14} />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              Press ⌘ + Enter to submit
            </span>
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send size={12} />
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
