// Phase 4: Adaptive Learning Types

// Event Types
export type LearningEventType =
  | "item_created"
  | "item_completed"
  | "item_started"
  | "item_rescheduled"
  | "item_deleted"
  | "priority_changed"
  | "focus_session_started"
  | "focus_session_ended"
  | "break_taken"
  | "suggestion_accepted"
  | "suggestion_dismissed"
  | "notification_clicked"
  | "notification_ignored"
  | "schedule_suggested"
  | "user_message"
  | "message_feedback"
  | "habit_completed"
  | "habit_missed"
  | "goal_updated"
  | "checkin_completed";

export interface LearningEvent {
  id: string;
  userId: string;
  type: LearningEventType;
  data: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
}

export interface UserEvent {
  userId: string;
  type: LearningEventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Model Types
export type ModelType =
  | "productivity"
  | "estimation"
  | "preferences"
  | "work_style"
  | "completion_patterns";

// Productivity Patterns
export interface HourlyProductivity {
  hour: number; // 0-23
  dayOfWeek: string;
  averageCompletions: number;
  averageFocusMinutes: number;
  confidenceScore: number;
}

export interface HourScore {
  completionRate: number;
  averageQuality: number;
  focusability: number;
  sampleSize: number;
  trend: "improving" | "stable" | "declining";
}

export interface DayScore {
  completionRate: number;
  averageCompletions: number;
  sampleSize: number;
}

export interface TimeWindow {
  start: number; // Hour
  end: number; // Hour
  score: number;
  label: string;
}

export interface ProductivityModel {
  hourlyScores: Record<number, HourScore>;
  dayOfWeekScores: Record<string, DayScore>;
  combinedScores: Record<string, number>; // "monday-9" -> score
  optimalFocusDuration: number;
  optimalBreakFrequency: number;
  peakProductivityWindows: TimeWindow[];
}

// Estimation Model
export interface TaskTypeEstimation {
  accuracy: number;
  averageError: number;
  sampleSize: number;
  bias: "overestimate" | "underestimate" | "accurate";
  suggestedMultiplier: number;
}

export interface SizeEstimation {
  size: "small" | "medium" | "large";
  accuracy: number;
  averageActual: number;
  sampleSize: number;
  bias: "overestimate" | "underestimate" | "accurate";
}

export interface ComplexityEstimation {
  byComplexity: Record<string, number>;
  multipliers: Record<string, number>;
}

export interface EstimationCalibrationModel {
  globalAccuracy: number;
  byTaskType: Record<string, TaskTypeEstimation>;
  bySize: Record<string, SizeEstimation>;
  byComplexity: ComplexityEstimation;
  improvementSuggestions: string[];
}

// Completion Patterns
export interface CompletionPattern {
  taskType: string;
  averageTimeToComplete: number; // minutes
  completionRate: number; // % of created tasks completed
  commonBlockers: string[];
  bestTimeToWork: string[];
}

// Preference Model
export interface CommunicationPreference {
  preferredLength: "brief" | "moderate" | "detailed";
  tonePreference: "casual" | "professional" | "encouraging";
  emojiUsage: "never" | "sometimes" | "often";
  technicalLevel: "simple" | "moderate" | "technical";
  confidence: number;
}

export interface SuggestionPreferenceModel {
  acceptanceRateByType: Record<string, number>;
  preferredTimingByType: Record<string, string>;
  dismissalReasons: Record<string, number>;
  mostValuableSuggestions: string[];
  leastValuableSuggestions: string[];
}

export interface NotificationPreferenceModel {
  valueByType: Record<string, number>;
  peakEngagementHour: number | null;
  groupingPreference: "none" | "moderate" | "aggressive";
  quietHours: { start: number; end: number } | null;
  channelPreference: Record<string, number>;
}

export interface WorkStylePreference {
  chronotype: "morning_person" | "evening_person" | "flexible";
  batchVsSwitch: "batch" | "switch" | "mixed";
  planningStyle: "detailed" | "spontaneous" | "balanced";
  focusStyle: "deep" | "varied" | "pomodoro";
}

export interface ImplicitPreference {
  category: string;
  key: string;
  value: string;
  confidence: number;
  source: "observed" | "inferred" | "explicit";
  evidence?: string[];
}

export interface PreferenceModel {
  communicationStyle: CommunicationPreference;
  notificationPreferences: NotificationPreferenceModel;
  suggestionPreferences: SuggestionPreferenceModel;
  workStyle: WorkStylePreference;
  implicitPreferences: ImplicitPreference[];
}

// Combined User Model
export interface UserModel {
  userId: string;
  productivityPattern: ProductivityModel;
  estimationModel: EstimationCalibrationModel;
  completionPatterns: CompletionPattern[];
  preferences: PreferenceModel;
  lastUpdated: Date;
  samplesUsed: number;
  daysCovered: number;
  overallConfidence: number;
}

// Prediction Types
export interface TimePrediction {
  estimatedMinutes: number;
  confidence: number;
  range: {
    low: number;
    high: number;
  };
  factors: string[];
}

export interface ProductivityPrediction {
  score: number; // 0-1
  isOptimal: boolean;
  recommendation: string;
}

export interface SuccessPrediction {
  probability: number;
  factors: string[];
  suggestions: string[];
}

// Adapted Types
export interface AdaptedEstimate {
  userEstimate: number | null;
  adjustedEstimate: number;
  range: { low: number; high: number };
  confidence: number;
  explanation: string;
  shouldSuggestAdjustment: boolean;
}

export interface AdaptedNotification {
  skip: boolean;
  reason?: string;
  channel?: string;
  deliverAt?: Date;
  groupWith?: string[];
  adaptedMessage?: string;
}

export interface AdaptiveSuggestion {
  id: string;
  type: string;
  message: string;
  priority: string;
  confidence: number;
  predictedAcceptance: number;
  personalizationApplied: boolean;
  delayUntil?: Date;
}

// Feedback Types
export type FeedbackType =
  | "suggestion_rating"
  | "prediction_accuracy"
  | "preference_correction"
  | "feature_request"
  | "general_feedback";

export interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  context: Record<string, unknown>;
  rating?: number; // 1-5
  comment?: string;
  correction?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
  timestamp: Date;
}

// Implicit Signal
export interface ImplicitSignal {
  type: string;
  strength: "weak" | "medium" | "strong";
  interpretation: string;
  action: string;
}

// Pattern Observer Interface
export interface PatternObserver {
  name: string;
  interestedIn(eventType: LearningEventType): boolean;
  observe(event: UserEvent): Promise<void>;
}

// Learning Settings
export interface LearningSettings {
  trackProductivity: boolean;
  trackEstimates: boolean;
  trackPreferences: boolean;
  trackBehavior: boolean;
  adaptSuggestions: boolean;
  adaptNotifications: boolean;
  adaptEstimates: boolean;
  showLearningInsights: boolean;
  retentionDays: number;
}

// Learning Insights for UI
export interface LearningInsights {
  productivitySummary: {
    peakHours: string[];
    optimalFocusDuration: number;
    bestDays: string[];
  };
  estimationSummary: {
    bias: string;
    adjustmentPercent: number;
    accuracy: number;
  };
  preferenceSummary: {
    responseStyle: string;
    notificationTolerance: string;
    workStyle: string;
  };
  dataPoints: number;
  daysCovered: number;
  overallConfidence: number;
}
