"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Loader2,
} from "lucide-react";

type NotificationChannel = "in_app" | "email" | "push";

type NotificationSettingsData = {
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

const defaultSettings: NotificationSettingsData = {
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

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
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
      await fetch("/api/settings/notifications", {
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

  const toggleChannel = (channel: NotificationChannel) => {
    setSettings((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const toggleType = (type: keyof typeof settings.types) => {
    setSettings((prev) => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type],
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
      {/* Notification Channels */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          Notification Channels
        </label>
        <div className="grid grid-cols-3 gap-3">
          <ChannelCard
            icon={<Bell size={20} />}
            label="In-App"
            enabled={settings.channels.in_app}
            onToggle={() => toggleChannel("in_app")}
          />
          <ChannelCard
            icon={<Mail size={20} />}
            label="Email"
            enabled={settings.channels.email}
            onToggle={() => toggleChannel("email")}
          />
          <ChannelCard
            icon={<Smartphone size={20} />}
            label="Push"
            enabled={settings.channels.push}
            onToggle={() => toggleChannel("push")}
          />
        </div>
      </div>

      {/* Notification Types */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          Notification Types
        </label>
        <div className="space-y-2">
          {Object.entries(settings.types).map(([key, enabled]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <span className="text-sm text-foreground capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <button
                onClick={() => toggleType(key as keyof typeof settings.types)}
                className={clsx(
                  "relative w-11 h-6 rounded-full transition-colors",
                  enabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BellOff size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Quiet Hours</span>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled },
              }))
            }
            className={clsx(
              "relative w-11 h-6 rounded-full transition-colors",
              settings.quietHours.enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={clsx(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                settings.quietHours.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        {settings.quietHours.enabled && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <input
                type="time"
                value={settings.quietHours.start}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, start: e.target.value },
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <input
                type="time"
                value={settings.quietHours.end}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, end: e.target.value },
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Daily Digest */}
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Daily Digest</span>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                digest: { ...prev.digest, enabled: !prev.digest.enabled },
              }))
            }
            className={clsx(
              "relative w-11 h-6 rounded-full transition-colors",
              settings.digest.enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={clsx(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                settings.digest.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        {settings.digest.enabled && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
              <select
                value={settings.digest.frequency}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    digest: { ...prev.digest, frequency: e.target.value as "daily" | "weekly" },
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Time</label>
              <input
                type="time"
                value={settings.digest.time}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    digest: { ...prev.digest, time: e.target.value },
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
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

function ChannelCard({
  icon,
  label,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors",
        enabled
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent/10"
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
