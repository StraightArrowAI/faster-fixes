import { parseProjectDomainUrl } from "@/server/domain-rules/project-domain-url";
import { TRPCError } from "@trpc/server";

export function parseProjectDomainUrlOrThrow(raw: string) {
  const result = parseProjectDomainUrl(raw);
  if (!result.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
  }
  return result;
}
