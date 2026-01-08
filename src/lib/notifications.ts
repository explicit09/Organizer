import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { Item } from "./items";
import { getDefaultUserId } from "./auth";

export type Notification = {
  id: string;
  userId: string;
  itemId?: string;
  title: string;
  dueAt: string;
  deliveredAt?: string;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  item_id: string | null;
  title: string;
  due_at: string;
  delivered_at: string | null;
};

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    itemId: row.item_id ?? undefined,
    title: row.title,
    dueAt: row.due_at,
    deliveredAt: row.delivered_at ?? undefined,
  };
}

export function upsertNotificationForItem(
  item: Item,
  options?: { userId?: string }
) {
  const db = getDb();
  const userId = options?.userId ?? item.userId ?? getDefaultUserId();

  if (!item.dueAt) {
    db.prepare("DELETE FROM notifications WHERE item_id = ? AND user_id = ?").run(
      item.id,
      userId
    );
    return;
  }

  const existing = db
    .prepare(
      `
        SELECT id FROM notifications
        WHERE item_id = ? AND user_id = ?
      `
    )
    .get(item.id, userId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `
        UPDATE notifications
        SET title = @title,
            due_at = @due_at
        WHERE id = @id
      `
    ).run({
      id: existing.id,
      title: item.title,
      due_at: item.dueAt,
    });
    return;
  }

  db.prepare(
    `
      INSERT INTO notifications (id, user_id, item_id, title, due_at)
      VALUES (@id, @user_id, @item_id, @title, @due_at)
    `
  ).run({
    id: randomUUID(),
    user_id: userId,
    item_id: item.id,
    title: item.title,
    due_at: item.dueAt,
  });
}

export function listDueNotifications(
  options?: { userId?: string; until?: string; includeDelivered?: boolean }
) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const until = options?.until ?? new Date().toISOString();
  const includeDelivered = options?.includeDelivered ?? false;

  const clauses = ["user_id = @user_id", "due_at <= @until"];
  if (!includeDelivered) {
    clauses.push("delivered_at IS NULL");
  }

  const rows = db
    .prepare(
      `
        SELECT id, user_id, item_id, title, due_at, delivered_at
        FROM notifications
        WHERE ${clauses.join(" AND ")}
        ORDER BY due_at ASC
      `
    )
    .all({ user_id: userId, until }) as NotificationRow[];

  return rows.map(mapRow);
}

export function markNotificationDelivered(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  db.prepare(
    `
      UPDATE notifications
      SET delivered_at = @delivered_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    delivered_at: new Date().toISOString(),
  });
}

export function markAllNotificationsDelivered(options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  db.prepare(
    `
      UPDATE notifications
      SET delivered_at = @delivered_at
      WHERE user_id = @user_id AND delivered_at IS NULL
    `
  ).run({
    user_id: userId,
    delivered_at: new Date().toISOString(),
  });
}

export function deleteNotification(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const result = db
    .prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}

export function listAllNotifications(options?: { userId?: string; limit?: number }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 50;

  const rows = db
    .prepare(
      `
        SELECT id, user_id, item_id, title, due_at, delivered_at
        FROM notifications
        WHERE user_id = @user_id
        ORDER BY due_at DESC
        LIMIT @limit
      `
    )
    .all({ user_id: userId, limit }) as NotificationRow[];

  return rows.map(mapRow);
}

// ========== Notification Delivery ==========

export type NotificationChannel = "browser" | "email" | "push";

export type NotificationDeliveryResult = {
  notificationId: string;
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  deliveredAt?: string;
};

// Browser Notification (for SSE/polling)
export type BrowserNotificationPayload = {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  timestamp: string;
};

export function getPendingBrowserNotifications(
  userId: string
): BrowserNotificationPayload[] {
  const notifications = listDueNotifications({ userId });

  return notifications.map((n) => ({
    id: n.id,
    title: "Reminder",
    body: n.title,
    icon: "/favicon.ico",
    url: n.itemId ? `/inbox?highlight=${n.itemId}` : "/dashboard",
    timestamp: n.dueAt,
  }));
}

// Email Notification
export type EmailNotificationOptions = {
  to: string;
  notification: Notification;
  baseUrl?: string;
};

export async function sendEmailNotification(
  options: EmailNotificationOptions
): Promise<NotificationDeliveryResult> {
  const { to, notification } = options;

  // Check for email service configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM ?? "noreply@organizer.local";

  if (!smtpHost) {
    // Fallback: Use a third-party email API like SendGrid, Resend, etc.
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject: `Reminder: ${notification.title}`,
            html: `
              <h2>Reminder</h2>
              <p><strong>${notification.title}</strong></p>
              <p>Due: ${new Date(notification.dueAt).toLocaleString()}</p>
              <p><a href="${options.baseUrl ?? "http://localhost:3000"}/dashboard">View in Organizer</a></p>
            `,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message ?? "Email send failed");
        }

        markNotificationDelivered(notification.id);

        return {
          notificationId: notification.id,
          channel: "email",
          success: true,
          deliveredAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          notificationId: notification.id,
          channel: "email",
          success: false,
          error: error instanceof Error ? error.message : "Email send failed",
        };
      }
    }

    return {
      notificationId: notification.id,
      channel: "email",
      success: false,
      error: "No email service configured (set SMTP_HOST or RESEND_API_KEY)",
    };
  }

  // SMTP sending would go here with nodemailer or similar
  // For now, return not configured
  return {
    notificationId: notification.id,
    channel: "email",
    success: false,
    error: "SMTP sending not implemented - use RESEND_API_KEY instead",
  };
}

// ========== Notification Preferences ==========

export type NotificationPreferences = {
  userId: string;
  emailEnabled: boolean;
  browserEnabled: boolean;
  pushEnabled: boolean;
  emailAddress?: string;
  reminderMinutesBefore: number[];
  quietHoursStart?: number; // Hour (0-23)
  quietHoursEnd?: number;
};

const defaultPreferences: Omit<NotificationPreferences, "userId"> = {
  emailEnabled: false,
  browserEnabled: true,
  pushEnabled: false,
  reminderMinutesBefore: [15, 60], // 15 min and 1 hour before
};

type PreferencesRow = {
  user_id: string;
  email_enabled: number;
  browser_enabled: number;
  push_enabled: number;
  email_address: string | null;
  reminder_minutes_json: string;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
};

function mapPreferencesRow(row: PreferencesRow): NotificationPreferences {
  return {
    userId: row.user_id,
    emailEnabled: row.email_enabled === 1,
    browserEnabled: row.browser_enabled === 1,
    pushEnabled: row.push_enabled === 1,
    emailAddress: row.email_address ?? undefined,
    reminderMinutesBefore: JSON.parse(row.reminder_minutes_json || "[15, 60]"),
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined,
  };
}

export function getNotificationPreferences(userId: string): NotificationPreferences {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM notification_preferences WHERE user_id = ?")
    .get(userId) as PreferencesRow | undefined;

  if (row) {
    return mapPreferencesRow(row);
  }

  return { userId, ...defaultPreferences };
}

export function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): NotificationPreferences {
  const db = getDb();
  const now = new Date().toISOString();
  const current = getNotificationPreferences(userId);
  const updated = { ...current, ...updates, userId };

  const existing = db
    .prepare("SELECT user_id FROM notification_preferences WHERE user_id = ?")
    .get(userId);

  if (existing) {
    db.prepare(
      `UPDATE notification_preferences SET
        email_enabled = ?,
        browser_enabled = ?,
        push_enabled = ?,
        email_address = ?,
        reminder_minutes_json = ?,
        quiet_hours_start = ?,
        quiet_hours_end = ?,
        updated_at = ?
      WHERE user_id = ?`
    ).run(
      updated.emailEnabled ? 1 : 0,
      updated.browserEnabled ? 1 : 0,
      updated.pushEnabled ? 1 : 0,
      updated.emailAddress ?? null,
      JSON.stringify(updated.reminderMinutesBefore),
      updated.quietHoursStart ?? null,
      updated.quietHoursEnd ?? null,
      now,
      userId
    );
  } else {
    db.prepare(
      `INSERT INTO notification_preferences
        (user_id, email_enabled, browser_enabled, push_enabled, email_address, reminder_minutes_json, quiet_hours_start, quiet_hours_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      updated.emailEnabled ? 1 : 0,
      updated.browserEnabled ? 1 : 0,
      updated.pushEnabled ? 1 : 0,
      updated.emailAddress ?? null,
      JSON.stringify(updated.reminderMinutesBefore),
      updated.quietHoursStart ?? null,
      updated.quietHoursEnd ?? null,
      now,
      now
    );
  }

  return updated;
}

// ========== Notification Scheduler ==========

export type ScheduledReminder = {
  notificationId: string;
  itemId?: string;
  title: string;
  scheduledFor: string;
  minutesBefore: number;
};

export function getScheduledReminders(
  options?: { userId?: string; hoursAhead?: number }
): ScheduledReminder[] {
  const userId = options?.userId ?? getDefaultUserId();
  const hoursAhead = options?.hoursAhead ?? 24;

  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const notifications = listDueNotifications({
    userId,
    until: future.toISOString(),
    includeDelivered: false,
  });

  const prefs = getNotificationPreferences(userId);
  const reminders: ScheduledReminder[] = [];

  for (const notification of notifications) {
    const dueDate = new Date(notification.dueAt);

    for (const minutesBefore of prefs.reminderMinutesBefore) {
      const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);

      if (reminderTime > now && reminderTime <= future) {
        reminders.push({
          notificationId: notification.id,
          itemId: notification.itemId,
          title: notification.title,
          scheduledFor: reminderTime.toISOString(),
          minutesBefore,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

// ========== Batch Notification Delivery ==========

export async function deliverPendingNotifications(
  userId: string,
  channels: NotificationChannel[] = ["browser"]
): Promise<NotificationDeliveryResult[]> {
  const notifications = listDueNotifications({ userId });
  const prefs = getNotificationPreferences(userId);
  const results: NotificationDeliveryResult[] = [];

  // Check quiet hours
  if (prefs.quietHoursStart !== undefined && prefs.quietHoursEnd !== undefined) {
    const currentHour = new Date().getHours();
    if (
      (prefs.quietHoursStart <= prefs.quietHoursEnd &&
        currentHour >= prefs.quietHoursStart &&
        currentHour < prefs.quietHoursEnd) ||
      (prefs.quietHoursStart > prefs.quietHoursEnd &&
        (currentHour >= prefs.quietHoursStart || currentHour < prefs.quietHoursEnd))
    ) {
      // In quiet hours, skip delivery
      return [];
    }
  }

  for (const notification of notifications) {
    for (const channel of channels) {
      switch (channel) {
        case "browser":
          // Browser notifications are pulled via SSE/polling
          results.push({
            notificationId: notification.id,
            channel: "browser",
            success: true,
            deliveredAt: new Date().toISOString(),
          });
          markNotificationDelivered(notification.id);
          break;

        case "email":
          if (prefs.emailEnabled && prefs.emailAddress) {
            const result = await sendEmailNotification({
              to: prefs.emailAddress,
              notification,
            });
            results.push(result);
          }
          break;

        case "push":
          // Push notifications would require web push subscription
          results.push({
            notificationId: notification.id,
            channel: "push",
            success: false,
            error: "Push notifications not yet implemented",
          });
          break;
      }
    }
  }

  return results;
}
