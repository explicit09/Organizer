import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { HabitsTracker } from "../../../components/HabitsTracker";
import { Repeat, Flame, Trophy, Target } from "lucide-react";

export default async function HabitsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Repeat size={14} />
            <span className="text-xs uppercase tracking-widest">Habits</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Build Consistency
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily habits and build positive routines
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Flame size={16} />
            <span className="text-xs uppercase tracking-wider">Current Streak</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete habits daily to build your streak
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Trophy size={16} />
            <span className="text-xs uppercase tracking-wider">Best Streak</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your longest consistency record
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Target size={16} />
            <span className="text-xs uppercase tracking-wider">Completion Rate</span>
          </div>
          <p className="text-sm text-muted-foreground">
            How often you hit your targets
          </p>
        </div>
      </div>

      {/* Main Tracker */}
      <HabitsTracker />
    </div>
  );
}
