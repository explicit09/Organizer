"use client";

import * as React from "react";
import { clsx } from "clsx";

// ============================================
// BAR CHART
// ============================================

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animate?: boolean;
  className?: string;
}

export function BarChart({
  data,
  height = 120,
  showLabels = true,
  showValues = true,
  animate = true,
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  
  const defaultColors = [
    "hsl(238 65% 62%)",
    "hsl(142 65% 48%)",
    "hsl(45 95% 55%)",
    "hsl(200 80% 55%)",
    "hsl(280 60% 55%)",
    "hsl(25 95% 55%)",
  ];

  return (
    <div className={clsx("w-full", className)}>
      <div
        className="flex items-end gap-2"
        style={{ height }}
      >
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const color = item.color || defaultColors[index % defaultColors.length];
          
          return (
            <div
              key={item.label}
              className="flex-1 flex flex-col items-center gap-1"
            >
              {showValues && (
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {item.value}
                </span>
              )}
              <div
                className={clsx(
                  "w-full rounded-t-md transition-all duration-500 ease-out",
                  animate && "animate-in slide-in-from-bottom"
                )}
                style={{
                  height: `${percentage}%`,
                  minHeight: item.value > 0 ? 4 : 0,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                  animationDelay: `${index * 50}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
      
      {showLabels && (
        <div className="flex gap-2 mt-2">
          {data.map((item) => (
            <div key={item.label} className="flex-1 text-center">
              <span className="text-[10px] text-muted-foreground truncate block">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// DONUT CHART
// ============================================

interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
  animate?: boolean;
  className?: string;
}

export function DonutChart({
  data,
  size = 120,
  strokeWidth = 12,
  centerLabel,
  centerValue,
  animate = true,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <div className={clsx("relative inline-flex", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(228 10% 14%)"
          strokeWidth={strokeWidth}
        />
        
        {/* Data segments */}
        {data.map((segment, index) => {
          const percentage = total > 0 ? segment.value / total : 0;
          const dashLength = circumference * percentage;
          const dashOffset = circumference * (1 - currentOffset / total) - circumference * 0.25;
          
          currentOffset += segment.value;
          
          return (
            <circle
              key={segment.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              className={clsx(
                animate && "transition-all duration-700 ease-out"
              )}
              style={{
                transformOrigin: "center",
                animationDelay: `${index * 100}ms`,
              }}
            />
          );
        })}
      </svg>
      
      {/* Center content */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-xl font-bold text-foreground tabular-nums">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MINI SPARKLINE
// ============================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  color = "hsl(238 65% 62%)",
  showArea = true,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {showArea && (
        <path
          d={areaPath}
          fill={`${color}20`}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r={3}
        fill={color}
      />
    </svg>
  );
}

// ============================================
// PROGRESS RING (Enhanced)
// ============================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  gradient?: boolean;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  gradient = true,
  label,
  showPercentage = true,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(100, Math.max(0, progress)) / 100);
  const center = size / 2;
  
  const gradientId = `progress-gradient-${React.useId()}`;

  return (
    <div className={clsx("relative inline-flex", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(238 65% 62%)" />
              <stop offset="100%" stopColor="hsl(280 60% 55%)" />
            </linearGradient>
          </defs>
        )}
        
        {/* Background */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(228 10% 14%)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : "hsl(238 65% 62%)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-lg font-bold text-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        )}
        {label && (
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPARISON BAR
// ============================================

interface ComparisonBarProps {
  current: number;
  previous: number;
  label?: string;
  showChange?: boolean;
  className?: string;
}

export function ComparisonBar({
  current,
  previous,
  label,
  showChange = true,
  className,
}: ComparisonBarProps) {
  const max = Math.max(current, previous, 1);
  const currentPercent = (current / max) * 100;
  const previousPercent = (previous / max) * 100;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className={clsx("space-y-2", className)}>
      {(label || showChange) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showChange && (
            <span
              className={clsx(
                "font-medium",
                isPositive ? "text-[hsl(142_65%_48%)]" : "text-destructive"
              )}
            >
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      
      <div className="space-y-1">
        {/* Current */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Current</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(238_65%_62%)] to-[hsl(280_60%_55%)] transition-all duration-500"
              style={{ width: `${currentPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">{current}</span>
        </div>
        
        {/* Previous */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Previous</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-muted-foreground/40 transition-all duration-500"
              style={{ width: `${previousPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{previous}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LEGEND
// ============================================

interface LegendItem {
  label: string;
  color: string;
  value?: number | string;
}

interface LegendProps {
  items: LegendItem[];
  direction?: "horizontal" | "vertical";
  className?: string;
}

export function Legend({
  items,
  direction = "horizontal",
  className,
}: LegendProps) {
  return (
    <div
      className={clsx(
        "flex gap-4",
        direction === "vertical" && "flex-col gap-2",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-xs font-medium text-foreground tabular-nums">
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
