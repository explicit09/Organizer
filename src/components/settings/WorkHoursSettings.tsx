"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Clock, Sun, Moon, Coffee, Shield, Loader2 } from "lucide-react";

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

type WorkHoursSettingsData = {
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

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const defaultSettings: WorkHoursSettingsData = {
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

export function WorkHoursSettings() {
  const [settings, setSettings] = useState<WorkHoursSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/work-hours")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/work-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], enabled: !prev.schedule[day].enabled },
      },
    }));
  };

  const updateDayTime = (day: string, field: "start" | "end", value: string) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Schedule */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
          <Clock size={14} />
          Work Schedule
        </label>
        <div className="space-y-2">
          {days.map((day) => (
            <div
              key={day}
              className={clsx(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                settings.schedule[day].enabled
                  ? "border-border"
                  : "border-border/50 opacity-60"
              )}
            >
              <button
                onClick={() => toggleDay(day)}
                className={clsx(
                  "w-12 text-sm font-medium transition-colors",
                  settings.schedule[day].enabled ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {dayLabels[day]}
              </button>
              <button
                onClick={() => toggleDay(day)}
                className={clsx(
                  "relative w-10 h-5 rounded-full transition-colors",
                  settings.schedule[day].enabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    settings.schedule[day].enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
              {settings.schedule[day].enabled && (
                <>
                  <input
                    type="time"
                    value={settings.schedule[day].start}
                    onChange={(e) => updateDayTime(day, "start", e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={settings.schedule[day].end}
                    onChange={(e) => updateDayTime(day, "end", e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Focus Protection */}
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Focus Protection</span>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                focusProtection: {
                  ...prev.focusProtection,
                  enabled: !prev.focusProtection.enabled,
                },
              }))
            }
            className={clsx(
              "relative w-11 h-6 rounded-full transition-colors",
              settings.focusProtection.enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={clsx(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                settings.focusProtection.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {settings.focusProtection.enabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Focus Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={settings.focusProtection.focusHours.start}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        focusProtection: {
                          ...prev.focusProtection,
                          focusHours: {
                            ...prev.focusProtection.focusHours,
                            start: e.target.value,
                          },
                        },
                      }))
                    }
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="time"
                    value={settings.focusProtection.focusHours.end}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        focusProtection: {
                          ...prev.focusProtection,
                          focusHours: {
                            ...prev.focusProtection.focusHours,
                            end: e.target.value,
                          },
                        },
                      }))
                    }
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.focusProtection.blockMeetings}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      focusProtection: {
                        ...prev.focusProtection,
                        blockMeetings: !prev.focusProtection.blockMeetings,
                      },
                    }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Block meeting scheduling</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.focusProtection.reduceNotifications}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      focusProtection: {
                        ...prev.focusProtection,
                        reduceNotifications: !prev.focusProtection.reduceNotifications,
                      },
                    }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Reduce notifications</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Break Reminders */}
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coffee size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-foreground">Break Reminders</span>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                breaks: { ...prev.breaks, enabled: !prev.breaks.enabled },
              }))
            }
            className={clsx(
              "relative w-11 h-6 rounded-full transition-colors",
              settings.breaks.enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={clsx(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                settings.breaks.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {settings.breaks.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Remind every
              </label>
              <select
                value={settings.breaks.interval}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    breaks: { ...prev.breaks, interval: parseInt(e.target.value) },
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Break duration
              </label>
              <select
                value={settings.breaks.duration}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    breaks: { ...prev.breaks, duration: parseInt(e.target.value) },
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Save Changes
      </button>
    </div>
  );
}
