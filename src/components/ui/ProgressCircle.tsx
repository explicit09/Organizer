"use client";

interface ProgressCircleProps {
  progress: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressCircle({
  progress,
  color = "var(--primary)",
  size = 18,
  strokeWidth = 2,
  className = "",
}: ProgressCircleProps) {
  // Force integer geometry to avoid sub-pixel aliasing
  const s = Math.round(size);
  const r = Math.floor((s - strokeWidth) / 2);
  const cx = s / 2;
  const cy = s / 2;

  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(100, Math.max(0, progress)) / 100);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: s, height: s }}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />

        {/* Progress ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: "stroke-dashoffset 0.3s ease",
          }}
        />
      </svg>
    </div>
  );
}
