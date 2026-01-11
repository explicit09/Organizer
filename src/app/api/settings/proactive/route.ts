import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type ProactiveSettings = {
  enabled: boolean;
  suggestionFrequency: "low" | "medium" | "high";
  enabledTypes: {
    scheduling: boolean;
    prioritization: boolean;
    breakdown: boolean;
    reminders: boolean;
    insights: boolean;
  };
  learningEnabled: boolean;
};

const defaultSettings: ProactiveSettings = {
  enabled: true,
  suggestionFrequency: "medium",
  enabledTypes: {
    scheduling: true,
    prioritization: true,
    breakdown: true,
    reminders: true,
    insights: true,
  },
  learningEnabled: true,
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
      .get(userId, "proactive") as { value_json: string } | undefined;

    if (row) {
      return NextResponse.json(JSON.parse(row.value_json));
    }

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error("Error fetching proactive settings:", error);
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
    const settings: ProactiveSettings = {
      enabled: body.enabled ?? defaultSettings.enabled,
      suggestionFrequency: body.suggestionFrequency ?? defaultSettings.suggestionFrequency,
      enabledTypes: {
        scheduling: body.enabledTypes?.scheduling ?? defaultSettings.enabledTypes.scheduling,
        prioritization: body.enabledTypes?.prioritization ?? defaultSettings.enabledTypes.prioritization,
        breakdown: body.enabledTypes?.breakdown ?? defaultSettings.enabledTypes.breakdown,
        reminders: body.enabledTypes?.reminders ?? defaultSettings.enabledTypes.reminders,
        insights: body.enabledTypes?.insights ?? defaultSettings.enabledTypes.insights,
      },
      learningEnabled: body.learningEnabled ?? defaultSettings.learningEnabled,
    };

    const db = getDb();
    db.prepare(
      `INSERT INTO user_settings (user_id, key, value_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value_json = ?, updated_at = ?`
    ).run(
      userId,
      "proactive",
      JSON.stringify(settings),
      new Date().toISOString(),
      JSON.stringify(settings),
      new Date().toISOString()
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving proactive settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
