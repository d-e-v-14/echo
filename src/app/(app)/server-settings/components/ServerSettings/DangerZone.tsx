"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteServer, transferServerOwnership, getServerMembers, getUser } from "@/api";
import { useToast } from "@/contexts/ToastContext";

interface DangerZoneProps {
  serverId: string;
  serverName: string;
  isOwner: boolean;
}

interface Member {
  id: string;
  username: string;
  displayName?: string;
  avatar_url?: string;
}

export default function DangerZone({
  serverId,
  serverName,
  isOwner,
}: DangerZoneProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Danger Zone</h1>
        </div>
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5">
          <p className="text-sm text-[#72767d]">
            Only the server owner can access these settings.
          </p>
        </div>
      </div>
    );
  }

  const loadMembers = async () => {
    try {
      setMembersLoading(true);
      const [response, currentUser] = await Promise.all([
        getServerMembers(serverId),
        getUser(),
      ]);
      const allMembers = Array.isArray(response) ? response : [];
      setMembers(
        allMembers
          .map((m: any) => ({
            id: m.users?.id || m.user_id,
            username: m.users?.username || m.username,
            displayName: m.users?.fullname || m.fullname,
            avatar_url: m.users?.avatar_url || m.avatar_url,
          }))
          .filter((m: any) => m.id && m.id !== currentUser?.id)
      );
    } catch {
      showToast("Failed to load members", "error");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDeleteServer = async () => {
    if (deleteConfirmText !== serverName) return;
    try {
      setLoading(true);
      await deleteServer(serverId);
      showToast("Server deleted", "success");
      setTimeout(() => router.push("/servers"), 800);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete server", "error");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;
    try {
      setLoading(true);
      await transferServerOwnership(serverId, selectedNewOwner);
      showToast("Ownership transferred", "success");
      setTimeout(() => router.push("/servers"), 800);
    } catch (err: any) {
      showToast(err?.message || "Failed to transfer ownership", "error");
    } finally {
      setLoading(false);
      setShowTransferModal(false);
    }
  };

  const openTransferModal = () => {
    setShowTransferModal(true);
    loadMembers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#ed4245]">Danger Zone</h1>
        <p className="text-sm text-[#72767d] mt-1">
          Irreversible actions for this server
        </p>
      </div>

      <div className="border border-[#ed4245]/20 rounded-lg bg-[#111214]">
        <div className="p-5 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold mb-1">Transfer Ownership</h2>
          <p className="text-sm text-[#72767d] mb-3">
            Transfer server ownership to another member. You will lose all
            administrative privileges.
          </p>
          <div className="flex justify-center">
            <button
              onClick={openTransferModal}
              className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm px-4 py-2 rounded"
            >
              Transfer Ownership
            </button>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-base font-semibold mb-1">Delete Server</h2>
          <p className="text-sm text-[#72767d] mb-3">
            Permanently delete this server and all its data. This cannot be
            undone.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-[#ed4245] text-white font-medium text-sm px-4 py-2 rounded"
            >
              Delete Server
            </button>
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272a] border border-white/[0.06] p-5 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold mb-3">Transfer Ownership</h3>
            {membersLoading ? (
              <p className="text-sm text-[#72767d] text-center py-4">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-[#72767d] text-center py-4">No other members</p>
            ) : (
              <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedNewOwner(member.id)}
                    className={`flex items-center gap-2.5 w-full p-2 rounded text-left transition text-sm ${
                      selectedNewOwner === member.id
                        ? "bg-[#FFC341]/10 border border-[#FFC341]/30"
                        : "hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#23272a] flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} className="w-7 h-7 rounded-full" alt="" />
                      ) : (
                        member.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-medium truncate">
                        {member.displayName || member.username}
                      </div>
                      <div className="text-[10px] text-[#72767d]">@{member.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 text-sm text-[#b5bac1] hover:underline py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!selectedNewOwner || loading}
                className="flex-1 bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm py-2 rounded disabled:opacity-50"
              >
                {loading ? "..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272a] border border-white/[0.06] p-5 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold mb-3">Delete Server</h3>
            <p className="text-sm text-[#72767d] mb-3">
              Type <span className="text-white font-medium">{serverName}</span> to
              confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full bg-[#111214] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-4 focus:border-[#ed4245] focus:outline-none transition-colors"
              placeholder={serverName}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 text-sm text-[#b5bac1] hover:underline py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteServer}
                disabled={deleteConfirmText !== serverName || loading}
                className="flex-1 bg-[#ed4245] text-white font-medium text-sm py-2 rounded disabled:opacity-50"
              >
                {loading ? "..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
