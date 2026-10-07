import { TRPCError } from "@trpc/server";

// The unique index on (projectId, pattern) is the source of truth; catching its
// violation avoids a check-then-write race that a pre-query would leave open.
export function rethrowPatternConflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This pattern already exists.",
    });
  }
  throw error;
}
