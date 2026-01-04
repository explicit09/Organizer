import { listActivity } from "./activity";
import { getDefaultUserId } from "./auth";

export type WeeklyReport = {
  completedCount: number;
  createdCount: number;
  updatedCount: number;
};

export function getWeeklyReport(options?: { userId?: string; now?: Date }) {
  const userId = options?.userId ?? getDefaultUserId();
  const now = options?.now ?? new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const activity = listActivity({ userId });
  let completedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;

  activity.forEach((entry) => {
    const date = new Date(entry.createdAt);
    if (date < start || date > end) {
      return;
    }
    if (entry.action === "item_created") {
      createdCount += 1;
    }
    if (entry.action === "item_updated") {
      updatedCount += 1;
      if (entry.data?.status === "completed") {
        completedCount += 1;
      }
    }
  });

  return { completedCount, createdCount, updatedCount };
}
