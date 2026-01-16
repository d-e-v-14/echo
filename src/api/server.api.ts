import {api} from "./axios";
import {ServerDetails,ServerMember,ServerInvite} from "./types/server.types";
import {SearchUser,BannedUser} from "./types/user.types";
import {getUser} from "./profile.api";


// Get server details
export const getServerDetails = async (serverId: string): Promise<ServerDetails> => {
    const [serverResponse, user] = await Promise.all([
        api.get(`/api/newserver/${serverId}`),
        getUser()
    ]);
    
    const serverData = serverResponse.data;
    const isOwner = user?.id === serverData.owner_id;
    
    return {
        ...serverData,
        isOwner
    };
};

// Update server
export const updateServer = async (serverId: string, data: { name?: string }, iconFile?: File): Promise<ServerDetails> => {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (iconFile) formData.append('icon', iconFile);

    const response = await api.put(`/api/newserver/${serverId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.server;
};


// Get server members
export const getServerMembers = async (serverId: string): Promise<ServerMember[]> => {
    const response = await api.get(`/api/newserver/${serverId}/members`);
    return response.data;
};


// Kick member
export const kickMember = async (serverId: string, userId: string): Promise<void> => {
    await api.delete(`/api/newserver/${serverId}/members/${userId}/kick`);
};

// Ban member
export const banMember = async (serverId: string, userId: string, reason?: string): Promise<void> => {
    await api.post(`/api/newserver/${serverId}/members/${userId}/ban`, { reason });
};

// Get banned users
export const getBannedUsers = async (serverId: string): Promise<BannedUser[]> => {
    const response = await api.get(`/api/newserver/${serverId}/bans`);
    return response.data;
};

// Unban user
export const unbanUser = async (serverId: string, userId: string): Promise<void> => {
    await api.delete(`/api/newserver/${serverId}/members/${userId}/unban`);
};

// Add user to server
export const addUserToServer = async (serverId: string, username: string): Promise<void> => {
    await api.post(`/api/newserver/${serverId}/members`, { username });
};

// Search users
export const searchUsers = async (query: string): Promise<SearchUser[]> => {
    const response = await api.get(`/api/newserver/search/users?q=${encodeURIComponent(query)}`);
    return response.data;
};

// Get server invites
export const getServerInvites = async (serverId: string): Promise<ServerInvite[]> => {
    const response = await api.get(`/api/newserver/${serverId}/invites`);
    return response.data;
};

// Create server invite
export const createServerInvite = async (serverId: string, options: { expiresAfter?: string; maxUses?: string }): Promise<{ invite: ServerInvite & { inviteLink: string } }> => {
    const response = await api.post(`/api/newserver/${serverId}/invites`, options);
    return response.data;
};


// Delete invite
export const deleteInvite = async (inviteId: string): Promise<void> => {
    await api.delete(`/api/invites/${inviteId}`);
};

// Leave server
export const leaveServer = async (serverId: string): Promise<void> => {
    await api.post(`/api/newserver/${serverId}/leave`);
};

// Delete server
export const deleteServer = async (serverId: string): Promise<void> => {
    await api.delete(`/api/newserver/${serverId}`);
};

// Get available permissions
export const getAvailablePermissions = async (): Promise<string[]> => {
    const response = await api.get('/api/roles/permissions');
    return response.data;
};