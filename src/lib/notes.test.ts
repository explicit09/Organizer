import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createNote, listNotes, updateNote } from "./notes";

describe("notes", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists notes", () => {
    createNote({ title: "Daily reflection", content: "Focus on CFA" });
    const notes = listNotes();
    expect(notes).toHaveLength(1);
  });

  it("updates notes", () => {
    const note = createNote({ title: "Draft", content: "v1" });
    const updated = updateNote(note.id, { title: "Final" });
    expect(updated.title).toBe("Final");
  });
});
