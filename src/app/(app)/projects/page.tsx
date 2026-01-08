import { cookies } from "next/headers";
import { CreateProjectForm } from "../../../components/CreateProjectForm";
import { getSessionUserId } from "../../../lib/auth";
import { listProjects } from "../../../lib/projects";
import { CyclesManager } from "../../../components/CyclesManager";
import { TemplatesManager } from "../../../components/TemplatesManager";

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
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h2 className="text-sm font-semibold text-white">Projects</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Track initiative goals, focus areas, and long-term progress.
        </p>
      </section>
      <CreateProjectForm />
      <section className="grid gap-4 md:grid-cols-2">
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-xs text-muted-foreground md:col-span-2">
            No projects yet.
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5 hover:border-white/[0.1] transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Project
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">
                {project.name}
              </h3>
              {project.goal ? (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{project.goal}</p>
              ) : null}
              {project.area ? (
                <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {project.area}
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>

      {/* Cycles / Sprints */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <CyclesManager />
      </section>

      {/* Templates */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <TemplatesManager />
      </section>
    </div>
  );
}
