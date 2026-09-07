"use client";

import Link from "next/link";
import { buildPath } from "@/lib/navigation/paths";
import type { RouteName } from "@/lib/navigation/types";

type AppLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  to: RouteName;
  params?: Record<string, string>;
  extra?: Record<string, string>;
};

export function AppLink({ to, params, extra, ...rest }: AppLinkProps) {
  const href = buildPath(to, params);
  const query = extra ? `?${new URLSearchParams(extra).toString()}` : "";
  return <Link href={`${href}${query}`} {...rest} />;
}

export default AppLink;