import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createProject, listProjects } from "./projects";

describe("projects", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists projects", () => {
    createProject({ name: "LEARN-X", area: "Product" });
    expect(listProjects()).toHaveLength(1);
  });
});
