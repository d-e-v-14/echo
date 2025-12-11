"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  FaHashtag,
  FaCog,
  FaVolumeUp,
  FaMicrophoneSlash,
  FaMicrophone,
  FaVideoSlash,
  FaPhoneSlash,
} from "react-icons/fa";
import VoiceChannel from "@/components/EnhancedVoiceChannel";
import { fetchServers, fetchChannelsByServer } from "@/app/api/API";
import Chatwindow from "@/components/ChatWindow";
import { useSearchParams } from "next/navigation";

const serverIcons: string[] = [
  "/hackbattle.png",
  "/image_6.png",
  "/image_7.png",
  "/image_9.png",
  "/image_6.png",
  "/hackbattle.png",
];

interface Channel {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
}

const ServersPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");

  const [showAddMenu, setShowAddMenu] = useState(false);

  const router = useRouter();
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [noServer, setNoServer] = useState<boolean>(false);
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(
    null
  );

  // New: whether the voice UI is minimized (compact bar) while still connected
  const [isVoiceMinimized, setIsVoiceMinimized] = useState<boolean>(false);

  // Lifted media streams to pass into ChatWindow
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(
    null
  );
  const [remoteMediaStreams, setRemoteMediaStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voice members state (for the member list UI)
  interface VoiceMember {
    id: string;
    username: string;
    avatar_url?: string | null;
    status?: "online" | "offline" | "idle" | "dnd";
    muted?: boolean;
  }
  const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([]);

  interface User {
    id: string;
    email: string;
    fullname: string;
    username: string;
    avatar_url: string | null;
    bio: string;
    created_at: string;
    date_of_birth: string;
    status: "online" | "offline" | "idle" | "dnd";
  }

  const user: User =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {
          id: "guest",
          email: "guest@example.com",
          fullname: "Guest",
          username: "guest",
          avatar_url: null,
          bio: "",
          created_at: "",
          date_of_birth: "",
          status: "offline",
        };

  useEffect(() => {
    const loadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        console.log(data);
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        } else {
          setNoServer(true);
        }
      } catch (err) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    loadServers();
  }, []);

  useEffect(() => {
    if (!selectedServerId) return;
    const loadChannels = async () => {
      try {
        const data: Channel[] = await fetchChannelsByServer(selectedServerId);
        console.log(data);
        // Normalize channel types to lowercase to avoid casing mismatches
        const normalized = (data || []).map((c) => ({
          ...c,
          type: (c.type || "").toLowerCase(),
        }));
        setChannels(normalized);
        const firstTextChannel = normalized.find((c) => c.type === "text");
        setActiveChannel(firstTextChannel || null);
      } catch (err) {
        console.error("Error fetching channels", err);
        setError("Failed to load channels");
        setChannels([]);
      }
    };
    loadChannels();
  }, [selectedServerId]);

  useEffect(() => {
    const loadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        console.log(data);
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        } else {
          setNoServer(true);
        }
      } catch (err) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    loadServers();
  }, [refresh]);

  // Derived channel lists
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  // When joining a voice channel we should open the full voice UI (not minimized)
  const handleJoinVoiceChannel = (channelName: string) => {
    setActiveVoiceChannel(channelName);
    setIsVoiceMinimized(false); // restore expanded view when joining
    // reset/prepare voice member list on new join
    setVoiceMembers((prev) => {
      // Keep current user present
      const you: VoiceMember = {
        id: user.id || "guest",
        username: user.username || "You",
        avatar_url: user.avatar_url || null,
        status: user.status || "online",
        muted: false,
      };
      return [you, ...prev.filter((m) => m.id !== you.id)];
    });
  };

  // When a remote media stream is added/removed we keep remoteMediaStreams and also update voiceMembers
  const handleRemoteAdded = (
    id: string,
    stream: MediaStream,
    username?: string
  ) => {
    setRemoteMediaStreams((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (exists) {
        return prev.map((p) => (p.id === id ? { id, stream } : p));
      }
      return [...prev, { id, stream }];
    });

    // Add to voice members if not present
    setVoiceMembers((prev) => {
      if (prev.find((m) => m.id === id)) return prev;
      const newMember: VoiceMember = {
        id,
        username: username || `User-${id.slice(0, 6)}`,
        avatar_url: null,
        status: "online",
        muted: false,
      };
      return [...prev, newMember];
    });
  };

  const handleRemoteRemoved = (id: string) => {
    setRemoteMediaStreams((prev) => prev.filter((p) => p.id !== id));
    setVoiceMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Optional: callback that can be passed to VoiceChannel if it emits members updates
  const onVoiceMembersUpdate = (members: VoiceMember[]) => {
    setVoiceMembers(members);
  };

  const onVoiceStateUpdate = (
    attendeeId: string,
    state: Partial<VoiceMember>
  ) => {
    setVoiceMembers((prev) =>
      prev.map((m) => (m.id === attendeeId ? { ...m, ...state } : m))
    );
  };

  return (
    <div className="relative flex h-screen bg-black select-none">
      {/* Server Sidebar */}
      <div className="w-16 p-2 flex flex-col items-center bg-black space-y-3 relative">
        {loading ? (
          <>
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
          </>
        ) : servers.length === 0 ? (
          <div className="text-white text-xs text-center px-2"></div>
        ) : (
          servers.map((server, idx) => (
            <img
              key={server.id}
              src={server.icon_url || serverIcons[idx % serverIcons.length]}
              alt={server.name}
              className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer ${
                selectedServerId === server.id ? "ring-2 ring-white" : ""
              }`}
              onClick={() => {
                setSelectedServerId(server.id);
                setSelectedServerName(server.name);
              }}
            />
          ))
        )}

        {/*  Add Server Button */}
        <div className="relative bottom-0">
          <div className="relative group">
            <button
              className="w-12 h-12 px-1  flex items-center justify-center rounded-full bg-gray-800 text-green-500 hover:bg-green-600 hover:text-white transition-all text-3xl font-bold"
              onClick={() => setShowAddMenu((prev) => !prev)}
            >
              +
            </button>

            {/* Popup Menu */}
            {showAddMenu && (
              <div className="absolute left-14 bottom-0 bg-[#1e1f22] text-white text-sm rounded-lg shadow-lg p-2 w-36 z-10">
                <button
                  onClick={() => {
                    router.push("/join-server");
                    setShowAddMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#2f3136] transition"
                >
                  Join Server
                </button>
                <button
                  onClick={() => {
                    router.push("/create-server");
                    setShowAddMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#2f3136] transition"
                >
                  Create Server
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        // Loading state for main content
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400">Loading servers…</p>
          </div>
        </div>
      ) : error ? (
        // Error state
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">
              Failed to load servers
            </h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">
              You're not part of any servers.
            </h1>
            <p className="text-gray-400 mb-4">
              Join a server with an invite link or create your own!
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push("/join-server")}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
              >
                Join Server
              </button>
              <button
                onClick={() => router.push("/create-server")}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
              >
                Create Server
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Channel List */}
          <div className="w-72  h-auto overflow-y-auto text-white px-2 py-4 space-y-4 border-r border-gray-800 bg-black scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xl font-bold">{selectedServerName}</h2>
              <button
                className="p-2 rounded-full hover:bg-[#23272a] transition"
                title="Server Settings"
                onClick={() => {
                  if (selectedServerId) {
                    localStorage.setItem("currentServerId", selectedServerId);
                    router.push(
                      `/server-settings?serverId=${selectedServerId}`
                    );
                  } else {
                    alert("Please select a server first");
                  }
                }}
              >
                <FaCog className="w-5 h-5 text-[#b5bac1] hover:text-white" />
              </button>
            </div>

            <div className="px-2">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
                Text Channels
              </h3>
              {textChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                    activeChannel?.id === channel.id
                      ? "bg-[#2f3136] text-white"
                      : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                  }`}
                  onClick={() => {
                    // When clicking a text channel while connected to voice, minimize the voice UI
                    setActiveChannel(channel);
                    if (activeVoiceChannel) {
                      setIsVoiceMinimized(true);
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <FaHashtag size={12} />
                    {channel.name}
                  </span>
                  {activeChannel?.id === channel.id && <FaCog size={12} />}
                </div>
              ))}
            </div>

            <div className="px-2">
              <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">
                Voice Channels
              </h3>
              {voiceChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                    activeVoiceChannel === channel.name
                      ? "bg-[#2f3136] text-white"
                      : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                  }`}
                  onClick={() => handleJoinVoiceChannel(channel.name)}
                >
                  <span className="flex items-center gap-2">
                    <FaVolumeUp size={12} />
                    {channel.name}
                  </span>
                  {activeVoiceChannel === channel.name && <FaCog size={12} />}
                </div>
              ))}
            </div>

            {activeVoiceChannel && (
              <div className="mt-auto p-2">
                {/* Compact hangup bar so users can leave the call from sidebar */}
                <div className="flex items-center justify-between bg-gray-900 rounded-md p-2 mt-2">
                  <div className="text-xs text-gray-300 truncate mr-2">
                    In voice: {activeVoiceChannel}
                  </div>
                  <button
                    onClick={() => {
                      setActiveVoiceChannel(null);
                      setLocalMediaStream(null);
                      setRemoteMediaStreams([]);
                      setVoiceMembers([]);
                      setIsVoiceMinimized(false);
                    }}
                    className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500"
                  >
                    Hang up
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chat Window */}
          {/* Main Content Area */}
          <div className="flex-1 relative text-white bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
            {/** If voice is minimized we still show chat content but render a small floating bar that can restore the voice UI or hang up. */}

            {/* Minimized voice bar (floating) */}
            {activeVoiceChannel && isVoiceMinimized && (
              <div className="fixed right-6 bottom-6 z-50">
                <div className="flex items-center gap-3 bg-gray-900 px-3 py-2 rounded-lg shadow-lg">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xs overflow-hidden">
                    <span className="text-gray-400">
                      {(user.username || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col text-sm">
                    <span className="font-semibold">{activeVoiceChannel}</span>
                    <span className="text-xs text-gray-400">Connected</span>
                  </div>
                  <div className="flex items-center gap-2 pl-3">
                    <button
                      onClick={() => setIsVoiceMinimized(false)}
                      className="px-3 py-1 text-sm rounded bg-[#2f3136] hover:bg-[#3a3c3f]"
                      title="Restore voice panel"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => {
                        setActiveVoiceChannel(null);
                        setLocalMediaStream(null);
                        setRemoteMediaStreams([]);
                        setVoiceMembers([]);
                        setIsVoiceMinimized(false);
                      }}
                      className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500"
                      title="Hang up"
                    >
                      Hang up
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeVoiceChannel && !isVoiceMinimized ? (
              // Voice layout: main VoiceChannel area + right-side member list (Discord-like)
              <div className="flex-1 w-full h-full">
                <div className="flex h-full">
                  {/* Main voice area */}
                  <div className="flex-1 p-4">
                    {/* Use a typed-cast to avoid potential prop type mismatch with your EnhancedVoiceChannel */}
                    {/** If EnhancedVoiceChannel supports these callbacks, it can call them to keep
                     * the serverside member state in sync. If not, we still update voiceMembers
                     * from handleRemoteAdded/Removed above. */}
                    {React.createElement(VoiceChannel as any, {
                      channelId: activeVoiceChannel,
                      userId: user.id,
                      onHangUp: () => {
                        setActiveVoiceChannel(null);
                        setIsVoiceMinimized(false);
                      },
                      debug: process.env.NODE_ENV === "development",
                      currentUser: { username: user.username },
                      onVoiceMembersUpdate, // optional — if your VoiceChannel emits this, we'll accept it
                      onVoiceStateUpdate, // optional
                      onRemoteAdded: handleRemoteAdded,
                      onRemoteRemoved: handleRemoteRemoved,
                    })}
                  </div>

                  {/* Right column: member list */}
                  <div className="w-72 border-l border-gray-800 bg-black p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Voice Members</h3>
                      <span className="text-xs text-gray-400">
                        {voiceMembers.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                      {/* ensure current user is shown first */}
                      {voiceMembers.length === 0 ? (
                        <div className="text-gray-400 text-sm">
                          No one else is in the call
                        </div>
                      ) : (
                        voiceMembers.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xs overflow-hidden">
                                {m.avatar_url ? (
                                  <img
                                    src={m.avatar_url}
                                    alt={m.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-gray-400">
                                    {(m.username || "U")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm">{m.username}</span>
                                <span className="text-xs text-gray-500">
                                  {m.status === "online" ? "Online" : m.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* mic icon (muted/unmuted) */}
                              {m.muted ? (
                                <FaMicrophoneSlash className="w-4 h-4 text-red-500" />
                              ) : (
                                <FaMicrophone className="w-4 h-4 text-green-400" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Optional footer controls */}
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          // example: open user list or invite modal
                          alert(
                            "Invite flow not implemented — hook up your invite modal here."
                          );
                        }}
                        className="w-full py-2 rounded bg-[#2f3136] text-sm hover:bg-[#3a3c3f]"
                      >
                        Invite People
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeChannel ? (
              <>
                <h1 className="text-2xl font-bold mb-4 text-center pt-6">
                  Welcome to #{activeChannel.name}
                </h1>
                <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 rounded-lg">
                  <Chatwindow
                    channelId={activeChannel.id}
                    isDM={false}
                    currentUserId={user.id}
                    localStream={localMediaStream}
                    remoteStreams={remoteMediaStreams}
                    serverId={selectedServerId}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl text-gray-400">
                  Select a channel to start chatting
                </h2>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const ServersPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-black items-center justify-center">
          <div className="text-white text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ServersPageContent />
    </Suspense>
  );
};

export default ServersPage;
