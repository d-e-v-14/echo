import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveServer } from "@/api";
import { ServerDetails } from "@/api/types/server.types";

interface LeaveProps {
  serverId: string;
  serverDetails: ServerDetails | null;
  isOwner?: boolean;
}

export default function Leave({ serverId, serverDetails, isOwner = false }: LeaveProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [input, setInput] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const serverName = serverDetails?.name || "Unknown Server";

  const handleLeaveServer = async () => {
    if (input !== serverName) {
      setError("Type the server name exactly to confirm.");
      return;
    }
    setIsLeaving(true);
    setError("");
    try {
      await leaveServer(serverId);
      localStorage.removeItem("currentServerId");
      setTimeout(() => router.push("/servers"), 1500);
    } catch {
      setError("Failed to leave server.");
      setIsLeaving(false);
    }
  };

  if (isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leave Server</h1>
        </div>
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FFC341]/10 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC341" strokeWidth="2">
              <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold mb-1">You are the owner</h2>
          <p className="text-sm text-[#72767d] max-w-xs mx-auto">
            As the server owner, you cannot leave. Transfer ownership first if
            you want to leave.
          </p>
          <button
            disabled
            className="mt-4 bg-[#23272a] text-[#72767d] text-sm font-medium px-4 py-2 rounded cursor-not-allowed"
          >
            Leave Server
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leave Server</h1>
        <p className="text-sm text-[#72767d] mt-1">
          You won&apos;t be able to rejoin unless re-invited
        </p>
      </div>

      <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5">
        {error && (
          <div className="mb-4 p-3 bg-[#ed4245]/10 border border-[#ed4245]/20 text-[#ed4245] rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#ed4245]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ed4245" strokeWidth="2">
              <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">
              Leave <span className="text-[#ed4245]">{serverName}</span>?
            </p>
            <p className="text-sm text-[#72767d] mt-0.5">
              You will lose access to all channels and members.
            </p>
          </div>
        </div>

        {!showConfirm ? (
          <div className="flex justify-center">
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm px-4 py-2 rounded"
            >
              Leave Server
            </button>
          </div>
        ) : (
          <div className="border-t border-white/[0.06] pt-4">
            <label className="block text-sm text-[#72767d] mb-1.5">
              Type <span className="text-white font-medium">{serverName}</span> to confirm
            </label>
            <input
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-3 focus:border-[#ed4245] focus:outline-none transition-colors"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={serverName}
              disabled={isLeaving}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setInput("");
                  setError("");
                }}
                disabled={isLeaving}
                className="text-sm text-[#b5bac1] hover:underline px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveServer}
                disabled={isLeaving || input !== serverName}
                className="bg-[#ed4245] text-white font-medium text-sm px-4 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLeaving ? "Leaving..." : "Confirm Leave"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
