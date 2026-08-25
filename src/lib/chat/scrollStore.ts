import type { ScrollAnchor } from "@/lib/channels/scrollBehavior";

export interface ConversationScrollState {
  anchor: ScrollAnchor | null;
  initialized: boolean;
}

const states = new Map<string, ConversationScrollState>();

export const chatScrollStore = {
  get(key: string): ConversationScrollState {
    return states.get(key) ?? { anchor: null, initialized: false };
  },

  setAnchor(key: string, anchor: ScrollAnchor | null) {
    const current = states.get(key);
    if (!current && !anchor) return;
    states.set(key, {
      anchor,
      initialized: current?.initialized ?? false,
    });
  },

  markInitialized(key: string) {
    const current = states.get(key);
    states.set(key, { anchor: current?.anchor ?? null, initialized: true });
  },

  delete(key: string) {
    states.delete(key);
  },
};
