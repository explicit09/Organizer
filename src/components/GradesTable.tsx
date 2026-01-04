"use client";

import { useEffect, useState } from "react";

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
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-stone-100" />
        ))}
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
        No school items yet. Add assignments to track grades.
      </div>
    );
  }

  const gradeColor = (grade: number | null) => {
    if (grade === null) return "text-stone-400";
    if (grade >= 90) return "text-emerald-600";
    if (grade >= 80) return "text-teal-600";
    if (grade >= 70) return "text-amber-600";
    if (grade >= 60) return "text-orange-600";
    return "text-rose-600";
  };

  return (
    <div className="space-y-4">
      {grades.map((course) => (
        <div
          key={course.courseId}
          className="rounded-xl border border-stone-200 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
            <div>
              <div className="font-medium text-stone-900">{course.courseName}</div>
              <div className="text-xs text-stone-500">
                {course.completedCount}/{course.totalCount} completed
              </div>
            </div>
            <div className={`text-2xl font-semibold ${gradeColor(course.averageGrade)}`}>
              {course.averageGrade !== null ? `${Math.round(course.averageGrade)}%` : "—"}
            </div>
          </div>
          <div className="divide-y divide-stone-100">
            {course.items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.status === "completed" ? "bg-emerald-500" : "bg-stone-300"
                    }`}
                  />
                  <span className="text-stone-700 truncate">{item.title}</span>
                </div>
                <span className={gradeColor(item.grade ?? null)}>
                  {item.grade !== undefined ? `${item.grade}%` : "—"}
                </span>
              </div>
            ))}
            {course.items.length > 5 && (
              <div className="px-4 py-2 text-xs text-stone-500 text-center">
                +{course.items.length - 5} more items
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
