"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Timer,
  Coffee,
  CheckCircle2,
  Flame,
  Clock,
  Target,
  Volume2,
  VolumeX,
} from "lucide-react";
import { clsx } from "clsx";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/Dialog";
import { VisuallyHidden } from "./ui/VisuallyHidden";

type FocusSession = {
  id: string;
  itemId?: string;
  startedAt: string;
  durationMinutes: number;
  type: "focus" | "break";
};

type FocusStats = {
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  completedSessions: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  itemTitle?: string;
};

export function FocusMode({ isOpen, onClose, itemId, itemTitle }: Props) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customMinutes, setCustomMinutes] = useState(25);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    if (isOpen) {
      fetch("/api/focus?action=stats")
        .then((res) => res.json())
        .then((data) => setStats(data.stats))
        .catch(console.error);

      // Check for active session
      fetch("/api/focus?action=active")
        .then((res) => res.json())
        .then((data) => {
          if (data.session) {
            setSession(data.session);
            setMode(data.session.type);
            // Calculate remaining time
            const elapsed = Math.floor(
              (Date.now() - new Date(data.session.startedAt).getTime()) / 1000
            );
            const remaining = data.session.durationMinutes * 60 - elapsed;
            setTimeLeft(Math.max(0, remaining));
            setIsRunning(remaining > 0);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);

    // Play sound
    if (soundEnabled) {
      try {
        audioRef.current = new Audio("/notification.mp3");
        audioRef.current.play().catch(() => {});
      } catch {}
    }

    // End session as completed
    if (session) {
      try {
        const res = await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            sessionId: session.id,
            completed: true,
          }),
        });
        const data = await res.json();
        setStats(data.stats);
        setSession(null);
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }

    // Suggest next action
    if (mode === "focus") {
      // Suggest break
      setMode("break");
      setTimeLeft(5 * 60);
    } else {
      // Suggest focus
      setMode("focus");
      setTimeLeft(25 * 60);
    }
  }, [session, mode, soundEnabled]);

  const startSession = async (type: "focus" | "break", minutes: number) => {
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          itemId: type === "focus" ? itemId : undefined,
          durationMinutes: minutes,
          type,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error(error);
        return;
      }

      const data = await res.json();
      setSession(data.session);
      setMode(type);
      setTimeLeft(minutes * 60);
      setIsRunning(true);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const pauseSession = () => {
    setIsRunning(false);
  };

  const resumeSession = () => {
    setIsRunning(true);
  };

  const resetSession = async () => {
    setIsRunning(false);
    setTimeLeft(mode === "focus" ? 25 * 60 : 5 * 60);

    // End session as not completed
    if (session) {
      try {
        await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            sessionId: session.id,
            completed: false,
          }),
        });
        setSession(null);
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progress = session
    ? ((session.durationMinutes * 60 - timeLeft) / (session.durationMinutes * 60)) * 100
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0b] border-white/[0.06]">
        <VisuallyHidden>
          <DialogTitle>Focus Mode</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col items-center py-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            {mode === "focus" ? (
              <Target size={20} className="text-purple-400" />
            ) : (
              <Coffee size={20} className="text-emerald-400" />
            )}
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {mode === "focus" ? "Focus Time" : "Break Time"}
            </span>
          </div>

          {/* Timer Display */}
          <div className="relative mb-8">
            {/* Progress Ring */}
            <svg className="w-48 h-48 -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/[0.06]"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={553}
                strokeDashoffset={553 - (553 * progress) / 100}
                className={clsx(
                  "transition-all duration-1000",
                  mode === "focus" ? "text-purple-500" : "text-emerald-500"
                )}
                strokeLinecap="round"
              />
            </svg>

            {/* Time */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-white font-mono">
                {formatTime(timeLeft)}
              </span>
              {itemTitle && mode === "focus" && (
                <span className="text-xs text-muted-foreground mt-2 max-w-[140px] truncate text-center">
                  {itemTitle}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-8">
            {!session ? (
              <>
                <button
                  onClick={() => startSession("focus", 25)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-all"
                >
                  <Play size={18} />
                  Focus (25m)
                </button>
                <button
                  onClick={() => startSession("break", 5)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] text-white font-medium hover:bg-white/[0.08] transition-all"
                >
                  <Coffee size={18} />
                  Break
                </button>
              </>
            ) : (
              <>
                {isRunning ? (
                  <button
                    onClick={pauseSession}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-white/[0.08] text-white hover:bg-white/[0.12] transition-all"
                  >
                    <Pause size={24} />
                  </button>
                ) : (
                  <button
                    onClick={resumeSession}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-all"
                  >
                    <Play size={24} />
                  </button>
                )}
                <button
                  onClick={resetSession}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.06] text-muted-foreground hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  <RotateCcw size={18} />
                </button>
              </>
            )}
          </div>

          {/* Quick Duration Options */}
          {!session && (
            <div className="flex gap-2 mb-6">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => startSession("focus", mins)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    customMinutes === mins
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 w-full px-4">
              <div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.04]">
                <Clock size={16} className="text-blue-400 mb-1" />
                <span className="text-lg font-bold text-white">
                  {Math.round(stats.todayMinutes)}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  Today (min)
                </span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.04]">
                <CheckCircle2 size={16} className="text-emerald-400 mb-1" />
                <span className="text-lg font-bold text-white">
                  {stats.completedSessions}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  Sessions
                </span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.04]">
                <Flame size={16} className="text-amber-400 mb-1" />
                <span className="text-lg font-bold text-white">
                  {stats.streak}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  Streak
                </span>
              </div>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-all"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating Focus Timer (for persistent display)
export function FloatingFocusTimer() {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Poll for active session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/focus?action=active");
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
          const elapsed = Math.floor(
            (Date.now() - new Date(data.session.startedAt).getTime()) / 1000
          );
          const remaining = data.session.durationMinutes * 60 - elapsed;
          setTimeLeft(Math.max(0, remaining));
        } else {
          setSession(null);
        }
      } catch {}
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown
  useEffect(() => {
    if (session && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session, timeLeft]);

  if (!session) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={clsx(
          "fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg z-50 transition-all",
          session.type === "focus"
            ? "bg-purple-500 text-white"
            : "bg-emerald-500 text-white"
        )}
      >
        {session.type === "focus" ? (
          <Target size={16} />
        ) : (
          <Coffee size={16} />
        )}
        <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
      </button>

      <FocusMode isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
