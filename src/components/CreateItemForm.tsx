"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemType } from "../lib/items";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Loader2, Plus, AlertCircle, FileText, CheckSquare, Calendar, GraduationCap, Zap, Clock } from "lucide-react";
import { clsx } from "clsx";

type PreviewItem = {
  type: ItemType;
  title: string;
  priority?: string;
  subtasks?: string[];
  dueAt?: string;
  estimatedMinutes?: number;
};

type CreateItemFormProps = {
  compact?: boolean;
  onCreated?: (items: Item[]) => void;
};

function formatType(type: ItemType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

const TypeIcon = ({ type }: { type: ItemType }) => {
  switch (type) {
    case 'task': return <CheckSquare size={16} />;
    case 'meeting': return <Calendar size={16} />;
    case 'school': return <GraduationCap size={16} />;
    default: return <FileText size={16} />;
  }
};

const getTypeColor = (type: ItemType) => {
  switch (type) {
    case 'task': return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    case 'meeting': return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case 'school': return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    default: return "text-muted-foreground bg-white/[0.04] border-white/[0.08]";
  }
}

export function CreateItemForm({ compact, onCreated }: CreateItemFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [created, setCreated] = useState<Item[] | null>(null);
  const [duplicates, setDuplicates] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const hasPreview = preview && preview.length > 0;

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text) return;

    setError(null);
    setCreated(null);
    setDuplicates(null);
    setIsPreviewing(true);

    try {
      const res = await fetch("/api/organize/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Preview failed");
      }

      setPreview(body.items as PreviewItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!hasPreview) {
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Create failed");
      }

      setCreated(body.items as Item[]);
      setDuplicates((body.duplicates as Item[]) ?? null);
      onCreated?.(body.items as Item[]);
      router.refresh();

      // Keep feedback visible for a moment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setIsCreating(false);
    }
  }

  function handleChange(value: string) {
    setText(value);
    setPreview(null);
    setCreated(null);
    setDuplicates(null);
    setError(null);
  }

  return (
    <form onSubmit={handlePreview} className={clsx("flex flex-col gap-5", compact ? "text-sm" : "")}>
      <div className="flex flex-col gap-3">
        <Label className="flex items-center gap-2">
          <Zap size={14} className="text-primary" />
          Quick Add
        </Label>
        <div className="flex gap-3">
          <Input
            className="flex-1 shadow-inner bg-black/20"
            placeholder="e.g. 'Meeting with team at 2pm tomorrow'"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            disabled={isPreviewing || isCreating}
            autoFocus
          />
          <Button
            type="submit"
            disabled={!text || isPreviewing || !!hasPreview}
            variant="default"
            size="icon"
            className="h-11 w-12 shrink-0 rounded-xl"
          >
            {isPreviewing ? <Loader2 className="animate-spin" size={18} /> : <Plus size={20} />}
          </Button>
        </div>
      </div>

      {hasPreview && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground uppercase tracking-widest text-[10px]">Preview ({preview?.length})</Label>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              variant="default"
              size="sm"
              className="h-8 text-xs font-semibold px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-400/20"
            >
              {isCreating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Confirm & Create
            </Button>
          </div>

          <div className="grid gap-3">
            {preview?.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="group flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm transition-all hover:bg-white/[0.05] hover:border-white/10 hover:scale-[1.01]"
              >
                <div className={clsx("p-2 rounded-lg shrink-0", getTypeColor(item.type))}>
                  <TypeIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white group-hover:text-primary transition-colors">{item.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.dueAt && (
                      <span className="text-[10px] flex items-center gap-1 text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        <Clock size={10} />
                        {new Date(item.dueAt).toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                    {item.subtasks && item.subtasks.length > 0 && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {item.subtasks.length} subtasks
                      </span>
                    )}
                    {item.estimatedMinutes && (
                      <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        ~{item.estimatedMinutes}min
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground self-center px-2 py-1 bg-white/5 rounded">
                  {formatType(item.type)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400 animate-in fade-in">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {created && created.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckSquare size={12} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Added successfully</span>
          </div>
          <div className="space-y-1 pl-7">
            {created.map(item => (
              <div key={item.id} className="text-xs text-muted-foreground hover:text-white transition-colors cursor-default">• {item.title}</div>
            ))}
          </div>
        </div>
      )}

      {duplicates && duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-400 p-4">
          <div className="mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
            <AlertCircle size={14} />
            Duplicates detected
          </div>
          {duplicates.map((item) => (
            <div key={item.id} className="opacity-80 pl-6">• {item.title}</div>
          ))}
        </div>
      )}
    </form>
  );
}
