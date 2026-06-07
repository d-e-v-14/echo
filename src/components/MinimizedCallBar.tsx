"use client";

import { useVoiceCall } from "@/contexts/VoiceCallContext";

export function MinimizedCallBar() {
  const { activeCall, isConnected, leaveCall } = useVoiceCall();

  
  return null;
}

export default MinimizedCallBar;
