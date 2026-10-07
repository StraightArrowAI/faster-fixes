import type { FeedbackTagsInput } from "@/server/domain-rules/feedback-tags.schema";
import { Badge } from "@workspace/ui/components/badge";

type FixedTagChipsProps = {
  tags: FeedbackTagsInput;
};

export function FixedTagChips({ tags }: FixedTagChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(tags).map(([key, value]) => (
        <Badge key={key} variant="outline" className="font-mono">
          {key}={value}
        </Badge>
      ))}
    </div>
  );
}
