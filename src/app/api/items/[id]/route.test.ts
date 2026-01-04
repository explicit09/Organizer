import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../lib/db";
import { createItem } from "../../../../lib/items";
import { DELETE, GET, PATCH } from "./route";

describe("item api by id", () => {
  beforeEach(() => {
    resetDb();
  });

  it("gets an item", async () => {
    const item = createItem({ type: "task", title: "Read book" });
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: item.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item.title).toBe("Read book");
  });

  it("updates an item", async () => {
    const item = createItem({ type: "task", title: "Draft notes" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: item.id }) });
    const body = await res.json();

    if (res.status !== 200) {
      throw new Error(body.error ?? "Update failed");
    }

    expect(res.status).toBe(200);
    expect(body.item.status).toBe("completed");
  });

  it("deletes an item", async () => {
    const item = createItem({ type: "task", title: "Remove me" });
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: item.id }),
    });

    expect(res.status).toBe(204);
  });
});
