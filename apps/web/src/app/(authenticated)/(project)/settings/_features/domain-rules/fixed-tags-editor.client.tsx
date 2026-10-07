"use client";

import { Button } from "@workspace/ui/components/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Plus, X } from "lucide-react";
import { useFieldArray, type Control } from "react-hook-form";
import type { DomainRuleFormInput } from "./domain-rule-form.schema";

const MAX_FIXED_TAGS = 10;

type FixedTagsEditorProps = {
  control: Control<DomainRuleFormInput>;
  disabled: boolean;
};

export function FixedTagsEditor({ control, disabled }: FixedTagsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "fixedTags",
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label>Fixed tags</Label>
        <p className="text-muted-foreground text-sm">
          Added to every feedback submitted from a matching host.
        </p>
      </div>
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2">
          <FormField
            control={control}
            name={`fixedTags.${index}.key`}
            render={({ field: keyField }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder="env"
                    aria-label="Tag key"
                    className="font-mono"
                    disabled={disabled}
                    {...keyField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <span className="text-muted-foreground pt-2 font-mono">=</span>
          <FormField
            control={control}
            name={`fixedTags.${index}.value`}
            render={({ field: valueField }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder="preview"
                    aria-label="Tag value"
                    className="font-mono"
                    disabled={disabled}
                    {...valueField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => remove(index)}
            aria-label="Remove tag"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={disabled || fields.length >= MAX_FIXED_TAGS}
        onClick={() => append({ key: "", value: "" })}
      >
        <Plus className="size-4" />
        Add tag
      </Button>
    </div>
  );
}
