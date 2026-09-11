"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Flag, X } from "lucide-react";
import { submitUserReport } from "@/api/moderation.api";
import { toast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/components/toast/errorNormalizer";

const REPORT_CATEGORIES = [
  "Harassment",
  "Spam",
  "Inappropriate content",
  "Impersonation",
  "Scams & fraud",
  "Other",
] as const;

const DETAILS_MAX_LENGTH = 2000;

export interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  username?: string;
  serverId?: string;
  channelId?: string;
  messageId?: string;
  messageContent?: string | null;
}

export function ReportUserModal({
  isOpen,
  onClose,
  userId,
  username,
  serverId,
  channelId,
  messageId,
  messageContent,
}: ReportUserModalProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(null);
      setDetails("");
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !userId) return null;

  const trimmedDetails = details.trim();

  const handleSubmit = async () => {
    if (submitting) return;
    if (!trimmedDetails) {
      setError("Please describe what happened so we can review the report.");
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitUserReport({
        reported_user_id: userId,
        server_id: serverId,
        channel_id: channelId,
        category: category ?? undefined,
        reason: trimmedDetails,
        message_id: messageId,
        message: messageContent ?? undefined,
      });
      toast.success("Report submitted. Thank you for helping keep Echo safe.");
      onClose();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "We couldn't submit your report. Please try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Report ${username || "user"}`}
        className="w-full max-w-md animate-slide-up-fade overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1e1f22] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/[0.06] bg-[#23272a] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Flag className="h-5 w-5 text-[#ed4245]" />
              Report User
            </h2>
            <p className="mt-0.5 text-sm text-[#b5bac1]">
              Reporting{" "}
              <span className="font-medium text-white">
                {username || "this user"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="rounded-lg p-1.5 text-[#949ba4] transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="mb-2 text-sm font-medium text-[#dbdee1]">
              Which best describes the issue?
            </p>
            <div className="flex flex-wrap gap-2">
              {REPORT_CATEGORIES.map((item) => {
                const isSelected = category === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(isSelected ? null : item)}
                    aria-pressed={isSelected}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      isSelected
                        ? "border-[#FFC341]/60 bg-[#FFC341]/10 text-white"
                        : "border-white/[0.08] bg-[#2b2d31] text-[#b5bac1] hover:border-white/[0.15] hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#dbdee1]">
                Please describe what happened{" "}
                <span className="text-[#ed4245]">*</span>
              </p>
              <span
                className={`text-xs ${
                  details.length > DETAILS_MAX_LENGTH
                    ? "text-[#ed4245]"
                    : "text-[#949ba4]"
                }`}
              >
                {details.length}/{DETAILS_MAX_LENGTH}
              </span>
            </div>
            <textarea
              ref={inputRef}
              value={details}
              onChange={(event) => {
                setDetails(event.target.value);
                if (error) setError(null);
              }}
              maxLength={DETAILS_MAX_LENGTH}
              rows={4}
              placeholder="Share any context that will help our team review this report."
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#2b2d31] px-3 py-2.5 text-sm text-[#dbdee1] placeholder:text-[#6d737c] focus:border-[#FFC341]/50 focus:outline-none focus:ring-1 focus:ring-[#FFC341]/40"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-xs text-[#ed4245]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-white/[0.06] bg-[#18191c] px-4 py-2 text-sm font-medium text-[#b5bac1] transition hover:bg-[#23272a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !trimmedDetails}
              className="rounded-lg bg-[#ed4245] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ed4245]/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportUserModal;