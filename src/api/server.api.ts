import { apiClient } from "./axios";
import { ServerDetails, ServerInvite } from "./types/server.types";
import { BannedUser, SearchUserResult } from "./types/user.types";
import { getUser } from "./profile.api";
import { Server } from "@/api/types/server.types";

export const getServerDetails = async (
  serverId: string
): Promise<ServerDetails> => {
  const [serverResponse, user] = await Promise.all([
    apiClient.get(`/api/newserver/${serverId}`),
    getUser(),
  ]);

  const serverData = serverResponse.data;
  const isOwner = user?.id === serverData.owner_id;

  return {
    ...serverData,
    isOwner,
  };
};

export const updateServer = async (
  serverId: string,
  data: { name?: string },
  iconFile?: File
): Promise<ServerDetails> => {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (iconFile) formData.append("icon", iconFile);

  const [response, user] = await Promise.all([
    apiClient.put(`/api/newserver/${serverId}`, formData),
    getUser(),
  ]);

  const updatedServer = response.data.server;
  const isOwner = user?.id === updatedServer.owner_id;

  return {
    ...updatedServer,
    isOwner,
  };
};

export const kickMember = async (
  serverId: string,
  userId: string
): Promise<void> => {
  await apiClient.delete(`/api/newserver/${serverId}/members/${userId}/kick`);
};

export const banMember = async (
  serverId: string,
  userId: string,
  reason?: string
): Promise<void> => {
  await apiClient.post(`/api/newserver/${serverId}/members/${userId}/ban`, {
    reason,
  });
};

export const getBannedUsers = async (
  serverId: string
): Promise<BannedUser[]> => {
  const response = await apiClient.get(`/api/newserver/${serverId}/bans`);
  return response.data;
};

export const unbanUser = async (
  serverId: string,
  userId: string
): Promise<void> => {
  await apiClient.delete(`/api/newserver/${serverId}/members/${userId}/unban`);
};

export const addUserToServer = async (
  serverId: string,
  username: string
): Promise<void> => {
  await apiClient.post(`/api/newserver/${serverId}/members`, { username });
};

export const searchUsers = async (
  query: string
): Promise<SearchUserResult[]> => {
  try {
    const response = await apiClient.get<SearchUserResult[]>(
      `/api/friends/search`,
      {
        params: { q: query },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error searching users:",
      error?.response?.data || error.message
    );
    throw error;
  }
};

export const getServerInvites = async (
  serverId: string
): Promise<ServerInvite[]> => {
  const response = await apiClient.get(`/api/newserver/${serverId}/invites`);
  return response.data;
};

export const createServerInvite = async (
  serverId: string,
  options: { expiresAfter?: string; maxUses?: string }
): Promise<{ invite: ServerInvite }> => {
  const response = await apiClient.post(
    `/api/newserver/${serverId}/invites`,
    options
  );
  return response.data;
};

export const deleteInvite = async (
  serverId: string,
  inviteId: string
): Promise<void> => {
  await apiClient.delete(`/api/newserver/${serverId}/invites/${inviteId}`);
};

export const leaveServer = async (serverId: string): Promise<void> => {
  await apiClient.post(`/api/newserver/${serverId}/leave`);
};

export const getAvailablePermissions = async (): Promise<string[]> => {
  const response = await apiClient.get("/api/roles/permissions");
  return response.data;
};

export const createServer = async (payload: {
  name: string;
  icon?: File;
}): Promise<Server> => {
  try {
    const formData = new FormData();
    formData.append("name", payload.name);
    if (payload.icon) {
      formData.append("icon", payload.icon);
    }
    const response = await apiClient.post<Server>(
      "/api/newserver/create/",
      formData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating server:", error);
    throw error;
  }
};

export const fetchServers = async (): Promise<Server[]> => {
  try {
    const response = await apiClient.get(`/api/newserver/getServers/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching servers:", error);
    throw error;
  }
};

export const joinServer = async (inviteCode: string) => {
  try {
    const res = await apiClient.post("/api/newserver/joinwithinvite", {
      inviteCode,
    });

    if (!res.data?.success) {
      const error: any = new Error(
        res.data?.message || "Failed to join the server."
      );
      error.code = res.data?.code;
      throw error;
    }

    return res.data;
  } catch (err: any) {
    const data = err?.response?.data;
    const error: any = new Error(
      data?.message ||
        data?.error ||
        err?.message ||
        "Failed to join the server."
    );
    error.code = data?.code;
    throw error;
  }
};

export const deleteServer = async (serverId: string): Promise<any> => {
  try {
    const response = await apiClient.delete(`/api/newserver/${serverId}`);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error deleting server:",
      error.response?.data || error.message || error
    );
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to delete server.";
    throw new Error(errorMessage);
  }
};

export const transferServerOwnership = async (
  serverId: string,
  newOwnerId: string
): Promise<any> => {
  try {
    const response = await apiClient.post(
      `/api/newserver/${serverId}/transfer-ownership`,
      {
        newOwnerId,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error transferring ownership:",
      error.response?.data || error.message || error
    );
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to transfer ownership.";
    throw new Error(errorMessage);
  }
};

export const getServerMembers = async (serverId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/newserver/${serverId}/members`);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error getting server members:",
      error.response?.data || error.message || error
    );
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to get server members.";
    throw new Error(errorMessage);
  }
};
