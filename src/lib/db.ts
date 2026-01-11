import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH ?? "./organizer.db";
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    term TEXT,
    instructor TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    area TEXT,
    goal TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('task', 'meeting', 'school')),
    title TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
    priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    tags_json TEXT,
    due_at TEXT,
    start_at TEXT,
    end_at TEXT,
    estimated_minutes INTEGER,
    parent_id TEXT,
    course_id TEXT,
    project_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    item_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    tags_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    note_id TEXT,
    item_id TEXT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    item_id TEXT,
    action TEXT NOT NULL,
    data_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    target REAL,
    unit TEXT,
    current REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    date TEXT NOT NULL,
    mood INTEGER,
    focus INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    item_id TEXT,
    title TEXT NOT NULL,
    due_at TEXT NOT NULL,
    delivered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS integrations (
    provider TEXT PRIMARY KEY,
    user_id TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    item_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS item_labels (
    item_id TEXT NOT NULL,
    label_id TEXT NOT NULL,
    PRIMARY KEY (item_id, label_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saved_views (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    filters_json TEXT,
    sort_by TEXT,
    group_by TEXT,
    view_type TEXT DEFAULT 'list',
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dependencies (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (blocker_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cycles (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'planned',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, item_type, item_id)
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    project_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    lead_id TEXT,
    start_date TEXT,
    target_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY,
    email_enabled INTEGER DEFAULT 0,
    browser_enabled INTEGER DEFAULT 1,
    push_enabled INTEGER DEFAULT 0,
    email_address TEXT,
    reminder_minutes_json TEXT DEFAULT '[15, 60]',
    quiet_hours_start INTEGER,
    quiet_hours_end INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(type, status);
  CREATE INDEX IF NOT EXISTS idx_items_due_at ON items(due_at);
  CREATE INDEX IF NOT EXISTS idx_items_user_type ON items(user_id, type);
  CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);
  CREATE INDEX IF NOT EXISTS idx_dependencies_blocker ON dependencies(blocker_id);
  CREATE INDEX IF NOT EXISTS idx_dependencies_blocked ON dependencies(blocked_id);
  CREATE INDEX IF NOT EXISTS idx_cycles_user ON cycles(user_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_modules_project ON modules(project_id);

  -- Daily Planning
  CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    top_priorities_json TEXT,
    time_blocks_json TEXT,
    reflection_json TEXT,
    energy_level TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, date)
  );

  -- Focus Sessions (Pomodoro)
  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_minutes INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('focus', 'break')),
    completed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
  );

  -- Habits
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'weekdays', 'custom')),
    target_count INTEGER DEFAULT 1,
    color TEXT DEFAULT '#8b5cf6',
    icon TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE(habit_id, date)
  );

  -- AI Conversation Memory
  CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    actions_json TEXT,
    created_at TEXT NOT NULL
  );

  -- Push Subscriptions
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(endpoint)
  );

  -- Availability Links for scheduling
  CREATE TABLE IF NOT EXISTS availability_links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 30,
    buffer_before INTEGER DEFAULT 0,
    buffer_after INTEGER DEFAULT 0,
    available_hours_json TEXT NOT NULL DEFAULT '{"start":9,"end":17}',
    available_days_json TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    max_days_ahead INTEGER DEFAULT 14,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    expires_at TEXT
  );

  -- Bookings from availability links
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    link_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (link_id) REFERENCES availability_links(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
  CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
  CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_availability_links_user ON availability_links(user_id);
  CREATE INDEX IF NOT EXISTS idx_availability_links_slug ON availability_links(slug);
  CREATE INDEX IF NOT EXISTS idx_bookings_link ON bookings(link_id);
`);

function columnExists(table: string, column: string) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return info.some((row) => row.name === column);
}

function ensureColumn(table: string, column: string, definition: string) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("items", "user_id", "TEXT");
ensureColumn("items", "recurrence_rule", "TEXT"); // daily, weekly, monthly, or cron-like
ensureColumn("items", "recurrence_end", "TEXT"); // ISO date when recurrence ends
ensureColumn("items", "original_item_id", "TEXT"); // For generated instances, points to template
ensureColumn("items", "agenda", "TEXT"); // Meeting agenda
ensureColumn("items", "buffer_before", "INTEGER"); // Minutes buffer before meeting
ensureColumn("items", "buffer_after", "INTEGER"); // Minutes buffer after meeting
ensureColumn("items", "grade", "REAL"); // Grade for school items
ensureColumn("items", "grade_weight", "REAL"); // Weight of grade (percentage)
ensureColumn("courses", "user_id", "TEXT");
ensureColumn("projects", "user_id", "TEXT");
ensureColumn("activity_log", "user_id", "TEXT");
ensureColumn("integrations", "user_id", "TEXT");
ensureColumn("items", "cycle_id", "TEXT"); // Link to cycle/sprint
ensureColumn("items", "assignee_id", "TEXT"); // Assigned user
ensureColumn("items", "module_id", "TEXT"); // Link to module
ensureColumn("items", "area", "TEXT"); // Life area: work, personal, health, learning, finance, relationships, side_projects

// AI Agent Memory Tables
db.exec(`
  -- User Preferences (learned by AI)
  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence TEXT DEFAULT 'explicit',
    source TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, category, key)
  );

  -- AI Memory (observations, facts, patterns)
  CREATE TABLE IF NOT EXISTS ai_memory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    significance TEXT DEFAULT 'medium',
    embedding TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TEXT
  );

  -- User Behavioral Patterns (detected by AI)
  CREATE TABLE IF NOT EXISTS user_patterns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_data TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    sample_size INTEGER DEFAULT 0,
    first_observed_at TEXT NOT NULL,
    last_updated_at TEXT NOT NULL,
    UNIQUE(user_id, pattern_type)
  );

  CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_ai_memory_user_type ON ai_memory(user_id, type);
  CREATE INDEX IF NOT EXISTS idx_ai_memory_category ON ai_memory(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_user_patterns_user ON user_patterns(user_id);
`);

// Add new columns to ai_conversations if they don't exist
ensureColumn("ai_conversations", "tool_calls_json", "TEXT");
ensureColumn("ai_conversations", "context_used_json", "TEXT");
ensureColumn("ai_conversations", "feedback", "TEXT");
ensureColumn("ai_conversations", "tokens_used", "INTEGER");

// Phase 2: Intelligence Layer Tables
db.exec(`
  -- Context Cache (for performance optimization)
  CREATE TABLE IF NOT EXISTS context_cache (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    context_type TEXT NOT NULL,
    data_json TEXT NOT NULL,
    computed_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    UNIQUE(user_id, context_type, cache_key)
  );

  -- Morning Briefings (store generated briefings)
  CREATE TABLE IF NOT EXISTS briefings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    briefing_json TEXT NOT NULL,
    suggested_focus_id TEXT,
    config_json TEXT,
    delivered_at TEXT,
    viewed_at TEXT,
    feedback TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, date)
  );

  -- Reschedule History (track rescheduling decisions)
  CREATE TABLE IF NOT EXISTS reschedule_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    original_due_at TEXT,
    new_due_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    ai_confidence REAL,
    user_accepted INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  -- AI Metrics (track intelligence system performance)
  CREATE TABLE IF NOT EXISTS ai_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );

  -- Goal Progress Snapshots (track goal progress over time)
  CREATE TABLE IF NOT EXISTS goal_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    goal_id TEXT NOT NULL,
    progress_value REAL NOT NULL,
    aligned_hours REAL,
    alignment_score REAL,
    snapshot_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  );

  -- Drift Alerts (track when goal drift is detected)
  CREATE TABLE IF NOT EXISTS drift_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    drift_direction TEXT,
    explanation TEXT NOT NULL,
    recommendations_json TEXT,
    acknowledged_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_context_cache_user ON context_cache(user_id);
  CREATE INDEX IF NOT EXISTS idx_context_cache_expires ON context_cache(expires_at);
  CREATE INDEX IF NOT EXISTS idx_briefings_user_date ON briefings(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_reschedule_history_item ON reschedule_history(item_id);
  CREATE INDEX IF NOT EXISTS idx_ai_metrics_user_type ON ai_metrics(user_id, metric_type);
  CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal ON goal_snapshots(goal_id);
  CREATE INDEX IF NOT EXISTS idx_drift_alerts_user ON drift_alerts(user_id);
`);

// Add goal columns if missing
ensureColumn("goals", "area", "TEXT");
ensureColumn("goals", "project_id", "TEXT");

// Phase 3: Proactive Intelligence Tables
db.exec(`
  -- Trigger State (track cooldowns and trigger history)
  CREATE TABLE IF NOT EXISTS trigger_state (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    last_triggered TEXT NOT NULL,
    trigger_count INTEGER DEFAULT 1,
    UNIQUE(user_id, trigger_type)
  );

  -- Proactive Notifications (all proactive messages sent)
  CREATE TABLE IF NOT EXISTS proactive_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    message_json TEXT NOT NULL,
    channels_json TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    read_at TEXT,
    action_taken TEXT,
    dismissed INTEGER DEFAULT 0
  );

  -- User Trigger Preferences (enable/disable triggers, cooldowns)
  CREATE TABLE IF NOT EXISTS user_trigger_preferences (
    user_id TEXT PRIMARY KEY,
    disabled_triggers_json TEXT,
    custom_cooldowns_json TEXT,
    notification_prefs_json TEXT,
    updated_at TEXT NOT NULL
  );

  -- In-App Notifications (UI notifications)
  CREATE TABLE IF NOT EXISTS in_app_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    shown INTEGER DEFAULT 0,
    dismissed INTEGER DEFAULT 0
  );

  -- Notification Queue (queued for later delivery)
  CREATE TABLE IF NOT EXISTS notification_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message_json TEXT NOT NULL,
    queued_at TEXT NOT NULL,
    deliver_after TEXT NOT NULL,
    delivered INTEGER DEFAULT 0
  );

  -- Action Log (audit trail for auto-actions)
  CREATE TABLE IF NOT EXISTS action_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    params_json TEXT,
    result_json TEXT,
    executed_at TEXT NOT NULL
  );

  -- Automation Rules (user-configurable automations)
  CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    trigger_json TEXT NOT NULL,
    actions_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_triggered_at TEXT,
    trigger_count INTEGER DEFAULT 0,
    deleted_at TEXT
  );

  -- Check-in Configurations (morning briefing, evening wrapup settings)
  CREATE TABLE IF NOT EXISTS checkin_configs (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    preferred_day TEXT,
    enabled INTEGER DEFAULT 1,
    channels_json TEXT NOT NULL,
    updated_at TEXT,
    PRIMARY KEY (user_id, type)
  );

  -- Breaks (track user breaks for wellbeing)
  CREATE TABLE IF NOT EXISTS breaks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    planned_duration INTEGER
  );

  -- Reminders (user-set reminders)
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT,
    habit_id TEXT,
    remind_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    delivered_at TEXT
  );

  -- Habit Completions (separate from habit_logs for proactive system)
  CREATE TABLE IF NOT EXISTS habit_completions (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  );

  -- User Settings (generic key-value settings)
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  );

  -- Wellbeing Assessments (periodic assessments)
  CREATE TABLE IF NOT EXISTS wellbeing_assessments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    indicators_json TEXT NOT NULL,
    warnings_json TEXT NOT NULL,
    overall_status TEXT NOT NULL,
    suggestions_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_trigger_state_user ON trigger_state(user_id);
  CREATE INDEX IF NOT EXISTS idx_proactive_notifications_user ON proactive_notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_proactive_notifications_sent ON proactive_notifications(sent_at);
  CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notification_queue_deliver ON notification_queue(deliver_after);
  CREATE INDEX IF NOT EXISTS idx_action_log_user ON action_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id);
  CREATE INDEX IF NOT EXISTS idx_breaks_user ON breaks(user_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
  CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
  CREATE INDEX IF NOT EXISTS idx_wellbeing_assessments_user ON wellbeing_assessments(user_id);
`);

// Add status column to focus_sessions if missing
ensureColumn("focus_sessions", "status", "TEXT DEFAULT 'active'");

// Add deleted_at column to items if missing
ensureColumn("items", "deleted_at", "TEXT");

// Phase 4: Adaptive Learning Tables
db.exec(`
  -- Learning Events (all events that the learning system observes)
  CREATE TABLE IF NOT EXISTS learning_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Productivity Records (hourly/daily productivity observations)
  CREATE TABLE IF NOT EXISTS productivity_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    hour INTEGER,
    day_of_week TEXT,
    score REAL NOT NULL,
    sample_count INTEGER DEFAULT 1,
    task_type TEXT,
    task_size TEXT,
    project_id TEXT,
    created_at TEXT NOT NULL
  );

  -- Estimation Records (track estimated vs actual time)
  CREATE TABLE IF NOT EXISTS estimation_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id TEXT,
    task_type TEXT NOT NULL,
    task_size TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL,
    actual_minutes INTEGER,
    accuracy REAL,
    title TEXT,
    project_id TEXT,
    created_at TEXT NOT NULL
  );

  -- Behavior Records (track interactions with suggestions, notifications, etc.)
  CREATE TABLE IF NOT EXISTS behavior_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    suggestion_type TEXT,
    notification_type TEXT,
    outcome TEXT,
    reason TEXT,
    hour INTEGER,
    channel TEXT,
    word_count INTEGER,
    has_emoji INTEGER,
    is_brief INTEGER,
    is_detailed INTEGER,
    is_technical INTEGER,
    feedback TEXT,
    rating INTEGER,
    created_at TEXT NOT NULL
  );

  -- User Models (cached computed models per user)
  CREATE TABLE IF NOT EXISTS user_models (
    user_id TEXT PRIMARY KEY,
    model_json TEXT NOT NULL,
    samples_used INTEGER DEFAULT 0,
    overall_confidence REAL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  -- Implicit Preferences (learned from behavior)
  CREATE TABLE IF NOT EXISTS implicit_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    source TEXT NOT NULL,
    first_observed_at TEXT NOT NULL,
    last_confirmed_at TEXT NOT NULL,
    UNIQUE(user_id, category, key)
  );

  -- Learning Feedback (explicit feedback from users)
  CREATE TABLE IF NOT EXISTS learning_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    context TEXT NOT NULL,
    rating INTEGER,
    comment TEXT,
    correction TEXT,
    timestamp TEXT NOT NULL
  );

  -- Predictions (track prediction accuracy)
  CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prediction_type TEXT NOT NULL,
    predicted_value TEXT NOT NULL,
    actual_value TEXT,
    accuracy REAL,
    context TEXT,
    predicted_at TEXT NOT NULL,
    resolved_at TEXT
  );

  -- Suggestion History (track all suggestions made)
  CREATE TABLE IF NOT EXISTS suggestion_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    suggestion_json TEXT NOT NULL,
    confidence REAL,
    predicted_acceptance REAL,
    personalization_applied INTEGER DEFAULT 0,
    outcome TEXT,
    outcome_at TEXT,
    created_at TEXT NOT NULL
  );

  -- Model Update History (track when models are updated)
  CREATE TABLE IF NOT EXISTS model_update_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    model_type TEXT NOT NULL,
    events_processed INTEGER DEFAULT 0,
    confidence_before REAL,
    confidence_after REAL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(user_id, event_type);
  CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_productivity_records_user ON productivity_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_productivity_records_type ON productivity_records(user_id, record_type);
  CREATE INDEX IF NOT EXISTS idx_estimation_records_user ON estimation_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_estimation_records_type ON estimation_records(user_id, task_type);
  CREATE INDEX IF NOT EXISTS idx_behavior_records_user ON behavior_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_behavior_records_type ON behavior_records(user_id, record_type);
  CREATE INDEX IF NOT EXISTS idx_implicit_preferences_user ON implicit_preferences(user_id);
  CREATE INDEX IF NOT EXISTS idx_implicit_preferences_category ON implicit_preferences(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_learning_feedback_user ON learning_feedback(user_id);
  CREATE INDEX IF NOT EXISTS idx_learning_feedback_type ON learning_feedback(user_id, feedback_type);
  CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
  CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(user_id, prediction_type);
  CREATE INDEX IF NOT EXISTS idx_suggestion_history_user ON suggestion_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_suggestion_history_type ON suggestion_history(user_id, suggestion_type);
  CREATE INDEX IF NOT EXISTS idx_model_update_history_user ON model_update_history(user_id);
`);

export function getDb() {
  return db;
}

export function resetDb() {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM activity_log;
    DELETE FROM items;
    DELETE FROM notes;
    DELETE FROM attachments;
    DELETE FROM goals;
    DELETE FROM checkins;
    DELETE FROM notifications;
    DELETE FROM courses;
    DELETE FROM projects;
    DELETE FROM integrations;
  `);
}
