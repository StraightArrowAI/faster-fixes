import { beforeAll, describe, expect, it } from "vitest";

import {
  decryptReviewerToken,
  hashReviewerToken,
  issueReviewerToken,
} from "./reviewer-token";

beforeAll(() => {
  process.env.REVIEWER_TOKEN_ENCRYPTION_KEY = "11".repeat(32);
});

describe("reviewer tokens", () => {
  it("issues a token whose lookup and ciphertext round-trip", () => {
    const issued = issueReviewerToken();
    expect(issued.token).toMatch(/^[0-9a-f]{48}$/);
    expect(issued.tokenLookup).toBe(hashReviewerToken(issued.token));
    expect(decryptReviewerToken(issued.tokenCiphertext)).toBe(issued.token);
  });

  it("issues distinct tokens", () => {
    expect(issueReviewerToken().token).not.toBe(issueReviewerToken().token);
  });

  it("fails loudly without a key", () => {
    const saved = process.env.REVIEWER_TOKEN_ENCRYPTION_KEY;
    delete process.env.REVIEWER_TOKEN_ENCRYPTION_KEY;
    expect(() => issueReviewerToken()).toThrow(/REVIEWER_TOKEN_ENCRYPTION_KEY/);
    process.env.REVIEWER_TOKEN_ENCRYPTION_KEY = saved;
  });
});
