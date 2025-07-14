const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
import axios from "axios";

// --- Server APIs ---
export const fetchServers = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/api/newserver/getServers/`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const createServer = async (payload: {
  name: string;
  iconUrl: string;
}) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/newserver/create/`,
    payload,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// --- Channel APIs ---
export const getChannels = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/api/newserver/getServers/`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const fetchChannelsByServer = async (
  serverId: string,
  userId: string
) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/user/${userId}/getChannels`,
    { serverId },
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// --- Message APIs ---
export const uploadMessage = async (payload: {
  message: string;
  senderId: string;
  channelId: string;
  isDM: boolean;
}) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/message/upload`,
    payload,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const fetchMessages = async (
  channelId: string,
  isDM: boolean = false,
  offset: number = 1
) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/message/fetch?channel_id=${channelId}&is_dm=${isDM}&offset=${offset}`,
    {
      withCredentials: true,
    }
  );

  return response.data.messages || [];
};

/**

 * @param userId ID of the user
 */
export const getUserDMs = async (userId: string) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/message/${userId}/getDms`,
    { withCredentials: true }
  );
  return response.data;
};

