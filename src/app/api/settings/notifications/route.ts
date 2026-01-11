import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type NotificationSettings = {
  channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
  };
  types: {
    reminders: boolean;
    deadlines: boolean;
    suggestions: boolean;
    completions: boolean;
    mentions: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  digest: {
    enabled: boolean;
    frequency: "daily" | "weekly";
    time: string;
  };
};

const defaultSettings: NotificationSettings = {
  channels: {
    in_app: true,
    email: true,
    push: false,
  },
  types: {
    reminders: true,
    deadlines: true,
    suggestions: true,
    completions: false,
    mentions: true,
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
  digest: {
    enabled: true,
    frequency: "daily",
    time: "09:00",
  },
};

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const row = db
      .prepare("SELECT value_json FROM user_settings WHERE user_id = ? AND key = ?")
      .get(userId, "notifications") as { value_json: string } | undefined;

    if (row) {
      return NextResponse.json(JSON.parse(row.value_json));
    }

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const settings: NotificationSettings = {
      channels: {
        in_app: body.channels?.in_app ?? defaultSettings.channels.in_app,
        email: body.channels?.email ?? defaultSettings.channels.email,
        push: body.channels?.push ?? defaultSettings.channels.push,
      },
      types: {
        reminders: body.types?.reminders ?? defaultSettings.types.reminders,
        deadlines: body.types?.deadlines ?? defaultSettings.types.deadlines,
        suggestions: body.types?.suggestions ?? defaultSettings.types.suggestions,
        completions: body.types?.completions ?? defaultSettings.types.completions,
        mentions: body.types?.mentions ?? defaultSettings.types.mentions,
      },
      quietHours: {
        enabled: body.quietHours?.enabled ?? defaultSettings.quietHours.enabled,
        start: body.quietHours?.start ?? defaultSettings.quietHours.start,
        end: body.quietHours?.end ?? defaultSettings.quietHours.end,
      },
      digest: {
        enabled: body.digest?.enabled ?? defaultSettings.digest.enabled,
        frequency: body.digest?.frequency ?? defaultSettings.digest.frequency,
        time: body.digest?.time ?? defaultSettings.digest.time,
      },
    };

    const db = getDb();
    db.prepare(
      `INSERT INTO user_settings (user_id, key, value_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value_json = ?, updated_at = ?`
    ).run(
      userId,
      "notifications",
      JSON.stringify(settings),
      new Date().toISOString(),
      JSON.stringify(settings),
      new Date().toISOString()
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving notification settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
