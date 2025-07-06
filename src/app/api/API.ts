console.log("BASE URL →", process.env.NEXT_PUBLIC_API_BASE_URL);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

import axios from "axios";



// --- Server APIs ---
export const fetchServers = async () => {
  const response = await axios.get(`${API_BASE_URL}/servers`, {
    withCredentials: true,
  });
  return response.data;
};

export const createServer = async (payload: {
  name: string;
  iconUrl: string;
}) => {
  const response = await axios.post(`${API_BASE_URL}/servers`, payload, {
    withCredentials: true,
  });
  return response.data;
};

// --- Channel APIs ---
export const fetchChannelsByServer = async (serverId: string) => {
  const response = await axios.get(`${API_BASE_URL}/channels/${serverId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const createChannel = async (serverId: string, name: string) => {
  const response = await axios.post(
    `${API_BASE_URL}/channel/${serverId}/${name}`,
    null,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// --- Message APIs ---
export const fetchMessages = async (serverId: string, channel: string) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/messages/${serverId}/${channel}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const uploadMessage = async (
  serverId: string,
  channel: string,
  message: { name: string; message: string; avatarUrl: string }
) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/messages/${serverId}/${channel}`,
    message,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
