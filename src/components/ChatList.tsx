"use client";

function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface Chat {
  name: string;
  lastMessage: string;
  time: Date;
}

export default function ChatList() {
  const pinnedChats: Chat[] = [
    { name: "PRANAV", lastMessage: "What’s up?", time: new Date() },
    {
      name: "MADHAV",
      lastMessage: "What’s up?",
      time: new Date(Date.now() - 600000),
    },
  ];

  const allChats: Chat[] = [
    { name: "ArSHIA", lastMessage: "What’s up?", time: new Date() },
    {
      name: "RITA",
      lastMessage: "What’s up?",
      time: new Date(Date.now() - 3600000),
    },
    {
      name: "RIJU",
      lastMessage: "What’s up?",
      time: new Date(Date.now() - 7200000),
    },
    {
      name: "RAM",
      lastMessage: "What’s up?",
      time: new Date(Date.now() - 10800000),
    },
    {
      name: "RAJ",
      lastMessage: "What’s up?",
      time: new Date(Date.now() - 14400000),
    },
    {
      name: "RAMA",
      lastMessage: "What’s up?",
      time: new Date(Date.now() - 18000000),
    },
  ];

  const ChatItem = ({ chat, isOnline }: { chat: Chat; isOnline: boolean }) => (
    <div className="grid grid-cols-[1fr_auto] items-center py-2 px-2 hover:bg-gray-800 rounded">
      {/* Left: Avatar + Text */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-700" />
          <div
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
              isOnline ? "bg-orange-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold truncate">{chat.name}</p>
          <p className="text-sm text-blue-400 truncate">{chat.lastMessage}</p>
        </div>
      </div>

      {/* Right: Timestamp */}
      <div className="pl-3 pr-3 text-xs text-gray-400 text-right min-w-max flex-shrink-0">
        {formatTimestamp(chat.time)}
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-black text-white p-4 flex flex-col gap-4 border-r border-gray-800 select-none">
      <h2 className="text-xl font-semibold">Messages</h2>
      <div>
        <p className="text-sm text-gray-400 mb-1">Pinned Chats</p>
        {/* Pinned Chats */}
        {pinnedChats.map((chat, idx) => (
          <ChatItem
            key={`pinned-${chat.name}-${idx}`}
            chat={chat}
            isOnline={true}
          />
        ))}

        <p className="text-sm text-gray-400 mt-4 mb-1">All Chats</p>
        {/* All Chats */}
        {allChats.map((chat, idx) => (
          <ChatItem
            key={`chat-${chat.name}-${idx}`}
            chat={chat}
            isOnline={false}
          />
        ))}
      </div>
    </div>
  );
}
