"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Check,
  Clock,
  Link2Off,
  LogIn,
  ShieldCheck,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { getServerDetails, joinServer } from "@/api";
import { supabase } from "@/lib/supabaseClient";
import { tokenStore } from "@/lib/auth/tokenStore";
import { queryKeys } from "@/lib/query";
import InlineSpinner from "@/components/loading/InlineSpinner";
import Skeleton from "@/components/loading/Skeleton";
import { toast } from "@/contexts/ToastContext";
import { getAuthErrorMessage } from "@/components/toast/errorNormalizer";
import { useAppRouter } from "@/lib/navigation/useAppRouter";
import type { Server, ServerDetails } from "@/api/types/server.types";

type PageState =
  | "loading"
  | "signIn"
  | "confirm"
  | "joining"
  | "done"
  | "alreadyMember"
  | "error";

type ErrorKind =
  | "NOT_FOUND"
  | "EXPIRED"
  | "REVOKED"
  | "LIMIT"
  | "BANNED"
  | "UNAVAILABLE"
  | "GENERIC";

interface ClassifiedError {
  kind: ErrorKind | "ALREADY_MEMBER";
  message: string;
}

function classifyInviteError(err: any): ClassifiedError {
  const code = err?.code;
  const status = err?.status || err?.response?.status;
  const msg = (err?.message || "").toLowerCase();

  if (code === "ALREADY_MEMBER" || msg.includes("already")) {
    return { kind: "ALREADY_MEMBER", message: "" };
  }
  if (code === "USER_BANNED" || msg.includes("banned")) {
    return {
      kind: "BANNED",
      message:
        "You've been banned from this server, so you can't join it with this invite.",
    };
  }
  if (code === "INVITE_EXPIRED" || msg.includes("expired")) {
    return {
      kind: "EXPIRED",
      message: "This invite has expired. Ask the server owner for a new one.",
    };
  }
  if (
    code === "INVITE_REVOKED" ||
    msg.includes("revoked") ||
    msg.includes("no longer valid")
  ) {
    return {
      kind: "REVOKED",
      message: "This invite was revoked by the server owner.",
    };
  }
  if (
    code === "INVITE_LIMIT_REACHED" ||
    code === "INVITE_UNAVAILABLE" ||
    msg.includes("usage limit") ||
    msg.includes("unavailable")
  ) {
    return {
      kind: "LIMIT",
      message:
        "This invite has reached its usage limit or is temporarily unavailable.",
    };
  }
  if (
    code === "INVITE_NOT_FOUND" ||
    code === "INVITE_INVALID" ||
    code === "INVITE_MISSING" ||
    status === 404
  ) {
    return {
      kind: "NOT_FOUND",
      message: "This invite may have expired, been revoked, or no longer exists.",
    };
  }
  if (status && status >= 500) {
    return {
      kind: "UNAVAILABLE",
      message: "We couldn't reach the server right now. Please try again shortly.",
    };
  }
  return {
    kind: "GENERIC",
    message: "We couldn't process this invite. Please try again.",
  };
}

const ERROR_META: Record<
  ErrorKind,
  { title: string; icon: LucideIcon; danger?: boolean }
> = {
  NOT_FOUND: { title: "Invite unavailable", icon: Link2Off },
  EXPIRED: { title: "Invite expired", icon: Clock },
  REVOKED: { title: "Invite revoked", icon: Ban },
  LIMIT: { title: "Invite unavailable", icon: Users },
  BANNED: { title: "Access denied", icon: Ban, danger: true },
  UNAVAILABLE: { title: "Something went wrong", icon: WifiOff },
  GENERIC: { title: "Something went wrong", icon: AlertCircle },
};

const primaryButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#E89E00] to-[#F2BC00] px-4 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const secondaryButtonClass =
  "w-full rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-[#2f3136] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

function CardShell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md animate-in">
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111214] shadow-2xl">
        <div className="relative h-20 bg-gradient-to-br from-[#E89E00] to-[#F2BC00]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(255,255,255,0.35),transparent_55%)]" />
        </div>
        <div className="relative px-6 pb-6 pt-14 text-center">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            {icon}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

const roundIconClass =
  "flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#111214] shadow-lg";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { open, openServer, goBack } = useAppRouter();
  const queryClient = useQueryClient();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [signingIn, setSigningIn] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [joinedServer, setJoinedServer] = useState<ServerDetails | null>(null);
  const [joinedServerId, setJoinedServerId] = useState<string | null>(null);
  const joiningRef = useRef(false);

  useEffect(() => {
    if (!code) {
      setErrorKind("NOT_FOUND");
      setErrorMessage("This invite link is not valid.");
      setPageState("error");
      return;
    }

    if (!tokenStore.hasRefreshToken()) {
      localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
      setPageState("signIn");
      return;
    }

    setPageState("confirm");
  }, [code]);

  useEffect(() => {
    if (pageState !== "done") return;
    const timer = setTimeout(() => {
      if (joinedServerId) {
        openServer(joinedServerId);
      } else {
        open("SERVERS");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [pageState, joinedServerId, open, openServer]);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);

    if (code) {
      localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      toast.error(getAuthErrorMessage(error));
      setSigningIn(false);
    }
  };

  const handleJoin = async () => {
    if (!code || joiningRef.current) return;
    joiningRef.current = true;
    setErrorKind(null);
    setErrorMessage("");
    setPageState("joining");

    try {
      const result = await joinServer(code);

      if (!result.success) {
        throw new Error("Failed to join the server.");
      }

      const serverId = result.serverId;
      let serverInfo: ServerDetails | null = null;

      if (serverId) {
        try {
          serverInfo = await getServerDetails(serverId);
        } catch {
          serverInfo = null;
        }
      }

      // Reflect the new membership in the server list cache immediately so the
      // sidebar shows the server without a page reload.
      if (serverId) {
        queryClient.setQueryData<Server[]>(queryKeys.servers, (old = []) => {
          const existing = Array.isArray(old) ? old : [];
          if (existing.some((s) => s.id === serverId)) return existing;
          return [
            ...existing,
            {
              id: serverId,
              name: serverInfo?.name ?? "Server",
              icon_url: serverInfo?.icon_url ?? null,
            },
          ];
        });
      }

      // Source of truth: the backend invalidates its own server-list cache when
      // a membership is created, so this refetch includes the new server.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.servers,
        refetchType: "all",
      });

      setJoinedServerId(serverId ?? null);
      setJoinedServer(serverInfo);
      setPageState("done");
    } catch (err: any) {
      if (err?.code === "AUTH_REQUIRED" || err?.status === 401) {
        localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
        setPageState("signIn");
        return;
      }

      const classified = classifyInviteError(err);

      if (classified.kind === "ALREADY_MEMBER") {
        setPageState("alreadyMember");
        return;
      }

      setErrorKind(classified.kind);
      setErrorMessage(classified.message);
      setPageState("error");
    } finally {
      joiningRef.current = false;
    }
  };

  if (pageState === "loading") {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-black p-4">
        <div className="w-full max-w-md animate-in">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111214] shadow-2xl">
            <Skeleton className="h-20 w-full rounded-none" />
            <div className="px-6 pb-6 pt-14 text-center">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <div className="mt-6 space-y-2">
                <Skeleton className="mx-auto h-4 w-48 rounded-full" />
                <Skeleton className="mx-auto h-3 w-32 rounded-full" />
              </div>
              <div className="mt-6 space-y-2">
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "signIn") {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-black p-4">
        <CardShell
          icon={
            <div className={clsx(roundIconClass, "bg-[#23272a]")}>
              <LogIn className="h-9 w-9 text-[#FFC341]" />
            </div>
          }
        >
          <h1 className="text-xl font-bold text-white">
            You&apos;re invited to join
          </h1>
          <p className="mt-1 text-sm text-[#b5bac1]">
            Sign in with your VIT email to accept this invite.
          </p>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#4285F4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3367d6] disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {signingIn ? (
                <InlineSpinner size="sm" />
              ) : (
                <FaGoogle className="text-[15px]" />
              )}
              {signingIn ? "Redirecting..." : "Sign in with Google"}
            </button>
          </div>

          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#72767d]">
              Invite Code
            </p>
            <p className="mt-1 truncate font-mono text-sm font-semibold tracking-widest text-[#b5bac1]">
              {code}
            </p>
          </div>
        </CardShell>
      </div>
    );
  }

  if (pageState === "confirm" || pageState === "joining") {
    const joining = pageState === "joining";
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-black p-4">
        <CardShell
          icon={
            <div className={clsx(roundIconClass, "bg-[#23272a]")}>
              <Users className="h-9 w-9 text-[#FFC341]" />
            </div>
          }
        >
          <h1 className="text-xl font-bold text-white">
            You&apos;re invited to join
          </h1>
          <p className="mt-1 text-sm text-[#b5bac1]">a server on Echo</p>

          <div className="mt-6 rounded-lg border border-white/[0.06] bg-black/60 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#72767d]">
              Invite code
            </p>
            <p className="mt-0.5 truncate font-mono text-sm font-semibold tracking-widest text-[#b5bac1]">
              {code}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              aria-busy={joining}
              className={primaryButtonClass}
            >
              {joining ? (
                <>
                  <InlineSpinner size="sm" />
                  Joining...
                </>
              ) : (
                "Accept Invite"
              )}
            </button>
            <button
              type="button"
              onClick={() => open("SERVERS")}
              disabled={joining}
              className={secondaryButtonClass}
            >
              Back to servers
            </button>
          </div>
        </CardShell>
      </div>
    );
  }

  if (pageState === "done") {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-black p-4">
        <CardShell
          icon={
            joinedServer?.icon_url ? (
              <img
                src={joinedServer.icon_url}
                alt={joinedServer.name}
                className="h-20 w-20 rounded-full border-4 border-[#111214] bg-[#23272a] object-cover shadow-lg"
              />
            ) : (
              <div
                className={clsx(
                  roundIconClass,
                  "bg-gradient-to-br from-[#E89E00] to-[#F2BC00]"
                )}
              >
                <Check className="h-9 w-9 text-black" />
              </div>
            )
          }
        >
          <h1 className="text-xl font-bold text-white">
            You&apos;ve joined
          </h1>
          <p className="mt-1 text-sm text-[#b5bac1]">
            {joinedServer?.name ?? "The server"} is now in your server list.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#72767d]">
            <InlineSpinner size="sm" />
            Opening server...
          </div>
        </CardShell>
      </div>
    );
  }

  if (pageState === "alreadyMember") {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-black p-4">
        <CardShell
          icon={
            <div className={clsx(roundIconClass, "bg-[#3ba55c]/15")}>
              <ShieldCheck className="h-9 w-9 text-[#3ba55c]" />
            </div>
          }
        >
          <h1 className="text-xl font-bold text-white">
            You&apos;re already a member
          </h1>
          <p className="mt-1 text-sm text-[#b5bac1]">
            You&apos;re already part of this server. Open it from your server
            list.
          </p>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => open("SERVERS")}
              className={primaryButtonClass}
            >
              Open Server
            </button>
            <button
              type="button"
              onClick={goBack}
              className={secondaryButtonClass}
            >
              Go Back
            </button>
          </div>
        </CardShell>
      </div>
    );
  }

  const meta =
    ERROR_META[errorKind ?? "GENERIC"] ?? ERROR_META.GENERIC;
  const ErrorIcon = meta.icon;

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-black p-4">
      <CardShell
        icon={
          <div
            className={clsx(
              roundIconClass,
              meta.danger ? "bg-[#ed4245]/15" : "bg-[#23272a]"
            )}
          >
            <ErrorIcon
              className={clsx(
                "h-9 w-9",
                meta.danger ? "text-[#ed4245]" : "text-[#b5bac1]"
              )}
            />
          </div>
        }
      >
        <h1 className="text-xl font-bold text-white">{meta.title}</h1>
        <p className="mt-1 text-sm text-[#b5bac1]">{errorMessage}</p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => open("SERVERS")}
            className={primaryButtonClass}
          >
            Back to servers
          </button>
          <button
            type="button"
            onClick={goBack}
            className={secondaryButtonClass}
          >
            Go Back
          </button>
        </div>
      </CardShell>
    </div>
  );
}