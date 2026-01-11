"use client";

import { clsx } from "clsx";
import { AlertTriangle, TrendingDown, Shield, Heart } from "lucide-react";

type BurnoutData = {
  riskLevel: "low" | "moderate" | "high" | "critical";
  score: number;
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  trend: "improving" | "stable" | "declining";
};

interface BurnoutIndicatorProps {
  data: BurnoutData | null;
  loading?: boolean;
}

const riskDetails = {
  low: {
    label: "Low Risk",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500",
    borderColor: "border-emerald-500/30",
    bgGradient: "from-emerald-500/10 to-emerald-500/5",
    icon: Shield,
    message: "Great job maintaining work-life balance!",
  },
  moderate: {
    label: "Moderate",
    color: "text-amber-400",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-500/30",
    bgGradient: "from-amber-500/10 to-amber-500/5",
    icon: AlertTriangle,
    message: "Consider taking more breaks and setting boundaries",
  },
  high: {
    label: "High Risk",
    color: "text-orange-400",
    bgColor: "bg-orange-500",
    borderColor: "border-orange-500/30",
    bgGradient: "from-orange-500/10 to-orange-500/5",
    icon: AlertTriangle,
    message: "Your workload may be unsustainable. Please prioritize rest.",
  },
  critical: {
    label: "Critical",
    color: "text-rose-400",
    bgColor: "bg-rose-500",
    borderColor: "border-rose-500/30",
    bgGradient: "from-rose-500/10 to-rose-500/5",
    icon: Heart,
    message: "Immediate action recommended. Consider reducing workload.",
  },
};

export function BurnoutIndicator({ data, loading }: BurnoutIndicatorProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-40 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="h-32 bg-accent/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  const defaultData: BurnoutData = data || {
    riskLevel: "low",
    score: 25,
    factors: [],
    trend: "stable",
  };

  const details = riskDetails[defaultData.riskLevel];
  const Icon = details.icon;

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
        <Heart size={16} className="text-rose-400" />
        Burnout Risk Assessment
      </h3>

      {/* Risk Gauge */}
      <div
        className={clsx(
          "p-4 rounded-lg border mb-6 bg-gradient-to-br",
          details.borderColor,
          details.bgGradient
        )}
      >
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="hsl(228 10% 14%)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={details.bgColor}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(defaultData.score / 100) * 100.5} 100.5`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Icon size={16} className={details.color} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={clsx("text-lg font-bold", details.color)}>
                {details.label}
              </span>
              {defaultData.trend !== "stable" && (
                <span
                  className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                    defaultData.trend === "improving"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  )}
                >
                  <TrendingDown
                    size={10}
                    className={defaultData.trend === "improving" ? "rotate-180" : ""}
                  />
                  {defaultData.trend === "improving" ? "Improving" : "Declining"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{details.message}</p>
          </div>
        </div>
      </div>

      {/* Contributing Factors */}
      {defaultData.factors.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">Contributing Factors</p>
          <div className="space-y-2">
            {defaultData.factors.map((factor, i) => (
              <div
                key={i}
                className={clsx(
                  "flex items-start gap-2 p-2 rounded-lg border",
                  factor.impact === "positive"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : factor.impact === "negative"
                      ? "border-rose-500/20 bg-rose-500/5"
                      : "border-border/50 bg-accent/5"
                )}
              >
                <span
                  className={clsx(
                    "text-sm mt-0.5",
                    factor.impact === "positive"
                      ? "text-emerald-400"
                      : factor.impact === "negative"
                        ? "text-rose-400"
                        : "text-muted-foreground"
                  )}
                >
                  {factor.impact === "positive" ? "+" : factor.impact === "negative" ? "-" : "•"}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{factor.name}</p>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Scale */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground">Risk Scale</span>
        </div>
        <div className="flex gap-1">
          {["low", "moderate", "high", "critical"].map((level) => (
            <div
              key={level}
              className={clsx(
                "flex-1 h-2 rounded-full",
                level === defaultData.riskLevel
                  ? riskDetails[level as keyof typeof riskDetails].bgColor
                  : "bg-accent/30"
              )}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-emerald-400">Low</span>
          <span className="text-[10px] text-rose-400">Critical</span>
        </div>
      </div>
    </div>
  );
}
