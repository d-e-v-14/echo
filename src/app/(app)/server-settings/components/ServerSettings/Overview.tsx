import { useState, useRef, useEffect } from "react";
import { updateServer } from "@/api";
import { ServerDetails } from "@/api/types/server.types";

interface OverviewProps {
  serverId: string;
  serverDetails: ServerDetails;
  onServerUpdate: (details: ServerDetails) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function Overview({
  serverId,
  serverDetails,
  onServerUpdate,
  isOwner = false,
  isAdmin = false,
}: OverviewProps) {
  const canEdit = isOwner || isAdmin;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [serverName, setServerName] = useState(serverDetails.name);
  const [serverIcon, setServerIcon] = useState(
    serverDetails.icon_url || "/server-default.png"
  );
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(serverDetails.name);

  useEffect(() => {
    setServerName(serverDetails.name);
    setServerIcon(serverDetails.icon_url || "/server-default.png");
    setEditNameValue(serverDetails.name);
  }, [serverDetails]);

  const handleIconClick = () => {
    if (canEdit) fileInputRef.current?.click();
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setServerIcon(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const updateData: { name?: string } = {};
      if (serverName !== serverDetails.name) updateData.name = serverName;
      const updated = await updateServer(serverId, updateData, iconFile || undefined);
      onServerUpdate(updated);
      setSuccessMessage("Changes saved");
      setIconFile(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save";
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = () => {
    if (editNameValue.trim() && editNameValue.trim() !== serverName) {
      setServerName(editNameValue.trim());
    }
    setShowEditName(false);
  };

  const hasChanges = serverName !== serverDetails.name || iconFile !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-[#72767d] mt-1">
          Configure your server&apos;s general settings
        </p>
      </div>

      <div className=" rounded-lg bg-black overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <img
                className={`w-20 h-20 rounded-full object-cover ${canEdit ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                src={serverIcon}
                alt="Server Icon"
                onClick={handleIconClick}
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleIconChange}
              />
              {canEdit && (
                <button
                  onClick={handleIconClick}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#23272a] border border-white/[0.06] flex items-center justify-center hover:bg-[#2f3136] transition"
                  title="Change icon"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                      fill="#b5bac1"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{serverName}</span>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditNameValue(serverName);
                    setShowEditName(true);
                  }}
                  className="text-[#72767d] hover:text-[#b5bac1] transition p-0.5"
                  title="Edit server name"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {(successMessage || errorMessage || hasChanges) && (
          <div className="px-5 py-3 bg-[#18191c] border-t border-white/[0.06] flex items-center justify-between">
            <div className="text-sm">
              {successMessage && <span className="text-[#3ba55c]">{successMessage}</span>}
              {errorMessage && <span className="text-[#ed4245]">{errorMessage}</span>}
              {!successMessage && !errorMessage && hasChanges && (
                <span className="text-[#FFC341]">Unsaved changes</span>
              )}
            </div>
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`text-sm font-medium px-4 py-1.5 rounded transition-all duration-150 ${
                  hasChanges && !isSaving
                    ? "bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black"
                    : "bg-[#23272a] text-[#72767d] cursor-not-allowed"
                }`}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5">
        <h2 className="text-base font-semibold mb-4">Server Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-sm text-[#72767d]">Server ID</span>
            <span className="text-sm text-[#b5bac1] font-mono">{serverId}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-sm text-[#72767d]">Owner</span>
            <span className="text-sm text-[#b5bac1]">
              {isOwner ? "You" : serverDetails.owner_id}
            </span>
          </div>
          {serverDetails.description && (
            <div className="py-2">
              <span className="text-sm text-[#72767d] block mb-1">Description</span>
              <p className="text-sm text-[#b5bac1]">{serverDetails.description}</p>
            </div>
          )}
        </div>
      </div>

      {showEditName && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272a] border border-white/[0.06] p-5 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold mb-3">Edit Server Name</h3>
            <input
              className="w-full bg-[#111214] text-white border border-white/[0.06] rounded px-3 py-2 text-sm focus:border-[#FFC341] focus:outline-none transition-colors mb-4"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              placeholder="Server Name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setShowEditName(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEditName(false)}
                className="px-3 py-1.5 rounded text-sm text-[#b5bac1] hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                disabled={!editNameValue.trim() || editNameValue.trim() === serverName}
                className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium px-3 py-1.5 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
