export { BLOCKED_WORDS, MODERATION_ERROR_CODE } from "./blacklist";
export {
  checkMessage,
  isModerationBlockedError,
} from "./checkMessage";
export type { ModerationResult } from "./checkMessage";

import { toast } from "@/contexts/ToastContext";

export function notifyModerationBlocked() {
  toast.error("Please remove inappropriate language before sending.", {
    title: "Message blocked",
  });
}