import { describe, expect, it } from "vitest";

import { describeMove, sharedSourceColumn } from "./describe-move";

describe("describeMove", () => {
  it("names the target for one card", () => {
    expect(describeMove(1, "Resolved")).toBe("Moved to Resolved");
  });

  it("counts several cards", () => {
    expect(describeMove(4, "Archived")).toBe("Moved 4 items to Archived");
  });
});

describe("sharedSourceColumn", () => {
  it("returns the column every card came from", () => {
    expect(sharedSourceColumn(["New", "New"])).toBe("New");
  });

  it("returns null when sources differ", () => {
    expect(sharedSourceColumn(["New", "In progress"])).toBeNull();
  });

  it("returns null when a source is unknown", () => {
    expect(sharedSourceColumn(["New", null])).toBeNull();
  });

  it("returns null for no cards", () => {
    expect(sharedSourceColumn([])).toBeNull();
  });
});
