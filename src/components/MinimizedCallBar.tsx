"use client";

import { useVoiceCall } from "@/contexts/VoiceCallContext";

export function MinimizedCallBar() {
  useVoiceCall();

  return null;
}

export default MinimizedCallBar;
