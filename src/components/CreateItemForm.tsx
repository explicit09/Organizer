"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemType } from "../lib/items";

type PreviewItem = {
  type: ItemType;
  title: string;
  priority?: string;
  subtasks?: string[];
};

type CreateItemFormProps = {
  compact?: boolean;
  onCreated?: (items: Item[]) => void;
};

function formatType(type: ItemType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
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
    <form
      onSubmit={handlePreview}
      className={`flex flex-col gap-4 ${compact ? "text-sm" : ""}`}
    >
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-[0.3em] text-stone-500">
          Quick Add
        </label>
        <input
          className="rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Example: Prep for finance exam next week"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!text || isPreviewing}
          className="rounded-2xl border border-stone-200/80 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPreviewing ? "Previewing..." : "Preview"}
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!hasPreview || isCreating}
          className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Confirm & Create"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {hasPreview ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
          <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
            Preview
          </div>
          <div className="mt-3 grid gap-2">
            {preview?.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-stone-700 shadow-sm"
              >
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  {item.subtasks && item.subtasks.length > 0 ? (
                    <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">
                      {item.subtasks.length} subtasks
                    </span>
                  ) : null}
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                  {formatType(item.type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {created && created.length > 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
            Created items
          </div>
          <div className="mt-3 grid gap-2 text-sm text-stone-700">
            {created.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-stone-200/70 px-3 py-2"
              >
                <span>{item.title}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                  {formatType(item.type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {duplicates && duplicates.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <div className="text-xs uppercase tracking-[0.3em] text-amber-600">
            Duplicates detected
          </div>
          <div className="mt-2 grid gap-1">
            {duplicates.map((item) => (
              <div key={item.id}>{item.title}</div>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
