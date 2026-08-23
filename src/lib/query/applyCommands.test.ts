import { describe, it, expect } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  applyCacheCommand,
  applyCacheCommands,
} from "./applyCommands";
import type { CacheCommand } from "./cacheCommand.types";

const key = ["test", "value"] as const;

describe("applyCacheCommand", () => {
  it("removes a cached entry", () => {
    const client = new QueryClient();
    client.setQueryData(key, "stale");

    applyCacheCommand(client, { type: "remove", queryKeys: [key] });

    expect(client.getQueryData(key)).toBeUndefined();
  });

  it("refetches an observed query when invalidated", async () => {
    const client = new QueryClient();
    let calls = 0;
    const queryFn = async () => {
      calls += 1;
      return `data-${calls}`;
    };
    const keyArr = ["test", "value"];

    const observer = new QueryObserver(client, {
      queryKey: keyArr,
      queryFn,
    });
    const unsubscribe = observer.subscribe(() => {});

    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toBe(1);

    applyCacheCommand(client, { type: "invalidate", queryKeys: [keyArr] });

    await new Promise((r) => setTimeout(r, 100));
    expect(calls).toBe(2);
    unsubscribe();
  });
});

describe("applyCacheCommands", () => {
  it("applies a sequence of commands in order", () => {
    const client = new QueryClient();
    client.setQueryData(key, { messages: ["a"] });

    const commands: CacheCommand[] = [
      { type: "remove", queryKeys: [key] },
      { type: "invalidate", queryKeys: [["other"]] },
    ];

    applyCacheCommands(client, commands);

    expect(client.getQueryData(key)).toBeUndefined();
  });
});
