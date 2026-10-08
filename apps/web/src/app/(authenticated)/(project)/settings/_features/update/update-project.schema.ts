import z from "zod";

// Domains are edited in the Domains section, which keeps Project.domain in
// sync with the primary; this form never writes it.
export const UpdateProjectSchema = z.object({
  projectId: z.string(),
  name: z.string().trim().min(1, "Name is required"),
  widgetEnabled: z.boolean(),
});

export type UpdateProjectInputs = z.infer<typeof UpdateProjectSchema>;
