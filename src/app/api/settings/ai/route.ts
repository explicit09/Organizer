import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type AIPreferences = {
  personality: "professional" | "friendly" | "concise";
  verbosity: "minimal" | "balanced" | "detailed";
  autoSuggestions: boolean;
  confirmActions: boolean;
  showReasoning: boolean;
  preferredModels: {
    chat: "fast" | "smart" | "balanced";
    planning: "fast" | "smart" | "balanced";
    analysis: "fast" | "smart" | "balanced";
  };
};

const defaultPreferences: AIPreferences = {
  personality: "friendly",
  verbosity: "balanced",
  autoSuggestions: true,
  confirmActions: true,
  showReasoning: false,
  preferredModels: {
    chat: "balanced",
    planning: "smart",
    analysis: "smart",
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
      .get(userId, "ai") as { value_json: string } | undefined;

    if (row) {
      return NextResponse.json(JSON.parse(row.value_json));
    }

    return NextResponse.json(defaultPreferences);
  } catch (error) {
    console.error("Error fetching AI preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
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
    const preferences: AIPreferences = {
      personality: body.personality ?? defaultPreferences.personality,
      verbosity: body.verbosity ?? defaultPreferences.verbosity,
      autoSuggestions: body.autoSuggestions ?? defaultPreferences.autoSuggestions,
      confirmActions: body.confirmActions ?? defaultPreferences.confirmActions,
      showReasoning: body.showReasoning ?? defaultPreferences.showReasoning,
      preferredModels: {
        chat: body.preferredModels?.chat ?? defaultPreferences.preferredModels.chat,
        planning: body.preferredModels?.planning ?? defaultPreferences.preferredModels.planning,
        analysis: body.preferredModels?.analysis ?? defaultPreferences.preferredModels.analysis,
      },
    };

    const db = getDb();
    db.prepare(
      `INSERT INTO user_settings (user_id, key, value_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value_json = ?, updated_at = ?`
    ).run(
      userId,
      "ai",
      JSON.stringify(preferences),
      new Date().toISOString(),
      JSON.stringify(preferences),
      new Date().toISOString()
    );

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error saving AI preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
