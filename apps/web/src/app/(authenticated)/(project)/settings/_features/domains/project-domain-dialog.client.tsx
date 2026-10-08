"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import * as React from "react";
import { toast } from "sonner";

import type { GetProjectDomainsOutput } from "./get-project-domains.trpc.query";
import { ProjectDomainForm } from "./project-domain-form.client";
import type { ProjectDomainFormInput } from "./project-domain-form.schema";
import { useInvalidateProjectDomains } from "./use-invalidate-project-domains";

type ProjectDomain = GetProjectDomainsOutput["domains"][number];

type ProjectDomainDialogProps = {
  projectId: string;
  // Omitted when adding a domain.
  domain?: ProjectDomain;
  trigger: React.ReactNode;
};

export function ProjectDomainDialog({
  projectId,
  domain,
  trigger,
}: ProjectDomainDialogProps) {
  const trpc = useTRPC();
  const invalidate = useInvalidateProjectDomains(projectId);
  const [open, setOpen] = React.useState(false);

  const mutationCallbacks = {
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success(domain ? "Domain updated" : "Domain added");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createDomain = useMutation(
    trpc.authenticated.projects.domains.create.mutationOptions(
      mutationCallbacks,
    ),
  );
  const updateDomain = useMutation(
    trpc.authenticated.projects.domains.update.mutationOptions(
      mutationCallbacks,
    ),
  );

  function handleSubmit(values: ProjectDomainFormInput) {
    if (domain) {
      updateDomain.mutate({ domainId: domain.id, ...values });
    } else {
      createDomain.mutate({ projectId, ...values });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{domain ? "Edit domain" : "Add domain"}</DialogTitle>
          <DialogDescription>
            The widget accepts requests from this domain, and reviewers can be
            sent links to it.
          </DialogDescription>
        </DialogHeader>
        <ProjectDomainForm
          defaultValues={{
            url: domain?.url ?? "",
            includeSubdomains: domain?.includeSubdomains ?? false,
            environment: domain?.environment ?? "",
          }}
          submitLabel={domain ? "Save" : "Add domain"}
          isPending={createDomain.isPending || updateDomain.isPending}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
