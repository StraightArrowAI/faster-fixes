import { parseAsString } from "nuqs";

/**
 * `env` URL value matching feedback without an env tag. Underscored so it
 * cannot be mistaken for a typical environment name.
 */
export const NO_ENVIRONMENT_FILTER = "__none__";

export const feedbackFiltersParsers = {
  pageUrl: parseAsString,
  env: parseAsString,
  sort: parseAsString.withDefault("newest"),
  feedbackId: parseAsString,
};
