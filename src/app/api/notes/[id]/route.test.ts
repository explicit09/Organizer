import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../lib/db";
import { POST as Create } from "../route";
import { GET, PATCH, DELETE } from "./route";

describe("note api by id", () => {
  beforeEach(() => {
    resetDb();
  });

  it("gets, updates, deletes a note", async () => {
    const createReq = new Request("http://localhost/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Draft", content: "v1" }),
    });
    const createRes = await Create(createReq);
    const created = await createRes.json();

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: created.note.id }),
    });
    expect(res.status).toBe(200);

    const patchReq = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ title: "Final" }),
    });
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: created.note.id }),
    });
    const patchBody = await patchRes.json();
    expect(patchBody.note.title).toBe("Final");

    const deleteRes = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: created.note.id }),
    });
    expect(deleteRes.status).toBe(204);
  });
});
