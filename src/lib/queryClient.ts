import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  items: {
    all: ["items"] as const,
    list: (filters?: Record<string, unknown>) => ["items", "list", filters] as const,
    detail: (id: string) => ["items", "detail", id] as const,
  },
  habits: {
    all: ["habits"] as const,
    list: () => ["habits", "list"] as const,
    detail: (id: string) => ["habits", "detail", id] as const,
  },
  dailyPlan: {
    all: ["dailyPlan"] as const,
    byDate: (date: string) => ["dailyPlan", date] as const,
  },
  focus: {
    all: ["focus"] as const,
    active: () => ["focus", "active"] as const,
    stats: () => ["focus", "stats"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => ["notifications", "list"] as const,
  },
};
