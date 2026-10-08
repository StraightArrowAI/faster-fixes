"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Check, ChevronDown, Copy } from "lucide-react";
import * as React from "react";

import type { GetReviewersOutput } from "./get-reviewers.trpc.query";

type CopyReviewerLinkMenuProps = {
  links: GetReviewersOutput[number]["links"];
};

export function CopyReviewerLinkMenu({ links }: CopyReviewerLinkMenuProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {copied ? (
            <>
              <Check className="text-success size-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy link
              <ChevronDown className="size-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {links.map((link) => (
          <DropdownMenuItem
            key={link.domainId}
            onSelect={() => handleCopy(link.shareUrl)}
          >
            <span className="font-mono text-xs">{link.host}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
