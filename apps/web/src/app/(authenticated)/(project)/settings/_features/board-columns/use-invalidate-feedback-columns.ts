import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQueryClient } from "@tanstack/react-query";

// Column edits change board grouping too, so the feedback list is refreshed
// alongside the column list.
export function useInvalidateFeedbackColumns(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.columns.list.queryKey({
        projectId,
      }),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.feedback.list.queryKey({
        projectId,
      }),
    });
  };
}
