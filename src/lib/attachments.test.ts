import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createAttachment, listAttachments } from "./attachments";

describe("attachments", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists attachments", () => {
    createAttachment({
      name: "Syllabus.pdf",
      url: "https://example.com/syllabus.pdf",
    });
    const list = listAttachments();
    expect(list).toHaveLength(1);
  });
});
