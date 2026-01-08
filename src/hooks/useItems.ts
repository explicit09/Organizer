"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";
import type { Item, ItemType, ItemStatus } from "../lib/items";

type ItemFilters = {
  type?: ItemType;
  status?: ItemStatus;
};

type CreateItemInput = {
  type: ItemType;
  title: string;
  details?: string;
  status?: ItemStatus;
  priority?: string;
  tags?: string[];
  dueAt?: string;
  startAt?: string;
  endAt?: string;
  estimatedMinutes?: number;
  area?: string;
};

type UpdateItemInput = Partial<CreateItemInput>;

// Fetch items
async function fetchItems(filters?: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);

  const res = await fetch(`/api/items?${params}`);
  if (!res.ok) throw new Error("Failed to fetch items");
  const data = await res.json();
  return data.items ?? [];
}

// Fetch single item
async function fetchItem(id: string): Promise<Item> {
  const res = await fetch(`/api/items/${id}`);
  if (!res.ok) throw new Error("Failed to fetch item");
  const data = await res.json();
  return data.item;
}

// Create item
async function createItem(input: CreateItemInput): Promise<Item> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create item");
  const data = await res.json();
  return data.item;
}

// Update item
async function updateItem({
  id,
  ...input
}: UpdateItemInput & { id: string }): Promise<Item> {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to update item");
  const data = await res.json();
  return data.item;
}

// Delete item
async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete item");
}

// ========== Hooks ==========

export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: queryKeys.items.list(filters),
    queryFn: () => fetchItems(filters),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(id),
    queryFn: () => fetchItem(id),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createItem,
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(queryKeys.items.list());

      // Optimistically add the new item
      if (previousItems) {
        const optimisticItem: Item = {
          id: `temp-${Date.now()}`,
          userId: "",
          type: newItem.type,
          title: newItem.title,
          details: newItem.details,
          status: newItem.status ?? "not_started",
          priority: (newItem.priority as Item["priority"]) ?? "medium",
          tags: newItem.tags ?? [],
          dueAt: newItem.dueAt,
          startAt: newItem.startAt,
          endAt: newItem.endAt,
          estimatedMinutes: newItem.estimatedMinutes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(
          queryKeys.items.list(),
          [optimisticItem, ...(previousItems as Item[])]
        );
      }

      return { previousItems };
    },
    onError: (_err, _newItem, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.items.list(), context.previousItems);
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItem,
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all });

      const previousItems = queryClient.getQueryData(queryKeys.items.list());

      // Optimistically update
      if (previousItems) {
        queryClient.setQueryData(
          queryKeys.items.list(),
          (previousItems as Item[]).map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
          )
        );
      }

      return { previousItems };
    },
    onError: (_err, _updates, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.items.list(), context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItem,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all });

      const previousItems = queryClient.getQueryData(queryKeys.items.list());

      // Optimistically remove
      if (previousItems) {
        queryClient.setQueryData(
          queryKeys.items.list(),
          (previousItems as Item[]).filter((item) => item.id !== id)
        );
      }

      return { previousItems };
    },
    onError: (_err, _id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.items.list(), context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}
