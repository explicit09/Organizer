"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FolderKanban, CheckCircle2, AlertCircle } from "lucide-react";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area: area || undefined,
          goal: goal || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Project creation failed");
      }
      setName("");
      setArea("");
      setGoal("");
      setStatus("Project added");
      router.refresh();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Project creation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
            <FolderKanban size={20} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">Add Project</h3>
            <p className="text-xs text-muted-foreground">Start a new initiative</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Project Name</Label>
            <Input
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Area</Label>
              <Input
                placeholder="e.g. Marketing"
                value={area}
                onChange={(event) => setArea(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Associated Goal</Label>
              <Input
                placeholder="e.g. Increase traffic"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!name || isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? "Adding..." : "Add Project"}
        </Button>

        {status && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${status === "Project added"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/20 bg-rose-500/10 text-rose-400"
            }`}>
            {status === "Project added" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status}
          </div>
        )}
      </form>
    </Card>
  );
}
