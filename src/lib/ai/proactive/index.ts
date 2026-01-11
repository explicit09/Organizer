// Phase 3: Proactive Intelligence Module Index

// Types
export * from "./types";

// Engine
export { proactiveEngine, initializeProactiveEngine } from "./engine";

// Triggers
export {
  allTriggers,
  deadlineTriggers,
  capacityTriggers,
  habitTriggers,
  goalTriggers,
  triggerCategories,
} from "./triggers";

// Check-ins
export {
  checkinTriggers,
  generateMorningBriefing,
  generateEveningWrapup,
  generateWeeklyReview,
  getCheckinConfigs,
  updateCheckinConfig,
} from "./checkins";

// Wellbeing
export {
  wellbeingTriggers,
  assessWellbeing,
  isDoNotDisturbActive,
  getFocusStats,
  setWorkHourProtection,
  getWorkHourProtection,
} from "./wellbeing";

// Notifications
export { notificationManager } from "./notifications";

// Auto-actions
export {
  executeAction,
  registerAction,
  getUserRules,
  createRule,
  updateRule,
  deleteRule,
  evaluateRule,
  executeRule,
} from "./auto-actions";

// Initialize the proactive engine with all triggers
import { proactiveEngine } from "./engine";
import { allTriggers } from "./triggers";
import { checkinTriggers } from "./checkins";
import { wellbeingTriggers } from "./wellbeing";

export function setupProactiveEngine(): void {
  // Register all triggers
  proactiveEngine.registerTriggers(allTriggers);
  proactiveEngine.registerTriggers(checkinTriggers);
  proactiveEngine.registerTriggers(wellbeingTriggers);

  console.log("[Proactive] Engine initialized with all triggers");
}
