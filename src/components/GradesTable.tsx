"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { GraduationCap, CheckCircle2, Circle, Trophy } from "lucide-react";
import { clsx } from "clsx";

type Course = {
  id: string;
  name: string;
};

type SchoolItem = {
  id: string;
  title: string;
  courseId?: string;
  grade?: number;
  gradeWeight?: number;
  status: string;
};

type CourseGrade = {
  courseId: string;
  courseName: string;
  items: SchoolItem[];
  averageGrade: number | null;
  completedCount: number;
  totalCount: number;
};

export function GradesTable() {
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch both items and courses
    Promise.all([
      fetch("/api/items?type=school").then((res) => res.json()),
      fetch("/api/courses").then((res) => res.json()),
    ])
      .then(([itemsData, coursesData]) => {
        const items: SchoolItem[] = itemsData.items ?? [];
        const courses: Course[] = coursesData.courses ?? [];

        // Create course name lookup
        const courseMap = new Map<string, string>();
        for (const course of courses) {
          courseMap.set(course.id, course.name);
        }

        // Group by course and calculate grades
        const byCourse = new Map<string, CourseGrade>();

        for (const item of items) {
          const courseId = item.courseId ?? "uncategorized";
          const courseName = courseMap.get(courseId) ?? "Uncategorized";

          if (!byCourse.has(courseId)) {
            byCourse.set(courseId, {
              courseId,
              courseName,
              items: [],
              averageGrade: null,
              completedCount: 0,
              totalCount: 0,
            });
          }

          const course = byCourse.get(courseId)!;
          course.items.push(item);
          course.totalCount++;
          if (item.status === "completed") {
            course.completedCount++;
          }
        }

        // Calculate weighted averages
        for (const course of byCourse.values()) {
          const graded = course.items.filter((i) => i.grade !== undefined);
          if (graded.length > 0) {
            const totalWeight = graded.reduce((sum, i) => sum + (i.gradeWeight ?? 1), 0);
            const weightedSum = graded.reduce(
              (sum, i) => sum + (i.grade ?? 0) * (i.gradeWeight ?? 1),
              0
            );
            course.averageGrade = weightedSum / totalWeight;
          }
        }

        setGrades(Array.from(byCourse.values()));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse grid gap-4 grid-cols-1 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-3xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <Card className="border-dashed border-white/10 bg-white/5 py-12 flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-white/5 text-muted-foreground">
          <GraduationCap size={32} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white mb-1">No courses found</h3>
          <p className="text-sm text-muted-foreground">Add assignments to track your academic performance.</p>
        </div>
      </Card>
    );
  }

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return "text-muted-foreground";
    if (grade >= 90) return "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]";
    if (grade >= 80) return "text-teal-400";
    if (grade >= 70) return "text-amber-400";
    if (grade >= 60) return "text-orange-400";
    return "text-rose-400";
  };

  const getCardGlow = (grade: number | null) => {
    if (grade !== null && grade >= 90) return "shadow-[0_0_30px_rgba(52,211,153,0.1)] border-emerald-500/20";
    return "";
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {grades.map((course) => (
        <div
          key={course.courseId}
          className={clsx(
            "rounded-2xl border transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl",
            course.averageGrade !== null && course.averageGrade >= 90
              ? "border-emerald-500/30 bg-emerald-500/[0.03] shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)]"
              : "border-white/[0.05] glass-heavy"
          )}
        >
          {/* Header Area */}
          <div className="p-6 relative overflow-hidden">
            {/* Background Gradient for High Grades */}
            {course.averageGrade !== null && course.averageGrade >= 90 && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none -mr-10 -mt-10" />
            )}

            <div className="flex justify-between items-start gap-4 relative">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-white/5 border border-white/5">
                    <GraduationCap size={14} className="text-muted-foreground shrink-0" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Course</span>
                </div>
                <h3 className="text-lg font-semibold text-white truncate tracking-tight">{course.courseName}</h3>
              </div>
              <div className="text-right shrink-0">
                <div className={clsx("flex items-baseline justify-end", getGradeColor(course.averageGrade))}>
                  <span className="text-4xl font-bold tabular-nums tracking-tighter">
                    {course.averageGrade !== null ? Math.round(course.averageGrade) : "—"}
                  </span>
                  <span className="text-base text-muted-foreground font-medium ml-1">%</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 relative">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                <span>Completion Status</span>
                <span className="text-white">{Math.round((course.completedCount / Math.max(course.totalCount, 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_var(--primary)]"
                  style={{ width: `${(course.completedCount / Math.max(course.totalCount, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* List Area */}
          <div className="border-t border-white/[0.05] bg-black/20 p-2 space-y-1">
            {course.items.slice(0, 4).map((item) => (
              <div key={item.id} className="group/item flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {item.status === "completed" ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-white/10 group-hover/item:text-white/30 transition-colors shrink-0" />
                  )}
                  <span className={clsx(
                    "text-sm truncate transition-colors",
                    item.status === "completed" ? "text-muted-foreground line-through decoration-white/20" : "text-white/80 group-hover/item:text-white"
                  )}>
                    {item.title}
                  </span>
                </div>
                <span className={clsx("text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md bg-white/5 min-w-[3rem] text-center", getGradeColor(item.grade ?? null).split(' ')[0])}>
                  {item.grade !== undefined ? `${item.grade}%` : "—"}
                </span>
              </div>
            ))}
            {course.items.length > 4 && (
              <button className="w-full text-center py-2 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hover:text-white/80 hover:bg-white/[0.02] transition-colors rounded-lg">
                View {course.items.length - 4} more items
              </button>
            )}
            {course.items.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground/50 italic">
                No items recorded
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
