"use client";

import { clsx } from "clsx";
import {
  Search,
  Code2,
  Target,
  Sparkles,
  Globe,
} from "lucide-react";

export type PlanMode = "research" | "code" | "planning" | "general";

type Props = {
  mode: PlanMode;
  onModeChange: (mode: PlanMode) => void;
};

const modes: Array<{
  id: PlanMode;
  label: string;
  icon: typeof Search;
  color: string;
  bgColor: string;
  description: string;
}> = [
  {
    id: "general",
    label: "General",
    icon: Sparkles,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    description: "General assistance",
  },
  {
    id: "research",
    label: "Research",
    icon: Globe,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    description: "Find opportunities",
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    description: "Analyze & implement",
  },
  {
    id: "planning",
    label: "Planning",
    icon: Target,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    description: "Create plans",
  },
];

export function PlannerModes({ mode, onModeChange }: Props) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
      {modes.map((m) => {
        const isActive = mode === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={clsx(
              "group relative flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
            title={m.description}
          >
            <Icon
              size={14}
              className={clsx(
                "transition-colors",
                isActive ? m.color : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="hidden sm:inline">{m.label}</span>
            
            {/* Active indicator */}
            {isActive && (
              <span className={clsx(
                "absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full",
                "bg-gradient-to-r from-primary to-[hsl(280_60%_55%)]"
              )} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Mode selector dropdown for mobile
export function PlannerModeSelector({ mode, onModeChange }: Props) {
  const currentMode = modes.find((m) => m.id === mode)!;
  const Icon = currentMode.icon;

  return (
    <div className="relative">
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as PlanMode)}
        className={clsx(
          "appearance-none pl-10 pr-8 py-2 rounded-lg",
          "bg-card border border-border",
          "text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
        )}
      >
        {modes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <Icon
        size={16}
        className={clsx("absolute left-3 top-1/2 -translate-y-1/2", currentMode.color)}
      />
    </div>
  );
}
