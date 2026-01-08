import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems } from "./items";
import { listHabitsWithStats } from "./habits";
import { getFocusStats } from "./focusSessions";
import { calculateProductivityScore } from "./productivityScore";
import { generateWeeklyReview } from "./weeklyReview";

// ========== Types ==========

export type DigestData = {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  period: {
    start: string;
    end: string;
    weekNumber: number;
  };
  summary: {
    tasksCompleted: number;
    tasksCreated: number;
    focusMinutes: number;
    habitsCompleted: number;
    productivityScore: number;
    trend: "improving" | "stable" | "declining";
  };
  highlights: {
    wins: string[];
    topHabits: Array<{ title: string; streak: number }>;
    upcomingDeadlines: Array<{ title: string; dueAt: string }>;
  };
  insights: string[];
  weeklyGoals: string[];
};

export type DigestPreferences = {
  enabled: boolean;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  format: "full" | "summary";
};

// ========== Generate Digest ==========

export function generateWeeklyDigest(
  options?: { userId?: string }
): DigestData {
  const userId = options?.userId ?? getDefaultUserId();
  const db = getDb();

  // Get user info
  const user = db
    .prepare(`SELECT id, email, name FROM users WHERE id = ?`)
    .get(userId) as { id: string; email: string; name?: string } | undefined;

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate week bounds
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const weekNumber = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
  );

  // Get items for the week
  const allItems = listItems(undefined, { userId });
  const weekItems = allItems.filter((item) => {
    const created = new Date(item.createdAt);
    return created >= weekStart && created <= weekEnd;
  });

  const completedItems = allItems.filter((item) => {
    if (item.status !== "completed") return false;
    const updated = new Date(item.updatedAt);
    return updated >= weekStart && updated <= weekEnd;
  });

  // Get productivity score
  const productivityScore = calculateProductivityScore({ userId });

  // Get habits stats
  const habits = listHabitsWithStats({ userId });
  const topHabits = habits
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 3)
    .map((h) => ({ title: h.title, streak: h.currentStreak }));

  // Get focus stats
  const focusStats = getFocusStats({ userId });

  // Get weekly review for insights
  const review = generateWeeklyReview({ userId });

  // Get upcoming deadlines (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingDeadlines = allItems
    .filter((item) => {
      if (!item.dueAt || item.status === "completed") return false;
      const due = new Date(item.dueAt);
      return due >= now && due <= nextWeek;
    })
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 5)
    .map((item) => ({ title: item.title, dueAt: item.dueAt! }));

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    period: {
      start: weekStart.toISOString().slice(0, 10),
      end: weekEnd.toISOString().slice(0, 10),
      weekNumber,
    },
    summary: {
      tasksCompleted: completedItems.length,
      tasksCreated: weekItems.length,
      focusMinutes: focusStats.totalMinutes,
      habitsCompleted: habits.filter((h) => h.completedToday).length,
      productivityScore: productivityScore.overall,
      trend: productivityScore.trend,
    },
    highlights: {
      wins: review.wins.slice(0, 3),
      topHabits,
      upcomingDeadlines,
    },
    insights: productivityScore.insights.slice(0, 3),
    weeklyGoals: review.suggestions.slice(0, 3),
  };
}

// ========== Email Template ==========

export function generateDigestHtml(data: DigestData): string {
  const { user, period, summary, highlights, insights, weeklyGoals } = data;

  const trendEmoji = summary.trend === "improving" ? "📈" : summary.trend === "declining" ? "📉" : "➡️";
  const scoreColor = summary.productivityScore >= 70 ? "#22c55e" : summary.productivityScore >= 40 ? "#f59e0b" : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Progress Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .score-card { background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
    .score-label { color: #64748b; font-size: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1e293b; }
    .list-item { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .list-item:last-child { border-bottom: none; }
    .badge { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    .cta-button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Weekly Progress Report ${trendEmoji}</h1>
    <p>Week ${period.weekNumber} • ${period.start} to ${period.end}</p>
  </div>

  <div class="score-card">
    <div class="score">${summary.productivityScore}</div>
    <div class="score-label">Productivity Score</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${summary.tasksCompleted}</div>
      <div class="stat-label">Tasks Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Math.round(summary.focusMinutes / 60)}h</div>
      <div class="stat-label">Focus Time</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summary.habitsCompleted}</div>
      <div class="stat-label">Habits Today</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summary.tasksCreated}</div>
      <div class="stat-label">Tasks Created</div>
    </div>
  </div>

  ${highlights.wins.length > 0 ? `
  <div class="section">
    <div class="section-title">🏆 This Week's Wins</div>
    ${highlights.wins.map(win => `<div class="list-item">${win}</div>`).join('')}
  </div>
  ` : ''}

  ${highlights.topHabits.length > 0 ? `
  <div class="section">
    <div class="section-title">🔥 Top Streaks</div>
    ${highlights.topHabits.map(h => `<div class="list-item">${h.title} <span class="badge">${h.streak} days</span></div>`).join('')}
  </div>
  ` : ''}

  ${highlights.upcomingDeadlines.length > 0 ? `
  <div class="section">
    <div class="section-title">📅 Upcoming Deadlines</div>
    ${highlights.upcomingDeadlines.map(d => `<div class="list-item">${d.title} <span class="badge">${new Date(d.dueAt).toLocaleDateString()}</span></div>`).join('')}
  </div>
  ` : ''}

  ${insights.length > 0 ? `
  <div class="section">
    <div class="section-title">💡 Insights</div>
    ${insights.map(i => `<div class="list-item">${i}</div>`).join('')}
  </div>
  ` : ''}

  ${weeklyGoals.length > 0 ? `
  <div class="section">
    <div class="section-title">🎯 Goals for Next Week</div>
    ${weeklyGoals.map(g => `<div class="list-item">${g}</div>`).join('')}
  </div>
  ` : ''}

  <div style="text-align: center;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review" class="cta-button">
      View Full Report
    </a>
  </div>

  <div class="footer">
    <p>You're receiving this because you enabled weekly digests in Organizer.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications">Manage email preferences</a></p>
  </div>
</body>
</html>
`;
}

export function generateDigestText(data: DigestData): string {
  const { period, summary, highlights, insights, weeklyGoals } = data;

  let text = `
WEEKLY PROGRESS REPORT
Week ${period.weekNumber} • ${period.start} to ${period.end}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCTIVITY SCORE: ${summary.productivityScore}/100 (${summary.trend})

STATS
• Tasks Completed: ${summary.tasksCompleted}
• Tasks Created: ${summary.tasksCreated}
• Focus Time: ${Math.round(summary.focusMinutes / 60)} hours
• Habits Today: ${summary.habitsCompleted}
`;

  if (highlights.wins.length > 0) {
    text += `
THIS WEEK'S WINS
${highlights.wins.map(w => `• ${w}`).join('\n')}
`;
  }

  if (highlights.topHabits.length > 0) {
    text += `
TOP STREAKS
${highlights.topHabits.map(h => `• ${h.title}: ${h.streak} days`).join('\n')}
`;
  }

  if (highlights.upcomingDeadlines.length > 0) {
    text += `
UPCOMING DEADLINES
${highlights.upcomingDeadlines.map(d => `• ${d.title} (${new Date(d.dueAt).toLocaleDateString()})`).join('\n')}
`;
  }

  if (insights.length > 0) {
    text += `
INSIGHTS
${insights.map(i => `• ${i}`).join('\n')}
`;
  }

  if (weeklyGoals.length > 0) {
    text += `
GOALS FOR NEXT WEEK
${weeklyGoals.map(g => `• ${g}`).join('\n')}
`;
  }

  return text.trim();
}

// ========== Send Digest (placeholder - integrate with email service) ==========

export async function sendWeeklyDigest(
  options?: { userId?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = generateWeeklyDigest(options);
    const html = generateDigestHtml(data);
    const text = generateDigestText(data);

    // In production, integrate with email service (e.g., SendGrid, Resend, AWS SES)
    // For now, log the digest
    console.log("[Email Digest] Would send to:", data.user.email);
    console.log("[Email Digest] Text version:", text);

    // Example SendGrid integration:
    // await sendgrid.send({
    //   to: data.user.email,
    //   from: 'digest@organizer.app',
    //   subject: `Your Week ${data.period.weekNumber} Progress Report`,
    //   text,
    //   html,
    // });

    return { success: true };
  } catch (error) {
    console.error("[Email Digest] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ========== Digest Scheduler (for cron job) ==========

export function getUsersForDigest(): Array<{ userId: string; email: string }> {
  const db = getDb();

  // In production, filter by users who have enabled weekly digests
  // and whose preferred day/time matches current time
  const users = db
    .prepare(`SELECT id as userId, email FROM users WHERE email IS NOT NULL`)
    .all() as Array<{ userId: string; email: string }>;

  return users;
}

export async function sendAllDigests(): Promise<{
  sent: number;
  failed: number;
}> {
  const users = getUsersForDigest();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const result = await sendWeeklyDigest({ userId: user.userId });
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
