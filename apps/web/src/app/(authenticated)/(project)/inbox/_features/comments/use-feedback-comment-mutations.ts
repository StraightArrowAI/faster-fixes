import { useActiveProject } from "@/app/_features/project/active-project-provider.client";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Every comment write refreshes the open thread and the board's counts.
export function useFeedbackCommentMutations() {
  const { activeProject } = useActiveProject();
  const projectId = activeProject!.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.feedback.comments.list.pathKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.authenticated.projects.feedback.list.queryKey({
        projectId,
      }),
    });
  };

  const create = useMutation(
    trpc.authenticated.projects.feedback.comments.create.mutationOptions({
      onSuccess,
    }),
  );
  const bulkCreate = useMutation(
    trpc.authenticated.projects.feedback.comments.bulkCreate.mutationOptions({
      onSuccess,
    }),
  );
  const update = useMutation(
    trpc.authenticated.projects.feedback.comments.update.mutationOptions({
      onSuccess,
    }),
  );
  const remove = useMutation(
    trpc.authenticated.projects.feedback.comments.delete.mutationOptions({
      onSuccess,
    }),
  );

  return { create, bulkCreate, update, remove };
}
