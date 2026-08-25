import { useState, useEffect } from "react";
import { getServerInvites, createServerInvite, deleteInvite } from "@/api";
import { ServerInvite } from "@/api/types/server.types";

interface InvitePeopleProps {
  serverId: string;
}

export default function InvitePeople({ serverId }: InvitePeopleProps) {
  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [expiresAfter, setExpiresAfter] = useState<string>("7 days");
  const [maxUses, setMaxUses] = useState<string>("No limit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

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
        const latestInvite = response[0];
        setInviteLink(`${window.location.origin}/invite/${latestInvite.id}`);
      }
      setError("");
    } catch (err: any) {
      console.error("Error loading invites:", err);
      if (err.response?.status === 403) {
        setPermissionDenied(true);
        setError("");
      } else {
        setError("Failed to load invites");
        setPermissionDenied(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      const expiresAfterStr =
        expiresAfter === "Never" ? undefined : expiresAfter;
      const maxUsesStr = maxUses === "No limit" ? undefined : maxUses;

      const response = await createServerInvite(serverId, {
        expiresAfter: expiresAfterStr,
        maxUses: maxUsesStr,
      });

      const inviteId = response.invite?.id;
      const newLink = inviteId
        ? `${window.location.origin}/invite/${inviteId}`
        : "";
      setInviteLink(newLink);
      setSuccess("New invite link generated successfully");
      loadInvites();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(
        `Failed to generate invite link: ${err.response?.data?.error || err.message}`
      );
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (confirm("Are you sure you want to delete this invite?")) {
      try {
        await deleteInvite(serverId, inviteId);
        setSuccess("Invite deleted successfully");
        loadInvites();

        const deletedInvite = invites.find((inv) => inv.id === inviteId);
        if (deletedInvite && inviteLink.includes(deletedInvite.id)) {
          setInviteLink("");
        }

        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("Error deleting invite:", err);
        setError("Failed to delete invite");
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setSuccess("Invite link copied to clipboard");
      setTimeout(() => setSuccess(""), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-8 text-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading invites...</div>
        </div>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="max-w-lg mx-auto p-8 text-white">
        <h1 className="text-2xl font-bold mb-8">Invite People</h1>
        <div className="bg-[#FFC341]/10 border border-[#FFC341]/30 rounded p-6">
          <div className="flex items-center mb-4">
            <svg
              className="w-6 h-6 text-[#FFC341] mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-[#FFC341]">
              Access Restricted
            </h3>
          </div>
          <p className="text-[#b5bac1] mb-4">
            You don&apos;t have permission to view or manage server invites.
            Only server admins and owners can access this feature.
          </p>
          <p className="text-[#72767d] text-sm">
            Contact a server administrator if you need to invite someone to this
            server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Invite People</h1>

      {error && (
        <div className="bg-[#ed4245]/10 border border-[#ed4245]/30 text-[#ed4245] p-3 rounded mb-4">{error}</div>
      )}

      {success && (
        <div className="bg-[#3ba55c]/10 border border-[#3ba55c]/30 text-[#3ba55c] p-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-7">
        <label className="block text-sm text-[#b5bac1] mb-2 font-semibold">
          Invite Link
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inviteLink || "Generate a new invite link"}
            readOnly
            className="bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 text-base flex-1 focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
          />
          <button
            className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-bold rounded px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCopyLink}
            disabled={!inviteLink}
          >
            Copy
          </button>
        </div>
      </div>
      <div className="flex gap-6 mb-8 flex-col md:flex-row">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm text-[#b5bac1] mb-2 font-semibold">
            Expires after
          </label>
          <div className="relative w-full">
            <select
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 pr-10 appearance-none focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
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
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-5 h-5 text-[#b5bac1]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm text-[#b5bac1] mb-2 font-semibold">
            Max number of uses
          </label>
          <div className="relative w-full">
            <select
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 pr-10 appearance-none focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
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
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-5 h-5 text-[#b5bac1]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-bold rounded px-6 py-2.5 transition-all duration-200 hover:-translate-y-0.5"
          onClick={handleGenerateLink}
        >
          Generate New Link
        </button>
      </div>

      {invites.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">Existing Invites</h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="bg-[#23272a] border border-[#72767d] rounded p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">
                    Invite #{invite.id.slice(-6)}
                  </div>
                  <div className="text-xs text-[#b5bac1]">
                    Uses: {invite.people_joined}
                    {invite.use_limit
                      ? ` / ${invite.use_limit}`
                      : " / unlimited"}
                  </div>
                  <div className="text-xs text-[#b5bac1]">
                    {invite.expiry
                      ? `Expires: ${new Date(invite.expiry).toLocaleDateString()}`
                      : "Never expires"}
                  </div>
                  <div
                    className={`text-xs mt-1 ${invite.is_valid ? "text-green-400" : "text-red-400"}`}
                  >
                    {invite.is_valid ? "Active" : "Expired"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/invite/${invite.id}`;
                      navigator.clipboard.writeText(link);
                      setSuccess("Invite link copied to clipboard");
                      setTimeout(() => setSuccess(""), 2000);
                    }}
                    className="bg-[#23272a] text-white px-3 py-1 rounded text-sm border border-[#72767d] hover:bg-[#2f3136] transition"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleDeleteInvite(invite.id)}
                    className="bg-[#23272a] text-[#ed4245] px-3 py-1 rounded text-sm border border-[#ed4245]/30 hover:bg-[#ed4245]/10 transition"
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
