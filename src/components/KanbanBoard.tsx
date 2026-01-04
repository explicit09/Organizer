"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemStatus, ItemPriority } from "../lib/items";

type KanbanBoardProps = {
  items: Item[];
};

const columns: Array<{ key: ItemStatus; label: string; tone: string }> = [
  { key: "not_started", label: "Not Started", tone: "bg-stone-100" },
  { key: "in_progress", label: "In Progress", tone: "bg-amber-100" },
  { key: "blocked", label: "Blocked", tone: "bg-rose-100" },
  { key: "completed", label: "Completed", tone: "bg-emerald-100" },
];

const priorityColors: Record<ItemPriority, string> = {
  urgent: "bg-red-500 text-white",
  high: "bg-amber-500 text-white",
  medium: "bg-stone-200 text-stone-700",
  low: "bg-stone-100 text-stone-500",
};

export function KanbanBoard({ items }: KanbanBoardProps) {
  const router = useRouter();
  const [boardItems, setBoardItems] = useState<Item[]>(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setBoardItems(items);
  }, [items]);

  const grouped = useMemo(() => {
    return columns.reduce<Record<ItemStatus, Item[]>>((acc, column) => {
      acc[column.key] = boardItems.filter((item) => item.status === column.key);
      return acc;
    }, {} as Record<ItemStatus, Item[]>);
  }, [boardItems]);

  async function patchItem(id: string, patch: Partial<Item>) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error ?? "Update failed");
    }

    return body.item as Item;
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/items/${id}`, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 204) {
      const body = await res.json();
      throw new Error(body.error ?? "Delete failed");
    }
  }

  async function handleStatusChange(id: string, status: ItemStatus) {
    try {
      setError(null);
      const updated = await patchItem(id, { status });
      setBoardItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      setError(null);
      setDeletingId(id);
      await deleteItem(id);
      setBoardItems((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSave(id: string) {
    if (!draftTitle.trim()) {
      setError("Title cannot be empty");
      return;
    }
    try {
      setError(null);
      const updated = await patchItem(id, { title: draftTitle.trim() });
      setBoardItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  function handleEdit(item: Item) {
    setEditingId(item.id);
    setDraftTitle(item.title);
  }

  function handleCancel() {
    setEditingId(null);
    setDraftTitle("");
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((column) => (
          <div
            key={column.key}
            data-testid={`column-${column.key}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (!id) {
                return;
              }
              handleStatusChange(id, column.key);
            }}
            className="rounded-3xl border border-stone-200/70 bg-white/80 p-4 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-stone-900">
                  {column.label}
                </div>
                <div className="text-xs uppercase tracking-[0.25em] text-stone-400">
                  {grouped[column.key].length} cards
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${column.tone}`} />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {grouped[column.key].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-xs text-stone-400">
                  Drop items here
                </div>
              ) : (
                grouped[column.key].map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    className={`rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm ${
                      deletingId === item.id ? "opacity-50" : ""
                    }`}
                  >
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          value={draftTitle}
                          onChange={(event) => setDraftTitle(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(item.id)}
                            className="rounded-xl bg-stone-900 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="rounded-xl border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="text-base font-semibold text-stone-900">
                          {item.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${priorityColors[item.priority]}`}
                          >
                            {item.priority}
                          </span>
                          {item.dueAt ? (
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                              due {item.dueAt.slice(0, 10)}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span className="uppercase tracking-[0.2em]">
                            {item.type}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-full border border-stone-200 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-stone-500 hover:text-stone-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="rounded-full border border-rose-200 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
