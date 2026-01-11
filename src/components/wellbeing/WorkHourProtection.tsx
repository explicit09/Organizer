"use client";

import { clsx } from "clsx";
import { Shield, Clock, Moon, Sun, AlertCircle } from "lucide-react";

type WorkHourData = {
  isWorkHours: boolean;
  currentHour: number;
  workStartHour: number;
  workEndHour: number;
  overtimeToday: number;
  overtimeThisWeek: number;
  protectionEnabled: boolean;
};

interface WorkHourProtectionProps {
  data: WorkHourData | null;
  loading?: boolean;
}

export function WorkHourProtection({ data, loading }: WorkHourProtectionProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-40 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="h-32 bg-accent/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  const defaultData: WorkHourData = data || {
    isWorkHours: true,
    currentHour: new Date().getHours(),
    workStartHour: 9,
    workEndHour: 17,
    overtimeToday: 0,
    overtimeThisWeek: 0,
    protectionEnabled: true,
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const workHours = defaultData.workEndHour - defaultData.workStartHour;
  const currentProgress =
    defaultData.isWorkHours && defaultData.currentHour >= defaultData.workStartHour
      ? ((defaultData.currentHour - defaultData.workStartHour) / workHours) * 100
      : defaultData.currentHour >= defaultData.workEndHour
        ? 100
        : 0;

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          Work Hours
        </h3>
        <span
          className={clsx(
            "text-xs px-2 py-1 rounded-full flex items-center gap-1",
            defaultData.isWorkHours
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-accent/30 text-muted-foreground"
          )}
        >
          {defaultData.isWorkHours ? (
            <>
              <Sun size={12} />
              Work Time
            </>
          ) : (
            <>
              <Moon size={12} />
              Off Hours
            </>
          )}
        </span>
      </div>

      {/* Time Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {formatHour(defaultData.workStartHour)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatHour(defaultData.workEndHour)}
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-accent/30 overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              defaultData.isWorkHours ? "bg-primary" : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(currentProgress, 100)}%` }}
          />
          {/* Current time marker */}
          {defaultData.isWorkHours && currentProgress < 100 && (
            <div
              className="absolute top-0 w-0.5 h-full bg-white"
              style={{ left: `${currentProgress}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Now: {formatHour(defaultData.currentHour)}
          </span>
          {defaultData.isWorkHours && (
            <span className="text-xs text-muted-foreground">
              {defaultData.workEndHour - defaultData.currentHour}h remaining
            </span>
          )}
        </div>
      </div>

      {/* Overtime Warning */}
      {(defaultData.overtimeToday > 0 || defaultData.overtimeThisWeek > 0) && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Overtime Detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                {defaultData.overtimeToday > 0 && (
                  <span>Today: {defaultData.overtimeToday}h extra</span>
                )}
                {defaultData.overtimeToday > 0 && defaultData.overtimeThisWeek > 0 && " · "}
                {defaultData.overtimeThisWeek > 0 && (
                  <span>This week: {defaultData.overtimeThisWeek}h extra</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Protection Status */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={clsx(
            "p-3 rounded-lg border",
            defaultData.protectionEnabled
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-border/50 bg-accent/5"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield
              size={14}
              className={
                defaultData.protectionEnabled ? "text-emerald-400" : "text-muted-foreground"
              }
            />
            <span className="text-xs text-muted-foreground">Focus Protection</span>
          </div>
          <p
            className={clsx(
              "text-sm font-medium",
              defaultData.protectionEnabled ? "text-emerald-400" : "text-muted-foreground"
            )}
          >
            {defaultData.protectionEnabled ? "Active" : "Disabled"}
          </p>
        </div>
        <div className="p-3 rounded-lg border border-border/50 bg-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Work Hours</span>
          </div>
          <p className="text-sm font-medium text-foreground">{workHours}h/day</p>
        </div>
      </div>

      {/* Quick Actions */}
      {!defaultData.isWorkHours && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            It&apos;s outside your work hours. Consider resting.
          </p>
        </div>
      )}
    </div>
  );
}
