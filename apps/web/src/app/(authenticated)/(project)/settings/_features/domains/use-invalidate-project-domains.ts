import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateProjectDomains(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.domains.list.queryKey({
        projectId,
      }),
    });
    // The project query carries the legacy domain mirrored from the primary.
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.get.queryKey({ projectId }),
    });
  };
}
