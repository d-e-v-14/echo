"use client";

import { useEffect, useState } from "react";
import { getUserDMs } from "@/app/api/API";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

const ClientOnlyTimestamp = ({ time }: { time: string }) => {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    setFormatted(`${hours}:${minutes}`);
  }, [time]);

  return <span>{formatted}</span>;
};

const ChatItem = ({
  chat,
  isSelected,
  onClick,
}: {
  chat: any;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={`cursor-pointer px-4 py-2 rounded-lg ${
      isSelected ? "bg-gray-800" : "hover:bg-gray-800"
    }`}
  >
    <div className="flex justify-between items-center">
      <div>
        <p className="font-semibold">{chat.recipientName || "Unknown"}</p>
        <p className="text-sm text-blue-400 truncate">{chat.lastMessage}</p>
      </div>
      <div className="text-xs text-gray-400">
        <ClientOnlyTimestamp time={chat.updatedAt} />
      </div>
    </div>
  </div>
);

export default function ChatList() {
  const [dms, setDms] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const selected = searchParams.get("dm");

  useEffect(() => {
    const fetchDMs = async () => {
      try {
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("No token found in localStorage");
          return;
        }

        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub;

        if (!userId) {
          console.error("User ID not found in token");
          return;
        }

        const data = await getUserDMs(userId);
        setDms(data);
      } catch (err) {
        console.error("Failed to load DMs", err);
      }
    };

    fetchDMs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/messages/new?username=${encodeURIComponent(searchTerm)}`);
    setSearchTerm("");
    setSearchOpen(false);
  };

  return (
    <div className="w-72 bg-black text-white p-4 flex flex-col gap-4 border-r border-gray-800 overflow-y-auto">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Messages</h2>
        <button
          onClick={() => setSearchOpen((prev) => !prev)}
          className="p-1 rounded hover:bg-gray-800"
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </div>

      {/* Search input appears when open */}
      {searchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center bg-gray-900 rounded-lg px-2"
        >
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-sm flex-1 px-2 py-1 outline-none text-white placeholder-gray-400"
          />
        </form>
      )}

      {/* DM list */}
      {dms.length === 0 ? (
        <p className="text-gray-400 text-sm">No DMs yet</p>
      ) : (
        dms.map((dm, idx) => (
          <ChatItem
            key={dm._id || idx}
            chat={dm}
            isSelected={selected === dm.recipientId}
            onClick={() => router.push(`/messages?dm=${dm.recipientId}`)}
          />
        ))
      )}
    </div>
  );
}
