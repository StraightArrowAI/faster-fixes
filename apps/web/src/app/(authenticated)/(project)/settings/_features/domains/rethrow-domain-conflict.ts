import { TRPCError } from "@trpc/server";

// The unique index on (projectId, host) is the source of truth; catching its
// violation avoids a check-then-write race that a pre-query would leave open.
export function rethrowDomainConflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This domain is already in the list.",
    });
  }
  throw error;
}
