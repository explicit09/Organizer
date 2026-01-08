import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import webpush from "web-push";

// ========== Types ==========

export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type?: "reminder" | "deadline" | "habit" | "focus" | "review";
    itemId?: string;
    url?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
  }>;
  requireInteraction?: boolean;
};

// ========== VAPID Setup ==========

// Generate VAPID keys: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@example.com";

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

function initWebPush() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    return true;
  }
  return false;
}

// ========== Subscription Management ==========

export function saveSubscription(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  options?: { userId?: string }
): PushSubscription {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Remove existing subscription for this endpoint
  db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(
    subscription.endpoint
  );

  db.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, now);

  return {
    id,
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    createdAt: now,
  };
}

export function removeSubscription(endpoint: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(endpoint);
}

export function getSubscriptionsForUser(
  options?: { userId?: string }
): PushSubscription[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `SELECT id, user_id, endpoint, p256dh, auth, created_at
       FROM push_subscriptions WHERE user_id = ?`
    )
    .all(userId) as Array<{
      id: string;
      user_id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
      created_at: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
    createdAt: row.created_at,
  }));
}

// ========== Send Notifications ==========

export async function sendPushNotification(
  payload: NotificationPayload,
  options?: { userId?: string }
): Promise<{ success: number; failed: number }> {
  if (!initWebPush()) {
    console.warn("[Push] VAPID keys not configured");
    return { success: 0, failed: 0 };
  }

  const subscriptions = getSubscriptionsForUser(options);
  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        JSON.stringify(payload)
      );
      success++;
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      console.error("[Push] Failed to send:", err);
      failed++;

      // Remove invalid subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        removeSubscription(sub.endpoint);
      }
    }
  }

  return { success, failed };
}

// ========== Notification Helpers ==========

export async function sendReminderNotification(
  itemTitle: string,
  itemId: string,
  options?: { userId?: string }
): Promise<void> {
  await sendPushNotification(
    {
      title: "Reminder",
      body: itemTitle,
      tag: `reminder-${itemId}`,
      data: {
        type: "reminder",
        itemId,
      },
      actions: [
        { action: "complete", title: "Mark Complete" },
        { action: "snooze", title: "Snooze 1h" },
      ],
    },
    options
  );
}

export async function sendDeadlineNotification(
  itemTitle: string,
  itemId: string,
  hoursRemaining: number,
  options?: { userId?: string }
): Promise<void> {
  const urgency = hoursRemaining <= 1 ? "⚠️ " : "";
  const timeText =
    hoursRemaining < 1
      ? "less than an hour"
      : hoursRemaining === 1
      ? "1 hour"
      : `${hoursRemaining} hours`;

  await sendPushNotification(
    {
      title: `${urgency}Deadline Approaching`,
      body: `"${itemTitle}" is due in ${timeText}`,
      tag: `deadline-${itemId}`,
      data: {
        type: "deadline",
        itemId,
      },
      requireInteraction: hoursRemaining <= 1,
    },
    options
  );
}

export async function sendHabitReminderNotification(
  habitTitle: string,
  streak: number,
  options?: { userId?: string }
): Promise<void> {
  const streakText = streak > 0 ? ` (${streak} day streak!)` : "";

  await sendPushNotification(
    {
      title: "Habit Reminder",
      body: `Time to ${habitTitle}${streakText}`,
      tag: "habit-reminder",
      data: {
        type: "habit",
      },
      actions: [
        { action: "done", title: "Done!" },
        { action: "skip", title: "Skip Today" },
      ],
    },
    options
  );
}

export async function sendFocusEndNotification(
  sessionMinutes: number,
  options?: { userId?: string }
): Promise<void> {
  await sendPushNotification(
    {
      title: "Focus Session Complete! 🎉",
      body: `Great work! You focused for ${sessionMinutes} minutes.`,
      tag: "focus-complete",
      data: {
        type: "focus",
      },
    },
    options
  );
}

export async function sendWeeklyReviewNotification(
  options?: { userId?: string }
): Promise<void> {
  await sendPushNotification(
    {
      title: "Weekly Review Time",
      body: "Take a few minutes to reflect on your week and plan ahead.",
      tag: "weekly-review",
      data: {
        type: "review",
        url: "/review",
      },
      actions: [{ action: "start", title: "Start Review" }],
    },
    options
  );
}
