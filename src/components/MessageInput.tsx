"use client";

import { useState, useRef } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";


interface MessageInputProps {
  sendMessage: (text: string, file: File | null) => void;
  isSending: boolean;
}

export default function MessageInput({ sendMessage, isSending }: MessageInputProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSend = () => {
    if (text.trim() === "" && !file) return;
    sendMessage(text.trim(), file);
    setText("");
    setFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative p-4">
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {file && (
        <div className="mb-2 flex items-center bg-white/10 p-2 rounded-md">
          <Paperclip className="h-5 w-5 mr-2 text-gray-400" />
          <span className="text-sm text-white truncate flex-1">{file.name}</span>
          <button onClick={() => setFile(null)} className="ml-2 text-gray-400 hover:text-white" aria-label="Remove attachment">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-xl flex items-center px-4 py-2 gap-3">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isSending}
        />

        {/* File Attachment Button */}
        <button onClick={() => fileInputRef.current?.click()} disabled={isSending}>
          <Paperclip className="w-5 h-5 text-white hover:scale-110 transition" />
        </button>

        {/* Emoji Button */}
        <button onClick={() => setShowEmojiPicker((prev) => !prev)} disabled={isSending}>
          <Smile className="w-5 h-5 text-white hover:scale-110 transition" />
        </button>

        {/* Input */}
        <input
          type="text"
          className="flex-1 bg-transparent text-white placeholder-white/70 focus:outline-none"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 transition p-2 rounded-full"
          disabled={isSending || (text.trim() === "" && !file)}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}