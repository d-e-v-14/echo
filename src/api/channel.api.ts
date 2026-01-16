import {api} from "./axios";
import {ChannelRoleAccess,ChannelData} from "./types/channel.types";

// Get channel role access
export const getChannelRoleAccess = async (channelId: string): Promise<{
    is_private: boolean;
    allowed_roles: ChannelRoleAccess[];
}> => {
    const response = await api.get(`/api/channel/${channelId}/role-access`);
    return response.data;
};

// Set channel role access (Owner/Admin)
export const setChannelRoleAccess = async (channelId: string, data: {
    isPrivate: boolean;
    roleIds: string[];
}): Promise<{ message: string }> => {
    const response = await api.post(`/api/channel/${channelId}/role-access`, data);
    return response.data;
};

// Get channels with access filtering
export const getChannelsWithAccess = async (serverId: string): Promise<Array<{
    id: string;
    name: string;
    type: string;
    is_private: boolean;
}>> => {
    const response = await api.get(`/api/channel/${serverId}/channels-with-access`);
    return response.data;
};
export const createChannel = async (serverId: string, data: ChannelData) => {
  if (!serverId) throw new Error("Missing server ID");

  const response = await api.post(`/api/channel/${serverId}/NewChannel`, data, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
};