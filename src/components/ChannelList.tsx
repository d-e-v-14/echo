import { Hash, Mic, Headphones, Settings } from "lucide-react";
import Image from "next/image";

function ChannelItem({
  name,
  isVoice = false,
}: {
  name: string;
  isVoice?: boolean;
}) {
  return (
    <div className="flex items-center px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-gray-100 cursor-pointer">
      {isVoice ? (
        <Mic className="w-4 h-4 mr-1" />
      ) : (
        <Hash className="w-4 h-4 mr-1" />
      )}
      <span className="text-sm">{name}</span>
    </div>
  );
}

export default function ChannelList() {
  return (
    <div className="w-60 bg-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-900 font-semibold shadow-sm">
        Hackbattle
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Channel categories */}
        <div>
          <div className="text-xs font-semibold text-gray-400 px-2 mb-1">
            General
          </div>
          <div className="space-y-1">
            <ChannelItem name="general" />
            <ChannelItem name="welcome" />
          </div>
        </div>

        {/* Other channel categories... */}
      </div>

      {/* User profile */}
      <div className="p-2 bg-gray-850 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Image
              src="https://avatars.dicebear.com/api/bottts/user.svg"
              alt="User avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="relative  bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-850"></div>
          </div>
          <div className="text-sm font-medium">
            <div>Username</div>
            <div className="text-xs text-gray-400">#1234</div>
          </div>
        </div>
        <div className="flex space-x-1 text-gray-400">
          <Mic className="w-5 h-5" />
          <Headphones className="w-5 h-5" />
          <Settings className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
