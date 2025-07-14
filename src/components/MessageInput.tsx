"use client";

import { useEffect, useState } from "react";
import { Smile, Send, ImagePlus, Camera, Mic } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";


export default function MessageInput({
  sendMessage,
}: {
  sendMessage: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState<any[]>([]);

  // Fetch trending GIFs from Tenor
  useEffect(() => {
  if (showGifPicker) {
    const apiKey = process.env.NEXT_PUBLIC_TENOR_API_KEY;
    const url = `https://tenor.googleapis.com/v2/search?q=trending&key=${apiKey}&limit=12`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setGifs(data.results || []))
      .catch((err) => console.error("Failed to load GIFs", err));
  }
}, [showGifPicker]);



  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleSend = () => {
    if (text.trim() === "") return;
    sendMessage(text);
    setText("");
  };

  return (
    <div className="relative p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Tenor GIF Picker */}
      {showGifPicker && (
        <div className="absolute bottom-20 right-4 z-50 bg-black p-2 rounded shadow-lg w-80">
          <div className="grid grid-cols-3 gap-2">
            {gifs.map((gif) => (
              <img
                key={gif.id}
                src={gif.media_formats.gif.url}
                alt="gif"
                className="w-full h-auto cursor-pointer rounded hover:scale-105 transition"
                onClick={() => {
                  sendMessage(gif.media_formats.gif.url);
                  setShowGifPicker(false);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-xl flex items-center px-4 py-2 gap-3">
        {/* Emoji */}
        <button onClick={() => setShowEmojiPicker((prev) => !prev)}>
          <Smile className="w-5 h-5 text-white hover:scale-110 transition" />
        </button>

        {/* GIFs */}
        <button onClick={() => setShowGifPicker((prev) => !prev)}>
          <ImagePlus className="w-5 h-5 text-white hover:scale-110 transition" />
        </button>

        {/* Camera */}
        <button>
          <Camera className="w-5 h-5 text-white hover:scale-110 transition" />
        </button>

        {/* Mic */}
        <button>
          <Mic className="w-5 h-5 text-white hover:scale-110 transition" />
        </button>

        {/* Input */}
        <input
          type="text"
          className="flex-1 bg-transparent text-white placeholder-white/70 focus:outline-none"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 transition p-2 rounded-full"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
