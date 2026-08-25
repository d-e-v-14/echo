"use client";

import { useState, useEffect } from "react";
import { getServerInvites, createServerInvite, deleteInvite } from "@/api";
import { ServerInvite } from "@/api/types/server.types";
import { useToast } from "@/contexts/ToastContext";
import Skeleton from "@/components/loading/Skeleton";

interface InvitePeopleProps {
  serverId: string;
}

export default function InvitePeople({ serverId }: InvitePeopleProps) {
  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [expiresAfter, setExpiresAfter] = useState("7 days");
  const [maxUses, setMaxUses] = useState("No limit");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadInvites();
  }, [serverId]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      const response = await getServerInvites(serverId);
      setInvites(response);
      if (response.length > 0) {
        setInviteLink(`${window.location.origin}/invite/${response[0].id}`);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setPermissionDenied(true);
      } else {
        showToast("Failed to load invites", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      setGenerating(true);
      const response = await createServerInvite(serverId, {
        expiresAfter: expiresAfter === "Never" ? undefined : expiresAfter,
        maxUses: maxUses === "No limit" ? undefined : maxUses,
      });
      const inviteId = response.invite?.id;
      setInviteLink(inviteId ? `${window.location.origin}/invite/${inviteId}` : "");
      showToast("New invite link generated", "success");
      loadInvites();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || "Failed to generate invite",
        "error"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm("Delete this invite?")) return;
    try {
      await deleteInvite(serverId, inviteId);
      showToast("Invite deleted", "success");
      loadInvites();
    } catch {
      showToast("Failed to delete invite", "error");
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      showToast("Copied to clipboard", "success");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invites</h1>
        </div>
        <div className="border border-[#FFC341]/20 rounded-lg bg-[#FFC341]/5 p-5">
          <p className="text-sm text-[#b5bac1]">
            You don&apos;t have permission to manage invites. Only admins and
            owners can access this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invites</h1>
        <p className="text-sm text-[#72767d] mt-1">
          Create and manage invite links
        </p>
      </div>

      <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5">
        <h2 className="text-base font-semibold mb-4">Create Invite</h2>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={inviteLink || "Generate a link below"}
            readOnly
            className="flex-1 bg-[#18191c] text-sm text-[#b5bac1] border border-white/[0.06] rounded px-3 py-2 focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            disabled={!inviteLink}
            className="bg-[#23272a] text-[#b5bac1] text-sm font-medium px-3 py-2 rounded border border-white/[0.06] hover:bg-[#2f3136] transition disabled:opacity-50"
          >
            Copy
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-[#72767d] mb-1.5">Expires after</label>
            <select
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 focus:border-[#FFC341] focus:outline-none transition-colors"
              value={expiresAfter}
              onChange={(e) => setExpiresAfter(e.target.value)}
            >
              <option value="30 minutes">30 minutes</option>
              <option value="1 hour">1 hour</option>
              <option value="6 hours">6 hours</option>
              <option value="12 hours">12 hours</option>
              <option value="1 day">1 day</option>
              <option value="7 days">7 days</option>
              <option value="30 days">30 days</option>
              <option value="Never">Never</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#72767d] mb-1.5">Max uses</label>
            <select
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 focus:border-[#FFC341] focus:outline-none transition-colors"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            >
              <option value="No limit">No limit</option>
              <option value="1 use">1 use</option>
              <option value="5 uses">5 uses</option>
              <option value="10 uses">10 uses</option>
              <option value="25 uses">25 uses</option>
              <option value="50 uses">50 uses</option>
              <option value="100 uses">100 uses</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGenerateLink}
            disabled={generating}
            className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm px-4 py-2 rounded disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate New Link"}
          </button>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="border border-white/[0.06] rounded-lg bg-[#111214]">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <h2 className="text-base font-semibold">Active Invites</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    Invite #{invite.id.slice(-6)}
                  </div>
                  <div className="text-sm text-[#72767d]">
                    {invite.people_joined} joined
                    {invite.use_limit ? ` / ${invite.use_limit} uses` : ""}
                    {invite.expiry
                      ? ` · expires ${new Date(invite.expiry).toLocaleDateString()}`
                      : " · never expires"}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 ml-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/invite/${invite.id}`
                      );
                      showToast("Copied", "success");
                    }}
                    className="text-[#b5bac1] text-xs px-2 py-1 rounded hover:bg-white/[0.06] transition"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleDeleteInvite(invite.id)}
                    className="text-[#ed4245] text-xs px-2 py-1 rounded hover:bg-[#ed4245]/10 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
