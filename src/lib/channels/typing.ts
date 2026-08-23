export type TypingMap = Record<string, number>;

export const TYPING_TIMEOUT_MS = 4000;

export const updateTyping = (
  typing: TypingMap,
  userId: string,
  now: number
): TypingMap => ({
  ...typing,
  [userId]: now + TYPING_TIMEOUT_MS,
});

export const removeTyping = (typing: TypingMap, userId: string): TypingMap => {
  if (!(userId in typing)) return typing;
  const next = { ...typing };
  delete next[userId];
  return next;
};

export const pruneTyping = (typing: TypingMap, now: number): TypingMap => {
  const entries = Object.entries(typing).filter(([, expiry]) => expiry > now);
  if (entries.length === Object.keys(typing).length) return typing;

  return Object.fromEntries(entries);
};

export const isTypingUser = (
  typing: TypingMap,
  userId: string,
  now: number
): boolean => {
  const expiry = typing[userId];
  return !!expiry && expiry > now;
};

export const typingUsers = (
  typing: TypingMap,
  now: number,
  excludeUserId?: string
): string[] => {
  return Object.keys(pruneTyping(typing, now)).filter(
    (userId) => userId !== excludeUserId
  );
};
