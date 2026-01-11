// Phase 3: Proactive Intelligence Types

import type { ContextItem, UserContext } from "../context/types";

// Trigger Types
export type TriggerType =
  // Time-based triggers
  | "morning_briefing"
  | "evening_wrapup"
  | "weekly_review"
  | "habit_reminder"
  | "focus_checkin"

  // State-based triggers
  | "deadline_approaching"
  | "deadline_at_risk"
  | "item_overdue"
  | "capacity_warning"
  | "streak_at_risk"
  | "goal_drift"
  | "long_inactive"

  // Event-based triggers
  | "item_completed"
  | "item_blocked"
  | "meeting_starting_soon"
  | "calendar_conflict"
  | "new_high_priority"
  | "dependency_unblocked"

  // Pattern-based triggers
  | "productivity_drop"
  | "estimation_drift"
  | "optimal_time_available"

  // Wellbeing triggers
  | "wellbeing_check"
  | "focus_protection"
  | "break_reminder";

export type TriggerPriority = "low" | "medium" | "high" | "urgent";

export type ActionType = "notify" | "suggest" | "ask" | "auto_execute";

export type NotificationChannel = "in_app" | "push" | "email";

export type NotificationType = "toast" | "banner" | "modal" | "sidebar";

// System Event (for event-based triggers)
export interface SystemEvent {
  type: string;
  userId: string;
  itemId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// Trigger Details (result of condition evaluation)
export interface TriggerDetails {
  items?: ContextItem[];
  item?: ContextItem;
  mostUrgent?: ContextItem;
  mostCritical?: ContextItem;
  totalAtRisk?: number;
  cascadeImpact?: number;
  utilizationPercent?: number;
  excessHours?: number;
  deferralCandidates?: ContextItem[];
  habits?: Array<{ habit: HabitInfo; streakDays: number }>;
  longestStreak?: number;
  pendingHabits?: HabitInfo[];
  totalPending?: number;
  alignmentPercent?: number;
  neglectedGoals?: GoalInfo[];
  topNeglected?: GoalInfo;
  suggestedItem?: ContextItem;
  reason?: string;
  freeMinutes?: number;
  productiveHours?: string[];
  completedItem?: ContextItem;
  unblockedItems?: ContextItem[];
  totalUnblocked?: number;
  session?: FocusSessionInfo;
  duration?: number;
  [key: string]: unknown;
}

export interface HabitInfo {
  id: string;
  name: string;
  completedToday?: boolean;
}

export interface GoalInfo {
  id: string;
  name: string;
  progress?: number;
}

export interface FocusSessionInfo {
  id: string;
  itemId?: string;
  itemTitle?: string;
  startedAt: Date;
}

// Suggestion Action (button in notification)
export interface SuggestionAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

// Proactive Message (what gets sent to user)
export interface ProactiveMessage {
  title: string;
  message: string;
  suggestions: SuggestionAction[];
  priority: TriggerPriority;
}

// Trigger Condition
export interface TriggerCondition {
  evaluate: (context: UserContext, event?: SystemEvent) => Promise<boolean>;
  getDetails: (context: UserContext, event?: SystemEvent) => Promise<TriggerDetails>;
}

// Auto Action
export interface AutoAction {
  type: string;
  params?: Record<string, unknown>;
}

// Action Result
export interface ActionResult {
  success: boolean;
  message: string;
  undoAction?: {
    type: string;
    params: Record<string, unknown>;
  };
}

// Proactive Action (what happens when trigger fires)
export interface ProactiveAction {
  type: ActionType;
  content: (details: TriggerDetails) => ProactiveMessage;
  autoActions?: AutoAction[];
}

// Full Trigger Definition
export interface Trigger {
  type: TriggerType;
  priority: TriggerPriority;
  condition: TriggerCondition;
  action: ProactiveAction;
  cooldown: number; // Minutes before can trigger again
  userCanDisable: boolean;
}

// Notification Preferences
export interface NotificationPreferences {
  channels: NotificationChannel[];
  quietHours: { start: number; end: number }; // Hour of day
  urgentOverridesQuiet: boolean;
  maxPerDay: number;
  groupSimilar: boolean;
}

// Stored Notification
export interface ProactiveNotification {
  id: string;
  userId: string;
  triggerType: TriggerType;
  message: ProactiveMessage;
  channels: NotificationChannel[];
  sentAt: Date;
  readAt: Date | null;
  actionTaken: string | null;
  dismissed: boolean;
}

// In-App Notification Display
export interface InAppNotification {
  id: string;
  type: NotificationType;
  message: ProactiveMessage;
  persistent: boolean;
  dismissable: boolean;
  autoHideSeconds: number | null;
}

// Automation Rule (user-configurable)
export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  trigger: {
    event: TriggerType;
    conditions: RuleCondition[];
  };
  actions: RuleAction[];
  createdAt: Date;
  lastTriggeredAt: Date | null;
  triggerCount: number;
}

export interface RuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string | number | boolean;
}

export interface RuleAction {
  type: string;
  params?: Record<string, unknown>;
}

// Check-in Types
export type CheckinType =
  | "morning_briefing"
  | "midday_pulse"
  | "evening_wrapup"
  | "weekly_review"
  | "monthly_reflection";

export interface CheckinConfig {
  type: CheckinType;
  preferredTime: string; // "09:00", "13:00", etc.
  preferredDay?: string; // For weekly: "monday", etc.
  enabled: boolean;
  channels: NotificationChannel[];
}

export interface CheckinSection {
  title: string;
  content: string;
}

export interface CheckinContent {
  greeting: string;
  sections: CheckinSection[];
  suggestedActions: SuggestionAction[];
  closingMessage: string;
}

// Wellbeing Types
export interface WellbeingIndicators {
  workloadTrend: "increasing" | "stable" | "decreasing";
  averageWorkHours: number;
  weekendWork: boolean;
  lateNightSessions: number;
  breaksTaken: number;
  focusSessionAverageLength: number;
  streakPressure: number;
}

export interface WellbeingWarning {
  type: "overwork" | "no_breaks" | "weekend_work" | "late_nights" | "streak_pressure";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface WellbeingSuggestion {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface WellbeingAssessment {
  indicators: WellbeingIndicators;
  warnings: WellbeingWarning[];
  overallStatus: "healthy" | "caution" | "concern";
  suggestions: WellbeingSuggestion[];
}

// Trigger State (for cooldown tracking)
export interface TriggerState {
  triggerType: TriggerType;
  userId: string;
  lastTriggered: Date;
  triggerCount: number;
}

// User Trigger Preferences
export interface UserTriggerPreferences {
  userId: string;
  disabledTriggers: TriggerType[];
  customCooldowns: Record<TriggerType, number>;
  preferences: NotificationPreferences;
}
