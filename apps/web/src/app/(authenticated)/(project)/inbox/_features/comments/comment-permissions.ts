type CommentAuthor = { authorId: string | null };
type Viewer = { id: string; role: string };

// Better Auth stores multiple roles as a comma-separated string.
function isOwnerOrAdmin(role: string) {
  return role
    .split(",")
    .map((r) => r.trim())
    .some((r) => r === "owner" || r === "admin");
}

// Only the author may reword a comment: an admin editing someone else's words
// would put text in their name. Moderation is delete-only.
export function canEditComment(comment: CommentAuthor, viewer: Viewer) {
  return comment.authorId !== null && comment.authorId === viewer.id;
}

export function canDeleteComment(comment: CommentAuthor, viewer: Viewer) {
  return canEditComment(comment, viewer) || isOwnerOrAdmin(viewer.role);
}
