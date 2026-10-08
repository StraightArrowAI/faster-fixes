"use client";

import type {
  ProjectDomainInput,
  TagExtractorInput,
} from "@/server/domain-rules/match-request-host";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import * as React from "react";
import { FixedTagChips } from "./fixed-tag-chips";
import { getHostTestResult, parseTestHost } from "./get-host-test-result";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type HostTestBoxProps = {
  domains: (ProjectDomainInput & { url: string })[];
  extractors: TagExtractorInput[];
  draftIndex: number;
  fallbackDomain: string;
};

export function HostTestBox({
  domains,
  extractors,
  draftIndex,
  fallbackDomain,
}: HostTestBoxProps) {
  const [input, setInput] = React.useState("");
  const host = parseTestHost(input);
  const result = host
    ? getHostTestResult(host, { domains, extractors, fallbackDomain })
    : null;

  function describeAccess() {
    if (!result?.resolution.allowed) return "No domain matches this host";
    if (result.matchedDomain) return `Domain: ${result.matchedDomain.url}`;
    // Without a matching entry, only loopback or the legacy main domain (for a
    // Project that has no domain rows yet) can allow a host.
    return host && LOOPBACK_HOSTS.has(host) ? "Localhost" : "Main domain";
  }

  function describeExtractor(index: number) {
    if (index === -1) return "No extractor matches";
    if (index === draftIndex) return "This extractor";
    return `Extractor ${index + 1}: ${extractors[index]?.pattern}`;
  }

  return (
    <div className="bg-muted/50 flex flex-col gap-2 rounded-md border p-3">
      <Label htmlFor="tag-extractor-test-host">Test a hostname</Label>
      <Input
        id="tag-extractor-test-host"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="app.dev.example.com"
        className="bg-background font-mono"
      />
      {input.trim() && !host && (
        <p className="text-muted-foreground text-sm">Enter a valid hostname.</p>
      )}
      {result && (
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-14 shrink-0">Access</span>
            <Badge
              variant={result.resolution.allowed ? "secondary" : "destructive"}
            >
              {result.resolution.allowed ? "Allowed" : "Not allowed"}
            </Badge>
            <span className="text-muted-foreground truncate font-mono">
              {describeAccess()}
            </span>
          </div>
          {result.resolution.allowed && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0">
                  Match
                </span>
                <span className="text-muted-foreground truncate font-mono">
                  {describeExtractor(result.matchedExtractorIndex)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0">
                  Tags
                </span>
                {Object.keys(result.resolution.tags).length > 0 ? (
                  <FixedTagChips tags={result.resolution.tags} />
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
