"use client";

import type { DomainRuleInput } from "@/server/domain-rules/match-request-host";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import * as React from "react";
import { FixedTagChips } from "./fixed-tag-chips";
import { getHostTestResult, parseTestHost } from "./get-host-test-result";

type HostTestBoxProps = {
  rules: DomainRuleInput[];
  draftIndex: number;
  mainDomain: string;
};

export function HostTestBox({
  rules,
  draftIndex,
  mainDomain,
}: HostTestBoxProps) {
  const [input, setInput] = React.useState("");
  const host = parseTestHost(input);
  const result = host ? getHostTestResult(host, rules, mainDomain) : null;

  function describeMatch(matchedIndex: number) {
    if (matchedIndex === -1) return "Main domain";
    if (matchedIndex === draftIndex) return "This rule";
    return `Rule ${matchedIndex + 1}: ${rules[matchedIndex]?.pattern}`;
  }

  return (
    <div className="bg-muted/50 flex flex-col gap-2 rounded-md border p-3">
      <Label htmlFor="domain-rule-test-host">Test a hostname</Label>
      <Input
        id="domain-rule-test-host"
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
            <Badge variant={result.match.allowed ? "secondary" : "destructive"}>
              {result.match.allowed ? "Allowed" : "Not allowed"}
            </Badge>
            {result.match.allowed && (
              <span className="text-muted-foreground truncate font-mono">
                {describeMatch(result.matchedIndex)}
              </span>
            )}
          </div>
          {result.match.allowed && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tags</span>
              {Object.keys(result.match.ruleTags).length > 0 ? (
                <FixedTagChips tags={result.match.ruleTags} />
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
