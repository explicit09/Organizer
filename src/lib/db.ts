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
