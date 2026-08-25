"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Search, X, Hash } from "lucide-react";
import { MessageSearchResult } from "@/api/types/message.types";

interface InlineSearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<MessageSearchResult[]>;
  onSelectResult: (result: MessageSearchResult) => void;
  placeholder?: string;
  showChannelName?: boolean;
  align?: "left" | "right";
}

function SearchResultSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2 border-b border-[#23272a]/80 px-4 py-3 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-2.5 w-16 rounded" />
      </div>
      <div className="skeleton h-2.5 w-32 rounded" />
      <div className="flex flex-col gap-1.5">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

export default function InlineSearchDropdown({
  isOpen,
  onClose,
  onSearch,
  onSelectResult,
  placeholder = "Search messages...",
  showChannelName = false,
  align = "right",
}: InlineSearchDropdownProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await onSearch(trimmed);
        setResults(data);
        setError(data.length === 0 ? "No messages found." : null);
      } catch {
        setResults([]);
        setError("Search failed.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, onSearch]);

  const handleSelect = useCallback(
    (result: MessageSearchResult) => {
      onSelectResult(result);
      onClose();
    },
    [onSelectResult, onClose]
  );

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="absolute top-full mt-1 z-50 w-full max-w-lg">
      <div
        className={`overflow-hidden rounded-xl border border-[#23272a] bg-[#1e1f22] shadow-2xl ${
          align === "right" ? "ml-auto" : "mr-auto"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-[#23272a] px-4 py-2.5">
          <Search className="h-4 w-4 text-[#72767d] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-[#72767d]"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#72767d] hover:text-slate-300 transition-colors"
            aria-label="Close search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-[120px] max-h-80 overflow-y-auto">
          {error && !isSearching && (
            <p className="px-4 py-6 text-center text-sm text-[#72767d]">
              {error}
            </p>
          )}

          {isSearching && (
            <div>
              <SearchResultSkeleton />
              <SearchResultSkeleton />
              <SearchResultSkeleton />
              <SearchResultSkeleton />
            </div>
          )}

          {!isSearching && !error && results.length === 0 && query.trim() && (
            <p className="px-4 py-6 text-center text-sm text-[#72767d]">
              No results found.
            </p>
          )}

          {!isSearching && results.map((result) => {
            const displayName =
              result.username ?? result.sender_name ?? "Unknown";
            const preview = (result.content || "").trim() || "Attachment";
            const timeLabel = result.timestamp
              ? new Date(result.timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <button
                key={`${result.id}-${result.channel_id ?? ""}-${
                  result.timestamp ?? ""
                }`}
                type="button"
                onClick={() => handleSelect(result)}
                className="flex w-full flex-col gap-1 border-b border-[#23272a]/80 px-4 py-3 text-left transition hover:bg-[#23272a]/50 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#FFC341]">
                    {displayName}
                  </span>
                  {timeLabel && (
                    <span className="text-[10px] text-[#72767d]">
                      {timeLabel}
                    </span>
                  )}
                </div>
                {showChannelName && result.channel_name && (
                  <span className="flex items-center gap-1 text-[10px] text-[#72767d]">
                    <Hash className="h-2.5 w-2.5" />
                    {result.channel_name}
                  </span>
                )}
                <p className="line-clamp-2 text-[13px] text-slate-300 leading-snug">
                  {preview}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
