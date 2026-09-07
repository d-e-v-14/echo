"use client";

import { useMemo } from "react";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildPath, isSafePath, parsePath } from "./paths";
import type { RouteName } from "./types";

const appendQuery = (
  path: string,
  extra?: Record<string, string>
): string => {
  if (!extra) return path;
  const query = new URLSearchParams(extra).toString();
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${query}`;
};

export function useAppRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      open: (name: RouteName, params?: Record<string, string>, extra?: Record<string, string>) =>
        router.push(appendQuery(buildPath(name, params), extra)),

      replace: (name: RouteName, params?: Record<string, string>, extra?: Record<string, string>) =>
        router.replace(appendQuery(buildPath(name, params), extra)),

      openServer: (
        serverId: string,
        opts?: {
          channelId?: string;
          view?: "voice" | "chat";
          query?: Record<string, string>;
        }
      ) => {
        const query = new URLSearchParams({ serverId });
        if (opts?.channelId) query.set("channelId", opts.channelId);
        if (opts?.view) query.set("view", opts.view);
        for (const [key, value] of Object.entries(opts?.query ?? {})) {
          query.set(key, value);
        }
        router.push(`/servers?${query.toString()}`);
      },

      openDm: (userId: string) =>
        router.push(buildPath("MESSAGES_DM", { userId })),

      openSettings: (serverId: string) =>
        router.push(buildPath("SERVER_SETTINGS", { serverId })),

      openInvite: (code: string) => router.push(buildPath("INVITE", { code })),

      goHome: () => router.push("/"),

      goSafe: (target: string) =>
        router.replace(isSafePath(target) ? target : "/"),

      goBack: () => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      },
    }),
    [router]
  );
}

export function useRequiredRouteParams(name: RouteName): Record<string, string> {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsed = useMemo(
    () => parsePath(pathname, searchParams) ?? null,
    [pathname, searchParams]
  );

  if (!parsed || parsed.name !== name) {
    notFound();
  }

  return parsed.params;
}