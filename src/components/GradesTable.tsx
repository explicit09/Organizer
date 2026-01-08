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
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {grades.map((course) => (
        <div
          key={course.courseId}
          className={clsx(
            "rounded-xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden flex flex-col transition-all duration-200 hover:border-white/[0.1]",
            course.averageGrade !== null && course.averageGrade >= 90 && "border-emerald-500/20"
          )}
        >
          {/* Header Area */}
          <div className="p-5">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <GraduationCap size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Course</span>
                </div>
                <h3 className="text-base font-semibold text-white truncate">{course.courseName}</h3>
              </div>
              <div className="text-right shrink-0">
                <span className={clsx("text-3xl font-bold tabular-nums", getGradeColor(course.averageGrade))}>
                  {course.averageGrade !== null ? Math.round(course.averageGrade) : "—"}
                </span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/20 rounded-full transition-all duration-500"
                style={{ width: `${(course.completedCount / Math.max(course.totalCount, 1)) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{course.completedCount}/{course.totalCount}</span>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 border-t border-white/[0.04] bg-[#09090b] p-2 space-y-0.5">
            {course.items.slice(0, 4).map((item) => (
              <div key={item.id} className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.status === "completed" ? (
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Circle size={12} className="text-white/20 shrink-0" />
                  )}
                  <span className={clsx(
                    "text-sm truncate",
                    item.status === "completed" ? "text-muted-foreground line-through" : "text-white/80"
                  )}>
                    {item.title}
                  </span>
                </div>
                <span className={clsx("text-xs font-medium tabular-nums", getGradeColor(item.grade ?? null).split(' ')[0])}>
                  {item.grade !== undefined ? `${item.grade}%` : "—"}
                </span>
              </div>
            ))}
            {course.items.length > 4 && (
              <div className="px-3 py-2 text-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white cursor-pointer transition-colors">
                  +{course.items.length - 4} more
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
