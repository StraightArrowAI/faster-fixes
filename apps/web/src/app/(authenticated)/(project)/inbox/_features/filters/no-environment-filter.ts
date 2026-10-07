// Kept apart from feedback-filters.schema.ts, which imports nuqs: the archive
// tRPC query reads this value on the server, where nuqs' client parsers break
// the build.

/**
 * `env` URL value matching feedback without an env tag. Underscored so it
 * cannot be mistaken for a typical environment name.
 */
export const NO_ENVIRONMENT_FILTER = "__none__";
