"use client";

import type { GetProjectDomainsOutput } from "@/app/(authenticated)/(project)/settings/_features/domains/get-project-domains.trpc.query";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";

type ReviewerLinkDomain = GetProjectDomainsOutput["domains"][number];

type ReviewerLinkDomainsChecklistProps = {
  id: string;
  domains: ReviewerLinkDomain[];
  value: string[];
  onChange: (domainIds: string[]) => void;
  disabled?: boolean;
};

export function ReviewerLinkDomainsChecklist({
  id,
  domains,
  value,
  onChange,
  disabled,
}: ReviewerLinkDomainsChecklistProps) {
  const toggle = (domainId: string, checked: boolean) => {
    onChange(
      checked
        ? [...value, domainId]
        : value.filter((selectedId) => selectedId !== domainId),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {domains.map((domain) => {
        const checkboxId = `${id}-${domain.id}`;
        return (
          <div key={domain.id} className="flex items-center gap-2">
            <Checkbox
              id={checkboxId}
              // The primary link is the one every reviewer gets, so it stays on.
              checked={domain.isPrimary || value.includes(domain.id)}
              disabled={disabled || domain.isPrimary}
              onCheckedChange={(checked) => toggle(domain.id, checked === true)}
            />
            <Label
              htmlFor={checkboxId}
              className="flex min-w-0 items-center gap-2 font-normal"
            >
              <span className="truncate">{domain.host}</span>
              {domain.isPrimary && (
                <span className="text-muted-foreground text-xs">Primary</span>
              )}
              {domain.environment && (
                <span className="text-muted-foreground text-xs">
                  {domain.environment}
                </span>
              )}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
