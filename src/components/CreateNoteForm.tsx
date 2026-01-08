"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FileText, AlertCircle } from "lucide-react";

export function CreateNoteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create note");
      }

      setTitle("");
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">New Note</h3>
            <p className="text-xs text-muted-foreground">Capture your thoughts</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Note title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-white/[0.08] bg-[#09090b] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/60 outline-none hover:border-white/[0.12] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Capture thoughts, plans, summaries..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={!title || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Note"}
        </Button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
