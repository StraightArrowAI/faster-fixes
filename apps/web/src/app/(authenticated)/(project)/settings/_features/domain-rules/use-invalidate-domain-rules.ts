import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateDomainRules(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.tagExtractors.list.queryKey({
        projectId,
      }),
    });
  };
}
