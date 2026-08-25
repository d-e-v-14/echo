"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { joinServer } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import InlineSpinner from "@/components/loading/InlineSpinner";

interface JoinServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function extractInviteCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("://")) {
    const inviteMatch = trimmed.match(/\/invite\/([^/?#]+)/i);
    return inviteMatch ? inviteMatch[1].replace(/\s+/g, "") : "";
  }
  return trimmed.replace(/\s+/g, "");
}

function friendlyError(err: any): string {
  const code = err?.code || err?.response?.data?.code;
  const status = err?.response?.status;
  const message = err?.message || err?.response?.data?.message || "";
  const haystack = `${code || ""} ${message}`.toLowerCase();

  if (code === "AUTH_REQUIRED" || status === 401) {
    return "Your session has expired. Please sign in and try again.";
  }
  if (code === "ALREADY_MEMBER" || haystack.includes("already")) {
    return "You are already a member of this server.";
  }
  if (code === "INVALID_INVITE" || haystack.includes("invalid")) {
    return "This invite is invalid.";
  }
  if (haystack.includes("expired")) {
    return "This invite has expired.";
  }
  if (code === "SERVER_UNAVAILABLE" || haystack.includes("unavailable")) {
    return "This server is currently unavailable.";
  }
  return "Unable to join the server. Please try again.";
}

export default function JoinServerModal({
  isOpen,
  onClose,
}: JoinServerModalProps) {
  const queryClient = useQueryClient();
  const titleId = useId();
  const descId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setError(null);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
    previouslyFocusedRef.current?.focus?.();
    previouslyFocusedRef.current = null;
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (isJoining) return;
    setJoinCode("");
    setError(null);
    onClose();
  }, [isJoining, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const canSubmit = Boolean(joinCode.trim()) && !isJoining;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim() || isJoining) return;

    const code = extractInviteCode(joinCode);
    if (!code) {
      setError("This invite link is invalid.");
      return;
    }

    setIsJoining(true);
    setError(null);
    try {
      await joinServer(code);
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
      setJoinCode("");
      onClose();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-xl border border-[#2b2d31] bg-[#1e1f22] p-6 text-white shadow-2xl animate-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id={titleId} className="text-xl font-bold">
              Join a Server
            </h2>
            <p id={descId} className="mt-1 text-sm text-gray-400">
              Enter an invite code or server invite link to join an existing
              community.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isJoining}
            aria-label="Close"
            className="rounded p-1 text-gray-400 transition hover:bg-[#2f3136] hover:text-white disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <label
            htmlFor="join-invite-input"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            Invite link or code
          </label>
          <input
            id="join-invite-input"
            ref={inputRef}
            type="text"
            value={joinCode}
            onChange={(event) => {
              setJoinCode(event.target.value);
              if (error) setError(null);
            }}
            disabled={isJoining}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            placeholder="abc123 or https://echo.ieeecsvit.com/invite/abc123"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-[#2b2d31] bg-[#2f3136] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
          />

          {error && (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isJoining && <InlineSpinner size="sm" />}
            {isJoining ? "Joining..." : "Join Server"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            disabled={isJoining}
            className="mt-3 w-full rounded-lg py-2.5 text-sm font-medium text-gray-300 transition hover:bg-[#2f3136] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
