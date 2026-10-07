export type CompiledHostPattern = {
  source: string;
  labels: RegExp[];
  placeholders: string[];
};

export type CompileHostPatternResult =
  | { ok: true; pattern: CompiledHostPattern }
  | { ok: false; error: string };

const PLACEHOLDER_NAME = /^[a-z][a-z0-9_]{0,31}$/;
const LITERAL_CHAR = /^[a-z0-9-]$/;
const LITERAL_LABEL = /^[a-z0-9-]+$/;
// Tokens are confined to one label so `{env}` can never absorb `dev.evil`; the
// pattern doubles as the access gate (ADR-0012).
const TOKEN_MATCH = "[a-z0-9-]+";

export function normalizeHostPattern(raw: string): string {
  return raw.trim().toLowerCase();
}

function fail(error: string): CompileHostPatternResult {
  return { ok: false, error };
}

export function compileHostPattern(raw: string): CompileHostPatternResult {
  const source = normalizeHostPattern(raw);
  if (!source) return fail("Pattern is empty.");
  if (source.length > 253) return fail("Pattern exceeds 253 characters.");

  const labels = source.split(".");
  if (labels.some((label) => label === "")) {
    return fail("Pattern contains an empty label.");
  }

  const placeholders: string[] = [];
  const regexes: RegExp[] = [];

  for (const label of labels) {
    let regex = "";
    let previousWasToken = false;
    let i = 0;

    while (i < label.length) {
      const char = label[i]!;

      if (char === "{") {
        const end = label.indexOf("}", i);
        if (end === -1) return fail("Pattern has an unclosed {placeholder}.");
        const name = label.slice(i + 1, end);
        if (!PLACEHOLDER_NAME.test(name)) {
          return fail(
            `Invalid placeholder name "${name}". Use lowercase letters, digits, and underscores, starting with a letter.`,
          );
        }
        if (placeholders.includes(name)) {
          return fail(`Placeholder {${name}} is used more than once.`);
        }
        if (previousWasToken) {
          return fail(
            "Wildcards and placeholders cannot be adjacent; separate them with text.",
          );
        }
        placeholders.push(name);
        regex += `(${TOKEN_MATCH})`;
        previousWasToken = true;
        i = end + 1;
        continue;
      }

      if (char === "*") {
        if (previousWasToken) {
          return fail(
            "Wildcards and placeholders cannot be adjacent; separate them with text.",
          );
        }
        regex += TOKEN_MATCH;
        previousWasToken = true;
        i += 1;
        continue;
      }

      if (!LITERAL_CHAR.test(char)) {
        return fail(`Pattern contains an invalid character "${char}".`);
      }
      // Literal chars are [a-z0-9-], none of which need escaping outside a class.
      regex += char;
      previousWasToken = false;
      i += 1;
    }

    regexes.push(new RegExp(`^${regex}$`));
  }

  // Fixing the registrable domain stops patterns like `*.com` from opening the
  // widget to a whole TLD.
  if (
    source !== "localhost" &&
    (labels.length < 2 || !labels.slice(-2).every((l) => LITERAL_LABEL.test(l)))
  ) {
    return fail("The last two labels must be plain text, e.g. example.com.");
  }

  return { ok: true, pattern: { source, labels: regexes, placeholders } };
}

/** Returns captured tags when `host` matches, otherwise null. */
export function matchCompiledPattern(
  pattern: CompiledHostPattern,
  host: string,
): Record<string, string> | null {
  const hostLabels = host.split(".");
  if (hostLabels.length !== pattern.labels.length) return null;

  const captured: string[] = [];
  for (let i = 0; i < hostLabels.length; i++) {
    const match = pattern.labels[i]!.exec(hostLabels[i]!);
    if (!match) return null;
    captured.push(...match.slice(1));
  }

  return Object.fromEntries(
    pattern.placeholders.map((name, i) => [name, captured[i]!]),
  );
}
