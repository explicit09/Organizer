"use client";

import { useEffect, useState } from "react";
import { CreateItemForm } from "./CreateItemForm";
import type { Item } from "../lib/items";

export function Topbar() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const body = await res.json();
        if (res.ok) {
          setResults(body.items ?? []);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Today
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            Plan the day, protect the focus.
          </h1>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="relative w-full max-w-md">
            <label className="flex w-full items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/80 px-4 py-3 text-sm shadow-[0_8px_20px_-18px_rgba(10,10,10,0.4)]">
            <span className="text-xs uppercase tracking-[0.35em] text-stone-400">
              Search
            </span>
            <input
              className="w-full bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400"
              placeholder="Find tasks, meetings, classes"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            </label>
            {query.trim().length >= 3 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-stone-200/70 bg-white/95 p-3 text-xs text-stone-600 shadow-[0_18px_40px_-30px_rgba(20,20,20,0.5)]">
                {isSearching ? (
                  <div className="px-2 py-2 text-stone-400">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="px-2 py-2 text-stone-400">No matches</div>
                ) : (
                  <div className="grid gap-2">
                    {results.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-stone-200/70 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-semibold text-stone-800">
                            {item.title}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.3em] text-stone-400">
                            {item.type} · {item.status.replace("_", " ")}
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-stone-400">
                          {item.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <button
            onClick={() => setShowQuickAdd((prev) => !prev)}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-24px_rgba(15,15,15,0.6)]"
          >
            {showQuickAdd ? "Close" : "Quick Add"}
          </button>
        </div>
      </div>

      {showQuickAdd ? (
        <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
          <CreateItemForm
            compact
            onCreated={() => setShowQuickAdd(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
