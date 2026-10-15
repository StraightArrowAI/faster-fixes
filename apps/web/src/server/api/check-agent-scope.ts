export type AgentScope =
  | "feedbacks:read"
  | "feedbacks:update_status"
  | "feedbacks:create"
  | "feedbacks:comment";

export function hasScope(tokenScopes: string[], required: AgentScope): boolean {
  return tokenScopes.includes(required);
}
