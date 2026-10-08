import {
  decryptWithKey,
  encryptWithKey,
  loadHexKeyFromEnv,
} from "@/utils/crypto/aes-gcm";
import crypto from "crypto";

const KEY_ENV = "REVIEWER_TOKEN_ENCRYPTION_KEY";

export function hashReviewerToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Tokens are encrypted, not only hashed, so a reviewer can be sent links for
 * more domains after creation (ADR-0013). Validation still goes through the
 * hash lookup; the ciphertext is only read to rebuild links.
 */
export function issueReviewerToken() {
  const key = loadHexKeyFromEnv(KEY_ENV);
  const token = crypto.randomBytes(24).toString("hex");
  return {
    token,
    tokenLookup: hashReviewerToken(token),
    tokenCiphertext: encryptWithKey(token, key),
  };
}

export function decryptReviewerToken(ciphertext: string): string {
  return decryptWithKey(ciphertext, loadHexKeyFromEnv(KEY_ENV));
}
