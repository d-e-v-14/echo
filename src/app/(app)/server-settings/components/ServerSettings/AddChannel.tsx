"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { createChannel, getAllRoles } from "@/api";
import { ChannelData } from "@/api/types/channel.types";
import { Role } from "@/api/types/roles.types";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useToast } from "@/contexts/ToastContext";

interface AddChannelProps {
  serverId: string;
}

const AddChannel: React.FC<AddChannelProps> = ({ serverId }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ChannelData>({
    name: "",
    type: "text",
    channel_type: "normal",
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedModeratorIds, setSelectedModeratorIds] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    const loadRoles = async () => {
      if (!serverId) return;
      setLoadingRoles(true);
      try {
        const serverRoles = await getAllRoles(serverId);
        setRoles(
          serverRoles.filter(
            (r) => r.role_type !== "owner" && r.role_type !== "admin"
          )
        );
      } catch (error) {
        console.error("Failed to load roles:", error);
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, [serverId]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "channel_type") {
      setSelectedRoleIds([]);
      setSelectedModeratorIds([]);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleModeratorToggle = (roleId: string) => {
    setSelectedModeratorIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Channel name is required", "error");
      return;
    }

    setLoading(true);
    try {
      await createChannel(serverId, {
        name: formData.name,
        type: formData.type,
        channel_type: formData.channel_type || "normal",
        allowed_role_ids:
          formData.channel_type === "role_restricted" ? selectedRoleIds : [],
        moderator_role_ids:
          formData.channel_type === "read_only" ||
          formData.channel_type === "role_restricted"
            ? selectedModeratorIds
            : [],
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.serverChannels(serverId),
      });

      showToast("Channel created", "success");
      setFormData({ name: "", type: "text", channel_type: "normal" });
      setSelectedRoleIds([]);
      setSelectedModeratorIds([]);
    } catch (err: any) {
      showToast(
        err?.response?.data?.error || err?.message || "Failed to create channel",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const permissionHint =
    formData.channel_type === "normal"
      ? "All members can view and send messages"
      : formData.channel_type === "read_only"
        ? "All members can see messages, only admins/mods can send"
        : "Only members with selected roles can view this channel";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Channel</h1>
        <p className="text-sm text-[#72767d] mt-1">
          Add a new channel to your server
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5 space-y-4">
          <div>
            <label className="block text-sm text-[#72767d] mb-1.5">Channel Name</label>
            <input
              type="text"
              name="name"
              placeholder="new-channel"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 focus:border-[#FFC341] focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#72767d] mb-1.5">Channel Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 focus:border-[#FFC341] focus:outline-none transition-colors"
              >
                <option value="text">Text</option>
                {/* Voice channels disabled
                <option value="voice">Voice</option>
                */}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#72767d] mb-1.5">Permission Type</label>
              <select
                name="channel_type"
                value={formData.channel_type}
                onChange={handleChange}
                className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 focus:border-[#FFC341] focus:outline-none transition-colors"
              >
                <option value="normal">Normal</option>
                <option value="read_only">Read Only</option>
                <option value="role_restricted">Role Restricted</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-[#72767d] w-fullbg-[#18191c] rounded px-3 py-2">
            {permissionHint}
          </div>
        </div>

        {formData.channel_type === "role_restricted" && (
          <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5">
            <h3 className="text-base font-semibold mb-1">Who can view this channel?</h3>
            <p className="text-sm text-[#72767d] mb-3">
              Select roles that can access this channel.
            </p>
            {loadingRoles ? (
              <div className="text-sm text-[#72767d]">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-[#72767d]">No roles available.</div>
            ) : (
              <div className="space-y-1">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2.5 p-2 rounded hover:bg-white/[0.04] cursor-pointer transition text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="accent-[#FFC341]"
                    />
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${role.color || "#5865f2"}20`,
                        color: role.color || "#5865f2",
                      }}
                    >
                      {role.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {(formData.channel_type === "read_only" ||
          formData.channel_type === "role_restricted") && (
          <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5">
            <h3 className="text-base font-semibold mb-1">Who can send messages?</h3>
            <p className="text-sm text-[#72767d] mb-3">
              Admins and owners can always send. Select additional moderators.
            </p>
            {loadingRoles ? (
              <div className="text-sm text-[#72767d]">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-[#72767d]">No roles available.</div>
            ) : (
              <div className="space-y-1">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2.5 p-2 rounded hover:bg-white/[0.04] cursor-pointer transition text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModeratorIds.includes(role.id)}
                      onChange={() => handleModeratorToggle(role.id)}
                      className="accent-[#FFC341]"
                    />
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${role.color || "#5865f2"}20`,
                        color: role.color || "#5865f2",
                      }}
                    >
                      {role.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading || !formData.name.trim()}
            className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Channel"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddChannel;
