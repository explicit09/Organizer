// Proactive Triggers Index

export { deadlineTriggers } from "./deadlines";
export { capacityTriggers } from "./capacity";
export { habitTriggers } from "./habits";
export { goalTriggers } from "./goals";

import { deadlineTriggers } from "./deadlines";
import { capacityTriggers } from "./capacity";
import { habitTriggers } from "./habits";
import { goalTriggers } from "./goals";
import type { Trigger } from "../types";

// All triggers combined
export const allTriggers: Trigger[] = [
  ...deadlineTriggers,
  ...capacityTriggers,
  ...habitTriggers,
  ...goalTriggers,
];

// Trigger categories for UI display
export const triggerCategories = {
  deadlines: {
    label: "Deadlines & Time",
    description: "Notifications about approaching deadlines and time-sensitive items",
    triggers: deadlineTriggers,
  },
  capacity: {
    label: "Workload & Capacity",
    description: "Alerts about overcommitment and productivity patterns",
    triggers: capacityTriggers,
  },
  habits: {
    label: "Habits & Progress",
    description: "Reminders about habits, streaks, and task completion",
    triggers: habitTriggers,
  },
  goals: {
    label: "Goals & Alignment",
    description: "Insights about goal progress and work alignment",
    triggers: goalTriggers,
  },
};
