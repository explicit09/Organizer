// Phase 2: Context Engine Types

export interface UserContext {
  // Temporal Context
  temporal: TemporalContext;

  // Workload Context
  workload: WorkloadContext;

  // Calendar Context
  calendar: CalendarContext;

  // Priority Context
  priorities: PriorityContext;

  // Goal Context
  goals: GoalContext;

  // Pattern Context
  patterns: PatternContext;

  // Recent Activity Context
  recentActivity: RecentActivityContext;

  // Habit Context
  habits: HabitContext;

  // User Preferences
  preferences: PreferenceItem[];

  // Memory Context
  memory: MemoryContext;
}

export interface TemporalContext {
  now: Date;
  dayOfWeek: string;
  timeOfDay: "early_morning" | "morning" | "midday" | "afternoon" | "evening" | "night";
  weekOfYear: number;
  isWeekend: boolean;
  daysUntilEndOfWeek: number;
  daysUntilEndOfMonth: number;
}

export interface WorkloadContext {
  totalOpenItems: number;
  itemsByStatus: Record<string, number>;
  itemsByPriority: Record<string, number>;
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  estimatedHoursRemaining: number;
  availableHoursThisWeek: number;
  capacityUtilization: number;
  completedToday: number;
  completedThisWeek: number;
  streakDays: number;
}

export interface CalendarContext {
  meetingsToday: CalendarEvent[];
  meetingsThisWeek: CalendarEvent[];
  freeBlocksToday: TimeBlock[];
  freeBlocksThisWeek: TimeBlock[];
  nextMeeting: CalendarEvent | null;
  minutesUntilNextMeeting: number | null;
  totalMeetingHoursThisWeek: number;
  longestFreeBlock: TimeBlock | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type?: string;
}

export interface TimeBlock {
  start: Date;
  end: Date;
  durationMinutes: number;
  quality?: number;
}

export interface PriorityContext {
  criticalItems: ContextItem[];
  blockingItems: ContextItem[];
  blockedItems: ContextItem[];
  quickWins: ContextItem[];
  atRiskDeadlines: ContextItem[];
}

export interface ContextItem {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueAt?: string;
  estimatedMinutes?: number;
  projectId?: string;
  goalId?: string;
  area?: string;
}

export interface GoalContext {
  activeGoals: GoalItem[];
  goalProgress: Record<string, number>;
  neglectedAreas: string[];
  alignedWorkThisWeek: number;
}

export interface GoalItem {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  area?: string;
  projectId?: string;
  deadline?: string;
}

export interface PatternContext {
  productiveHours: string[];
  averageTaskDuration: number;
  estimationAccuracy: number;
  completionRateByDay: Record<string, number>;
  commonBlockers: string[];
  focusSessionAverage: number;
}

export interface RecentActivityContext {
  lastActiveAt: Date | null;
  lastCompletedItem: ContextItem | null;
  lastCreatedItem: ContextItem | null;
  recentlyViewed: ContextItem[];
  currentFocusSession: FocusSessionInfo | null;
  todaysCompletions: ContextItem[];
}

export interface FocusSessionInfo {
  id: string;
  itemId?: string;
  itemTitle?: string;
  startedAt: Date;
  duration: number;
}

export interface HabitContext {
  todaysHabits: HabitWithStatus[];
  streaks: Record<string, number>;
  habitCompletionRate: number;
  missedHabitsToday: HabitItem[];
}

export interface HabitWithStatus {
  id: string;
  title: string;
  completed: boolean;
  streak: number;
}

export interface HabitItem {
  id: string;
  title: string;
}

export interface PreferenceItem {
  category: string;
  key: string;
  value: string;
}

export interface MemoryContext {
  recentTopics: string[];
  ongoingProjects: string[];
  mentionedConstraints: string[];
  expressedFrustrations: string[];
}

// Briefing Types
export interface Briefing {
  greeting: string;
  date: string;
  sections: BriefingSection[];
  suggestedFocus?: SuggestedFocus;
}

export interface BriefingSection {
  title: string;
  type: "calendar" | "priorities" | "habits" | "insights";
  content: unknown;
}

export interface SuggestedFocus {
  item: ContextItem;
  reason: string;
  estimatedMinutes: number;
}

export interface Insight {
  type: "warning" | "observation" | "suggestion" | "celebration";
  title: string;
  message: string;
  action?: {
    label: string;
    prompt: string;
  };
}

// Rescheduling Types
export interface RescheduleContext {
  item: ContextItem;
  reason: "missed" | "conflict" | "user_request" | "cascade";
  constraints?: RescheduleConstraints;
}

export interface RescheduleConstraints {
  notBefore?: Date;
  notAfter?: Date;
  preferredTimes?: string[];
  preferredTimeOfDay?: "morning" | "afternoon" | "evening";
  avoidDays?: string[];
  avoidWeekends?: boolean;
}

export interface RescheduleOption {
  newDueAt: Date;
  confidence: number;
  reasoning: string;
  impact: RescheduleImpact;
}

export interface RescheduleImpact {
  conflictsCreated: number;
  cascadeEffects: ContextItem[];
  capacityChange: number;
}

// Dependency Types
export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: DependencyEdge[];
  criticalPath: string[];
  blockedChains: BlockedChain[];
}

export interface GraphNode {
  item: ContextItem;
  inDegree: number;
  outDegree: number;
  depth: number;
  isCritical: boolean;
  estimatedUnblockDate: Date | null;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: string;
}

export interface BlockedChain {
  rootBlocker: ContextItem;
  chainLength: number;
  totalBlockedItems: number;
  totalBlockedHours: number;
  unblockImpact: string;
}

// Goal Alignment Types
export interface AlignmentAnalysis {
  overallAlignment: number;
  byGoal: GoalAlignment[];
  byArea: AreaAlignment[];
  drift: DriftAnalysis;
  recommendations: AlignmentRecommendation[];
}

export interface GoalAlignment {
  goal: GoalItem;
  alignedItems: ContextItem[];
  alignedHours: number;
  progress: number;
  trend: "improving" | "stable" | "declining";
  projectedCompletion: Date | null;
}

export interface AreaAlignment {
  area: string;
  itemCount: number;
  hoursAllocated: number;
  percentageOfTotal: number;
  trend: "increasing" | "stable" | "decreasing";
  lastActivity: Date | null;
}

export interface DriftAnalysis {
  isDrifting: boolean;
  driftDirection: string | null;
  driftSeverity: "low" | "medium" | "high";
  explanation: string;
}

export interface AlignmentRecommendation {
  type: "focus" | "balance" | "review";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestedAction?: {
    type: string;
    params: Record<string, unknown>;
  };
}
