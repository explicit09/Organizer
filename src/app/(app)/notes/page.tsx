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
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Notes</h2>
        <p className="mt-2 text-sm text-stone-500">
          Capture ideas, reflections, and decisions.
        </p>
      </section>
      <CreateNoteForm />
      <section className="grid gap-4 md:grid-cols-2">
        {notes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 md:col-span-2">
            No notes yet.
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
                Note
              </div>
              <h3 className="mt-2 text-lg font-semibold text-stone-900">
                {note.title}
              </h3>
              {note.content ? (
                <p className="mt-3 text-sm text-stone-600">{note.content}</p>
              ) : null}
              {note.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-stone-100 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-stone-500"
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
