import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AutomationsManager } from "@/components/AutomationsManager";
import { Zap, Sparkles, Info } from "lucide-react";

export default async function AutomationsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create rules to automate repetitive tasks and keep your workflow efficient
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              AI-Powered Automations
            </h3>
            <p className="text-sm text-muted-foreground">
              Automations run automatically when triggers are matched. Set up rules like
              &quot;mark items as high priority when they become overdue&quot; or
              &quot;notify me when tasks are created in a specific project&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TipCard
          title="Triggers"
          description="Events that start the automation, like item creation or status changes"
          icon="trigger"
        />
        <TipCard
          title="Conditions"
          description="Optional filters to only run the automation for specific items"
          icon="filter"
        />
        <TipCard
          title="Actions"
          description="What happens when the automation runs - set status, priority, or notify"
          icon="action"
        />
      </div>

      {/* Automations Manager */}
      <AutomationsManager className="mt-6" />
    </div>
  );
}

function TipCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: "trigger" | "filter" | "action";
}) {
  const iconColors = {
    trigger: "text-amber-400 bg-amber-500/10",
    filter: "text-blue-400 bg-blue-500/10",
    action: "text-emerald-400 bg-emerald-500/10",
  };

  return (
    <div className="rounded-xl border border-border p-4 glass-card">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${iconColors[icon]} mb-3`}>
        {icon === "trigger" && <Zap size={16} />}
        {icon === "filter" && <Info size={16} />}
        {icon === "action" && <Sparkles size={16} />}
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
