"use client";

import { EnvironmentBadge } from "@/app/(authenticated)/(project)/_features/environment/environment-badge";
import {
  EnvironmentColorSchema,
  type EnvironmentColorInput,
} from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const DEFAULT_OPTION = "default";

type EnvironmentColorRowProps = {
  environment: string;
  color: EnvironmentColorInput | undefined;
  canEdit: boolean;
  disabled: boolean;
  onColorChange: (color: EnvironmentColorInput | undefined) => void;
};

export function EnvironmentColorRow({
  environment,
  color,
  canEdit,
  disabled,
  onColorChange,
}: EnvironmentColorRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <EnvironmentBadge environment={environment} color={color} />
      {canEdit && (
        <Select
          value={color ?? DEFAULT_OPTION}
          onValueChange={(value) => {
            const parsed = EnvironmentColorSchema.safeParse(value);
            onColorChange(parsed.success ? parsed.data : undefined);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            size="sm"
            className="w-32"
            aria-label={`Color for ${environment}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_OPTION}>Default</SelectItem>
            {EnvironmentColorSchema.options.map((option) => (
              <SelectItem key={option} value={option}>
                <EnvironmentBadge
                  environment={option.charAt(0).toUpperCase() + option.slice(1)}
                  color={option}
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
