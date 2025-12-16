"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteServer, transferServerOwnership, getServerMembers } from "@/app/api/API";
import { getUser } from "@/app/api";

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

export default function DangerZone({ serverId, serverName, isOwner }: DangerZoneProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

  if (!isOwner) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Danger Zone</h3>
        <p className="text-gray-400 text-sm">
          Only the server owner can access these settings.
        </p>
      </div>
    );
  }

  const handleDeleteServer = async () => {
    if (deleteConfirmText !== serverName) {
      return;
    }

    try {
      setLoading(true);
      await deleteServer(serverId);
      router.push("/servers");
    } catch (error: any) {
      console.error("Error deleting server:", error);
      alert(error.message || "Failed to delete server");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const loadMembers = async () => {
    try {
      setMembersLoading(true);
      const [response, currentUser] = await Promise.all([
        getServerMembers(serverId),
        getUser()
      ]);
      
      // The backend returns the members array directly, not wrapped in an object
      const allMembers = Array.isArray(response) ? response : response.members || response.data || [];
      
      // Extract user data and filter out current owner
      const processedMembers = allMembers
        .map((member: any) => ({
          id: member.users?.id || member.user_id,
          username: member.users?.username || member.username,
          displayName: member.users?.fullname || member.fullname || member.displayName,
          avatar_url: member.users?.avatar_url || member.avatar_url
        }))
        .filter((member: any) => member.id && member.id !== currentUser?.id);
      
      setMembers(processedMembers);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;

    try {
      setLoading(true);
      await transferServerOwnership(serverId, selectedNewOwner);
      router.push("/servers");
    } catch (error: any) {
      console.error("Error transferring ownership:", error);
      alert(error.message || "Failed to transfer ownership");
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
      <div className="bg-[#2f3136] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
        
        {/* Transfer Ownership */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-white mb-2">Transfer Ownership</h4>
          <p className="text-gray-400 text-sm mb-4">
            Transfer server ownership to another member. You will lose all administrative privileges.
          </p>
          <button
            onClick={openTransferModal}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium transition-colors"
          >
            Transfer Ownership
          </button>
        </div>

        {/* Delete Server */}
        <div>
          <h4 className="text-md font-medium text-white mb-2">Delete Server</h4>
          <p className="text-gray-400 text-sm mb-4">
            Permanently delete this server and all its data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
          >
            Delete Server
          </button>
        </div>
      </div>

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Transfer Ownership</h3>
            <p className="text-gray-400 text-sm mb-6">
              Select a member to transfer ownership to. You will lose all administrative privileges.
            </p>

            {membersLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading members...</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No other members available</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                        selectedNewOwner === member.id
                          ? "bg-blue-600"
                          : "bg-[#2f3136] hover:bg-[#404249]"
                      }`}
                      onClick={() => setSelectedNewOwner(member.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center mr-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {member.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{member.displayName || member.username}</p>
                        <p className="text-gray-400 text-sm">@{member.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!selectedNewOwner || loading || membersLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {loading ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Server Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Delete Server</h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to delete <strong className="text-white">{serverName}</strong>?
              This action cannot be undone and will permanently delete:
            </p>
            <ul className="text-gray-400 text-sm mb-6 list-disc list-inside space-y-1">
              <li>All channels and messages</li>
              <li>All member data</li>
              <li>All server settings</li>
              <li>All uploaded files</li>
            </ul>
            <p className="text-gray-400 text-sm mb-4">
              To confirm, type the server name: <strong className="text-white">{serverName}</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Enter server name"
              className="w-full px-3 py-2 bg-[#2f3136] border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-6"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteServer}
                disabled={deleteConfirmText !== serverName || loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {loading ? "Deleting..." : "Delete Server"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
