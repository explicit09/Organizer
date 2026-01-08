import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

// ========== Types ==========

export type FocusSession = {
  id: string;
  userId: string;
  itemId?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  type: "focus" | "break";
  completed: boolean;
  notes?: string;
  createdAt: string;
};

type FocusSessionRow = {
  id: string;
  user_id: string;
  item_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  type: string;
  completed: number;
  notes: string | null;
  created_at: string;
};

// ========== Helpers ==========

function mapRow(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationMinutes: row.duration_minutes,
    type: row.type as "focus" | "break",
    completed: row.completed === 1,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ========== CRUD Operations ==========

export function startFocusSession(
  data: {
    itemId?: string;
    durationMinutes?: number;
    type?: "focus" | "break";
  },
  options?: { userId?: string }
): FocusSession {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  const duration = data.durationMinutes ?? 25; // Default pomodoro
  const type = data.type ?? "focus";

  db.prepare(
    `INSERT INTO focus_sessions (id, user_id, item_id, started_at, duration_minutes, type, completed, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)`
  ).run(id, userId, data.itemId ?? null, now, duration, type, now);

  return getFocusSession(id, { userId })!;
}

export function endFocusSession(
  sessionId: string,
  data?: { completed?: boolean; notes?: string },
  options?: { userId?: string }
): FocusSession | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();

  const session = getFocusSession(sessionId, { userId });
  if (!session) return null;

  db.prepare(
    `UPDATE focus_sessions
     SET ended_at = ?, completed = ?, notes = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    now,
    data?.completed ? 1 : 0,
    data?.notes ?? null,
    sessionId,
    userId
  );

  return getFocusSession(sessionId, { userId });
}

export function getFocusSession(
  id: string,
  options?: { userId?: string }
): FocusSession | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(`SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?`)
    .get(id, userId) as FocusSessionRow | undefined;

  return row ? mapRow(row) : null;
}

export function getActiveSession(
  options?: { userId?: string }
): FocusSession | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(
      `SELECT * FROM focus_sessions
       WHERE user_id = ? AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`
    )
    .get(userId) as FocusSessionRow | undefined;

  return row ? mapRow(row) : null;
}

export function listFocusSessions(
  options?: {
    userId?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: "focus" | "break";
  }
): FocusSession[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 50;

  let query = `SELECT * FROM focus_sessions WHERE user_id = ?`;
  const params: (string | number)[] = [userId];

  if (options?.startDate) {
    query += ` AND started_at >= ?`;
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ` AND started_at <= ?`;
    params.push(options.endDate);
  }
  if (options?.type) {
    query += ` AND type = ?`;
    params.push(options.type);
  }

  query += ` ORDER BY started_at DESC LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(query).all(...params) as FocusSessionRow[];
  return rows.map(mapRow);
}

// ========== Statistics ==========

export type FocusStats = {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  averageMinutes: number;
  completionRate: number;
  streak: number;
  todayMinutes: number;
  weekMinutes: number;
};

export function getFocusStats(options?: { userId?: string }): FocusStats {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  // All sessions
  const allSessions = listFocusSessions({ userId, limit: 1000, type: "focus" });

  // Completed focus sessions
  const completedSessions = allSessions.filter((s) => s.completed);

  // Today's sessions
  const todaySessions = completedSessions.filter(
    (s) => new Date(s.startedAt) >= todayStart
  );
  const todayMinutes = todaySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  // This week's sessions
  const weekSessions = completedSessions.filter(
    (s) => new Date(s.startedAt) >= weekStart
  );
  const weekMinutes = weekSessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  // Total minutes
  const totalMinutes = completedSessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  // Average duration
  const averageMinutes = completedSessions.length
    ? Math.round(totalMinutes / completedSessions.length)
    : 0;

  // Completion rate
  const completionRate = allSessions.length
    ? Math.round((completedSessions.length / allSessions.length) * 100)
    : 0;

  // Calculate streak (consecutive days with completed sessions)
  const sessionsByDate = new Map<string, boolean>();
  for (const session of completedSessions) {
    const dateKey = session.startedAt.slice(0, 10);
    sessionsByDate.set(dateKey, true);
  }

  let streak = 0;
  const checkDate = new Date(now);
  for (let i = 0; i < 60; i++) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    if (sessionsByDate.has(dateKey)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today might not have a session yet
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    totalSessions: allSessions.length,
    completedSessions: completedSessions.length,
    totalMinutes,
    averageMinutes,
    completionRate,
    streak,
    todayMinutes,
    weekMinutes,
  };
}

// ========== Pomodoro Settings ==========

export type PomodoroSettings = {
  focusDuration: number; // minutes
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number; // number of focus sessions before long break
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  notifications: boolean;
};

const defaultPomodoroSettings: PomodoroSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notifications: true,
};

// For now, use defaults. Can be extended to store per-user settings later.
export function getPomodoroSettings(): PomodoroSettings {
  return defaultPomodoroSettings;
}

export function getNextSessionType(
  completedToday: number,
  settings: PomodoroSettings = defaultPomodoroSettings
): { type: "focus" | "break"; duration: number; isLongBreak: boolean } {
  const sessionsBeforeLongBreak = settings.longBreakInterval;

  // After focus, take a break
  // After N focus sessions, take a long break
  const focusSessionsCompleted = completedToday;

  if (focusSessionsCompleted > 0 && focusSessionsCompleted % sessionsBeforeLongBreak === 0) {
    return {
      type: "break",
      duration: settings.longBreak,
      isLongBreak: true,
    };
  }

  return {
    type: "focus",
    duration: settings.focusDuration,
    isLongBreak: false,
  };
}
