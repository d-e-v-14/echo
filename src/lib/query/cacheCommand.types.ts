export type CacheCommand =
  | {
      type: "invalidate";
      queryKeys: readonly (readonly unknown[])[];
    }
  | {
      type: "remove";
      queryKeys: readonly (readonly unknown[])[];
    };
