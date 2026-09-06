import { BLOCKED_WORDS, MODERATION_ERROR_CODE } from "./blacklist";

const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;

const blockedWords: ReadonlySet<string> = new Set(
  BLOCKED_WORDS.map((word) => word.trim().toLowerCase()).filter(Boolean)
);

export interface ModerationResult {
  allowed: boolean;
}

/**
 * Checks a message against the blacklist using whole-token matching:
 * punctuation, case and whitespace differences are normalized, but a word
 * that merely contains a blocked term (e.g. "assassin") is not blocked.
 */
export function checkMessage(message: string): ModerationResult {
  const tokens = message.match(TOKEN_REGEX);
  if (!tokens) return { allowed: true };

  for (const token of tokens) {
    if (blockedWords.has(token.toLowerCase())) {
      return { allowed: false };
    }
  }

  return { allowed: true };
}

export function isModerationBlockedError(error: unknown): boolean {
  const data = (error as { response?: { data?: any } })?.response?.data;
  if (!data || typeof data !== "object") return false;

  const code = data.code ?? data.error ?? data.error_code;
  if (code === MODERATION_ERROR_CODE) return true;

  const message = data.message;
  return (
    typeof message === "string" && message.includes(MODERATION_ERROR_CODE)
  );
}