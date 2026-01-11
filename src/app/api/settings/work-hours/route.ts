import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

type WorkHoursSettings = {
  schedule: Record<string, DaySchedule>;
  focusProtection: {
    enabled: boolean;
    blockMeetings: boolean;
    reduceNotifications: boolean;
    focusHours: { start: string; end: string };
  };
  breaks: {
    enabled: boolean;
    interval: number;
    duration: number;
  };
};

const defaultSettings: WorkHoursSettings = {
  schedule: {
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "10:00", end: "14:00" },
    sunday: { enabled: false, start: "10:00", end: "14:00" },
  },
  focusProtection: {
    enabled: true,
    blockMeetings: false,
    reduceNotifications: true,
    focusHours: { start: "09:00", end: "12:00" },
  },
  breaks: {
    enabled: true,
    interval: 90,
    duration: 15,
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
      .get(userId, "work-hours") as { value_json: string } | undefined;

    if (row) {
      return NextResponse.json(JSON.parse(row.value_json));
    }

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error("Error fetching work hours settings:", error);
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

    // Merge schedule with defaults
    const schedule: Record<string, DaySchedule> = {};
    for (const day of Object.keys(defaultSettings.schedule)) {
      schedule[day] = {
        enabled: body.schedule?.[day]?.enabled ?? defaultSettings.schedule[day].enabled,
        start: body.schedule?.[day]?.start ?? defaultSettings.schedule[day].start,
        end: body.schedule?.[day]?.end ?? defaultSettings.schedule[day].end,
      };
    }

    const settings: WorkHoursSettings = {
      schedule,
      focusProtection: {
        enabled: body.focusProtection?.enabled ?? defaultSettings.focusProtection.enabled,
        blockMeetings: body.focusProtection?.blockMeetings ?? defaultSettings.focusProtection.blockMeetings,
        reduceNotifications: body.focusProtection?.reduceNotifications ?? defaultSettings.focusProtection.reduceNotifications,
        focusHours: {
          start: body.focusProtection?.focusHours?.start ?? defaultSettings.focusProtection.focusHours.start,
          end: body.focusProtection?.focusHours?.end ?? defaultSettings.focusProtection.focusHours.end,
        },
      },
      breaks: {
        enabled: body.breaks?.enabled ?? defaultSettings.breaks.enabled,
        interval: body.breaks?.interval ?? defaultSettings.breaks.interval,
        duration: body.breaks?.duration ?? defaultSettings.breaks.duration,
      },
    };

    const db = getDb();
    db.prepare(
      `INSERT INTO user_settings (user_id, key, value_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value_json = ?, updated_at = ?`
    ).run(
      userId,
      "work-hours",
      JSON.stringify(settings),
      new Date().toISOString(),
      JSON.stringify(settings),
      new Date().toISOString()
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving work hours settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
