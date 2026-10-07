import { parseAsString } from "nuqs";

export const feedbackFiltersParsers = {
  pageUrl: parseAsString,
  env: parseAsString,
  sort: parseAsString.withDefault("newest"),
  feedbackId: parseAsString,
};
