import { cookies } from "next/headers";
import { CreateCourseForm } from "../../../components/CreateCourseForm";
import { getSessionUserId } from "../../../lib/auth";
import { listCourses } from "../../../lib/courses";

export default async function CoursesPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  const courses = listCourses({ userId });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h2 className="text-sm font-semibold text-white">Courses</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Keep class details, instructors, and terms organized in one spot.
        </p>
      </section>
      <CreateCourseForm />
      <section className="grid gap-4 md:grid-cols-2">
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-xs text-muted-foreground md:col-span-2">
            No courses yet.
          </div>
        ) : (
          courses.map((course) => (
            <div
              key={course.id}
              className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5 hover:border-white/[0.1] transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Course
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">
                {course.name}
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {course.term ? (
                  <span className="rounded bg-white/[0.06] px-2 py-0.5">
                    {course.term}
                  </span>
                ) : null}
                {course.instructor ? (
                  <span className="rounded bg-white/[0.06] px-2 py-0.5">
                    {course.instructor}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
