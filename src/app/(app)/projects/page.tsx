import { cookies } from "next/headers";
import { CreateProjectForm } from "../../../components/CreateProjectForm";
import { getSessionUserId } from "../../../lib/auth";
import { listProjects } from "../../../lib/projects";

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  const projects = listProjects({ userId });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Projects</h2>
        <p className="mt-2 text-sm text-stone-500">
          Track initiative goals, focus areas, and long-term progress.
        </p>
      </section>
      <CreateProjectForm />
      <section className="grid gap-4 md:grid-cols-2">
        {projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 md:col-span-2">
            No projects yet.
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
                Project
              </div>
              <h3 className="mt-2 text-lg font-semibold text-stone-900">
                {project.name}
              </h3>
              {project.goal ? (
                <p className="mt-2 text-sm text-stone-600">{project.goal}</p>
              ) : null}
              {project.area ? (
                <div className="mt-4 text-xs uppercase tracking-[0.3em] text-stone-400">
                  {project.area}
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
