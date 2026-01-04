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
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Courses</h2>
        <p className="mt-2 text-sm text-stone-500">
          Keep class details, instructors, and terms organized in one spot.
        </p>
      </section>
      <CreateCourseForm />
      <section className="grid gap-4 md:grid-cols-2">
        {courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 md:col-span-2">
            No courses yet.
          </div>
        ) : (
          courses.map((course) => (
            <div
              key={course.id}
              className="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
                Course
              </div>
              <h3 className="mt-2 text-lg font-semibold text-stone-900">
                {course.name}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-stone-400">
                {course.term ? (
                  <span className="rounded-full bg-stone-100 px-3 py-1">
                    {course.term}
                  </span>
                ) : null}
                {course.instructor ? (
                  <span className="rounded-full bg-stone-100 px-3 py-1">
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
