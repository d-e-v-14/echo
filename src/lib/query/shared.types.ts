export interface PinContext {
  channel_id?: string;
  thread_id?: string;
}

export interface CachePolicy {
  staleTimeMs: number;
  gcTimeMs: number;
}
