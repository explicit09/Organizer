import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { listActivity } from "./activity";
import { listItems } from "./items";
import { seedSampleData } from "./seed";

describe("seed sample data", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates items and activity entries", () => {
    seedSampleData();

    expect(listItems().length).toBeGreaterThan(0);
    expect(listActivity().length).toBeGreaterThan(0);
  });
});
