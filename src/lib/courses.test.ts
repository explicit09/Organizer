import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createCourse, listCourses } from "./courses";

describe("courses", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists courses", () => {
    createCourse({ name: "Finance 101", term: "Spring" });
    expect(listCourses()).toHaveLength(1);
  });
});
