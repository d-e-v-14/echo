export const NOT_FRIEND_MESSAGE =
  "You are not friends with this person.";

export const UNFRIENDED_MESSAGE =
  "You're no longer friends with this person. You can't message them anymore.";

export const NOT_FRIEND_TITLE = "Messaging blocked";

export function isFriendshipBlockedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const typed = error as {
    response?: { status?: number; data?: Record<string, unknown> };
    message?: string;
  };

  const responseData = typed.response?.data;
  const message = String(
    responseData?.error ??
      responseData?.message ??
      (typeof responseData === "string" ? responseData : "") ??
      typed.message ??
      ""
  ).toLowerCase();

  if (
    typed.response?.status === 403 &&
    (message.includes("friend") || message.includes("dm"))
  ) {
    return true;
  }

  return (
    message.includes("not friends") ||
    message.includes("not friend") ||
    message.includes("must be friends") ||
    message.includes("unfriend") ||
    message.includes("friend request")
  );
}