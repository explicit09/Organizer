import type { Item } from "../lib/items";

type ItemTableProps = {
  title: string;
  items: Item[];
  emptyLabel: string;
};

function formatType(type: Item["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatStatus(status: Item["status"]) {
  return status.replace("_", " ");
}

export function ItemTable({ title, items, emptyLabel }: ItemTableProps) {
  return (
    <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400">
          {items.length} items
        </span>
      </div>
      <div className="mt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl border border-stone-200/60 bg-white/90 p-4 text-sm text-stone-700 md:grid-cols-[2fr_1fr_1fr_1fr]"
              >
                <div>
                  <div className="text-base font-semibold text-stone-900">
                    {item.title}
                  </div>
                  {item.details ? (
                    <div className="mt-1 text-xs text-stone-500">
                      {item.details}
                    </div>
                  ) : null}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {formatType(item.type)}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {formatStatus(item.status)}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {item.priority}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
