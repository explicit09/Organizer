"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";

export function CreateCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [instructor, setInstructor] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          term: term || undefined,
          instructor: instructor || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Course creation failed");
      }
      setName("");
      setTerm("");
      setInstructor("");
      setStatus("Course added");
      router.refresh();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Course creation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">Add Course</h3>
            <p className="text-xs text-muted-foreground">Track your academic progress</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Course Name</Label>
            <Input
              placeholder="e.g. Advanced Calculus"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Term</Label>
              <Input
                placeholder="e.g. Fall 2024"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Instructor</Label>
              <Input
                placeholder="e.g. Prof. Smith"
                value={instructor}
                onChange={(event) => setInstructor(event.target.value)}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!name || isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? "Adding..." : "Add Course"}
        </Button>

        {status && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${status === "Course added"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/20 bg-rose-500/10 text-rose-400"
            }`}>
            {status === "Course added" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status}
          </div>
        )}
      </form>
    </Card>
  );
}
