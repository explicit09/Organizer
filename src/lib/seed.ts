import { getDb } from "./db";
import { logActivity } from "./activity";
import { createItem } from "./items";
import { getDefaultUserId } from "./auth";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function seedSampleData(userId = getDefaultUserId()) {
  const task1 = createItem({
    type: "task",
    title: "Finalize LEARN-X deck",
    status: "in_progress",
    priority: "high",
    tags: ["LEARN-X", "work"],
    dueAt: daysFromNow(3),
  }, { userId });

  const task2 = createItem({
    type: "task",
    title: "Send internship applications",
    status: "not_started",
    priority: "urgent",
    tags: ["career"],
    dueAt: daysFromNow(2),
  }, { userId });

  const meeting1 = createItem({
    type: "meeting",
    title: "Call Professor Smith",
    status: "not_started",
    priority: "high",
    tags: ["school"],
    startAt: daysFromNow(1),
    endAt: daysFromNow(1),
  }, { userId });

  const meeting2 = createItem({
    type: "meeting",
    title: "LEARN-X roadmap sync",
    status: "completed",
    priority: "medium",
    tags: ["LEARN-X"],
  }, { userId });

  const school1 = createItem({
    type: "school",
    title: "Math homework set 5",
    status: "in_progress",
    priority: "high",
    tags: ["math"],
    dueAt: daysFromNow(2),
  }, { userId });

  const school2 = createItem({
    type: "school",
    title: "Finance exam study plan",
    status: "not_started",
    priority: "medium",
    tags: ["finance"],
    dueAt: daysFromNow(7),
  }, { userId });

  const school3 = createItem({
    type: "school",
    title: "Essay draft (econ)",
    status: "completed",
    priority: "medium",
    tags: ["writing"],
  }, { userId });

  const ids = [
    task1.id,
    task2.id,
    meeting1.id,
    meeting2.id,
    school1.id,
    school2.id,
    school3.id,
  ];

  const today = new Date();
  const counts = [1, 2, 0, 3, 1, 2, 1];

  counts.forEach((count, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (counts.length - 1 - index));
    day.setHours(14, 0, 0, 0);

    for (let i = 0; i < count; i += 1) {
      logActivity({
        userId,
        itemId: ids[(index + i) % ids.length],
        action: "item_updated",
        data: { status: "completed" },
        createdAt: day.toISOString(),
      });
    }
  });
}

export function ensureSampleData(userId = getDefaultUserId()) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (process.env.SEED_SAMPLE_DATA === "false") {
    return;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM items WHERE user_id = ?")
    .get(userId) as {
    count: number;
  };

  if (row.count > 0) {
    return;
  }

  seedSampleData(userId);
}
