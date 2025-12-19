"use client";

import { useState, useRef } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { apiClient } from "@/utils/apiClient";

/* -------------------- TYPES -------------------- */

interface MentionableUser {
  id: string;
  username: string;
  avatar_url?: string;
  fullname?: string;
}

interface MessageInputWithMentionsProps {
  sendMessage: (text: string, file: File | null) => void;
  isSending: boolean;
  serverId?: string;
}

/* -------------------- COMPONENT -------------------- */

export default function MessageInputWithMentions({
  sendMessage,
  isSending,
  serverId,
}: MessageInputWithMentionsProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>(
    []
  );
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [searchingMentions, setSearchingMentions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  /* -------------------- EMOJI -------------------- */

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  /* -------------------- FILE -------------------- */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  /* -------------------- SEND -------------------- */

  const handleSend = () => {
    if (!text.trim() && !file) return;
    sendMessage(text.trim(), file);
    setText("");
    setFile(null);
    setShowMentionDropdown(false);
  };

  /* -------------------- MENTION SEARCH -------------------- */

  const searchMentionable = async (query: string) => {
    if (!serverId) {
      setMentionableUsers([]);
      return;
    }

    setSearchingMentions(true);
    try {
      const res = await apiClient.get(`/api/mentions/search/${serverId}`, {
        params: { q: query || "" },
      });
      setMentionableUsers(res.data?.users || []);
    } catch (err) {
      console.error("Mention search failed", err);
      setMentionableUsers([]);
    } finally {
      setSearchingMentions(false);
    }
  };

  /* -------------------- TEXT CHANGE -------------------- */

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;

    setText(value);

    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionPosition(match.index || 0);
      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
      searchMentionable(match[1]);
    } else {
      setShowMentionDropdown(false);
      setMentionableUsers([]);
    }
  };

  /* -------------------- INSERT MENTION -------------------- */

  const insertMention = (username: string) => {
    const before = text.slice(0, mentionPosition);
    const after = text.slice(mentionPosition + mentionQuery.length + 1);

    const newText = `${before}@${username} ${after}`;
    setText(newText);
    setShowMentionDropdown(false);

    requestAnimationFrame(() => {
      textInputRef.current?.focus();
      const pos = before.length + username.length + 2;
      textInputRef.current?.setSelectionRange(pos, pos);
    });
  };

  /* -------------------- KEYBOARD -------------------- */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionDropdown) {
      const total = mentionableUsers.length + 1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((i) => (i + 1) % total);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((i) => (i - 1 + total) % total);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedMentionIndex < mentionableUsers.length) {
          insertMention(mentionableUsers[selectedMentionIndex].username);
        } else {
          insertMention("everyone");
        }
      } else if (e.key === "Escape") {
        setShowMentionDropdown(false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  /* -------------------- RENDER -------------------- */

  return (
    <div className="relative p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Mention Dropdown */}
      {showMentionDropdown && (
        <div className="absolute bottom-20 left-4 w-72 max-h-60 overflow-y-auto rounded-lg bg-gray-800 border border-gray-600 z-50">
          {searchingMentions ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Searching…
            </div>
          ) : (
            <>
              {mentionableUsers.map((user, i) => (
                <div
                  key={user.id}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-3 ${
                    i === selectedMentionIndex
                      ? "bg-blue-600"
                      : "hover:bg-gray-700"
                  }`}
                  onClick={() => insertMention(user.username)}
                >
                  <img
                    src={user.avatar_url || "/User_profil.png"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-white text-sm font-medium">
                      {user.fullname || user.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      @{user.username}
                    </div>
                  </div>
                </div>
              ))}

              <div
                className={`px-3 py-2 cursor-pointer flex items-center gap-3 ${
                  selectedMentionIndex === mentionableUsers.length
                    ? "bg-red-600"
                    : "hover:bg-gray-700"
                }`}
                onClick={() => insertMention("everyone")}
              >
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
                  @
                </div>
                <span className="text-white">@everyone</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="mb-3 flex items-center bg-gray-800 p-2 rounded-lg">
          <span className="text-sm text-gray-300 truncate flex-1">
            {file.name}
          </span>
          <button onClick={() => setFile(null)} className="text-red-400 ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
        <input
          ref={textInputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 bg-transparent outline-none text-white"
          disabled={isSending}
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <button onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={20} />
        </button>

        <button onClick={() => setShowEmojiPicker((v) => !v)}>
          <Smile size={20} />
        </button>

        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && !file)}
          className="bg-blue-600 p-2 rounded-lg disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
