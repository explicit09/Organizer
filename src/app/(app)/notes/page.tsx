import { cookies } from "next/headers";
import { CreateNoteForm } from "../../../components/CreateNoteForm";
import { getSessionUserId } from "../../../lib/auth";
import { listNotes } from "../../../lib/notes";

export default async function NotesPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  const notes = listNotes({ userId });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h2 className="text-sm font-semibold text-white">Notes</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Capture ideas, reflections, and decisions.
        </p>
      </section>
      <CreateNoteForm />
      <section className="grid gap-4 md:grid-cols-2">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-xs text-muted-foreground md:col-span-2">
            No notes yet.
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5 hover:border-white/[0.1] transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Note
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">
                {note.title}
              </h3>
              {note.content ? (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{note.content}</p>
              ) : null}
              {note.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
