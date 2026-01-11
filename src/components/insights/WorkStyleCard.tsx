"use client";

import { clsx } from "clsx";
import { Clock, Zap, Target, Calendar } from "lucide-react";

type WorkStyleData = {
  style: "sprinter" | "marathoner" | "balanced";
  characteristics: string[];
  strengths: string[];
  suggestions: string[];
};

interface WorkStyleCardProps {
  data: WorkStyleData | null;
  loading?: boolean;
}

const styleDetails = {
  sprinter: {
    title: "Sprinter",
    description: "You work best in intense, focused bursts",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  marathoner: {
    title: "Marathoner",
    description: "You maintain steady, consistent productivity",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  balanced: {
    title: "Balanced",
    description: "You adapt well to different work patterns",
    icon: Target,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
};

export function WorkStyleCard({ data, loading }: WorkStyleCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-32 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="h-24 bg-accent/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card text-center">
        <p className="text-sm text-muted-foreground">
          More activity needed to determine your work style.
        </p>
      </div>
    );
  }

  const details = styleDetails[data.style];
  const Icon = details.icon;

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-6">
        Your Work Style
      </h3>

      {/* Style Badge */}
      <div
        className={clsx(
          "flex items-center gap-4 p-4 rounded-lg border mb-6",
          details.bgColor,
          details.borderColor
        )}
      >
        <div className={clsx("p-3 rounded-lg", details.bgColor)}>
          <Icon size={24} className={details.color} />
        </div>
        <div>
          <h4 className={clsx("text-lg font-bold", details.color)}>
            {details.title}
          </h4>
          <p className="text-sm text-muted-foreground">{details.description}</p>
        </div>
      </div>

      {/* Characteristics */}
      {data.characteristics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Characteristics</p>
          <div className="flex flex-wrap gap-2">
            {data.characteristics.map((char, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-accent/30 text-foreground"
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Strengths</p>
          <ul className="space-y-1">
            {data.strengths.map((strength, i) => (
              <li
                key={i}
                className="text-sm text-foreground flex items-start gap-2"
              >
                <span className="text-emerald-400 mt-1">+</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-primary font-medium mb-2">
            Personalized Tips
          </p>
          <ul className="space-y-1">
            {data.suggestions.slice(0, 3).map((suggestion, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <Calendar size={12} className="text-primary mt-0.5 shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
