import { describe, expect, it } from "vitest";

import {
  ARCHIVED_COLUMN_NAME,
  findColumnByReference,
  resolveBoardColumn,
  transitionTargetName,
} from "./board-columns";

const columns = [
  { id: "c-new", name: "New", category: "new", position: 0 },
  { id: "c-prog", name: "In Progress", category: "in_progress", position: 1 },
  { id: "c-test", name: "In Test", category: "in_progress", position: 2 },
  { id: "c-done", name: "Resolved", category: "resolved", position: 3 },
];

describe("resolveBoardColumn", () => {
  it("returns the pinned column when it matches the status", () => {
    expect(
      resolveBoardColumn(columns, { columnId: "c-test", status: "in_progress" })
        ?.id,
    ).toBe("c-test");
  });

  it("falls back to the first column of the category", () => {
    expect(
      resolveBoardColumn(columns, { columnId: null, status: "in_progress" })
        ?.id,
    ).toBe("c-prog");
  });

  it("ignores a stale pin from another category", () => {
    expect(
      resolveBoardColumn(columns, { columnId: "c-test", status: "resolved" })
        ?.id,
    ).toBe("c-done");
  });

  it("returns null for archived feedback", () => {
    expect(
      resolveBoardColumn(columns, { columnId: null, status: "closed" }),
    ).toBeNull();
  });
});

describe("findColumnByReference", () => {
  it("matches an id", () => {
    expect(findColumnByReference(columns, "c-test")?.name).toBe("In Test");
  });

  it("matches a name case-insensitively and ignores surrounding space", () => {
    expect(findColumnByReference(columns, "  in test ")?.id).toBe("c-test");
  });

  it("returns null when nothing matches", () => {
    expect(findColumnByReference(columns, "QA")).toBeNull();
  });
});

describe("transitionTargetName", () => {
  it("names the first column of a status", () => {
    expect(transitionTargetName(columns, "in_progress")).toBe("In Progress");
  });

  it("names archive", () => {
    expect(transitionTargetName(columns, "closed")).toBe(ARCHIVED_COLUMN_NAME);
  });
});
