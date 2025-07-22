import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

// ---------- Types ----------
export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Message {
  id?: string;
  name: string;
  seed: string;
  color: string;
  message: string;
  timestamp: string;
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

// ---------- Token Utilities ----------
const getToken = (): string | null =>
  typeof window !== "undefined"
    ? localStorage.getItem("token") || localStorage.getItem("supabase_token")
    : null;

const getUserIdFromToken = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payloadBase64));
    return decodedPayload.sub || null;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};

// ---------- Axios Setup ----------
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status)) {
      console.error("Authentication failed:", error.response?.data);
    }
    return Promise.reject(error);
  }
);

export const createServer = async (payload: {
  name: string;
  iconUrl?: string;
  ownerId: string;
  icon?: File;
}): Promise<Server> => {
  try {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("ownerId", payload.ownerId);
    if (payload.icon) {
      formData.append("icon", payload.icon);
    }

    const response = await apiClient.post<Server>(
      "/api/newserver/create/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating server:", error);
    throw error;
  }
};

export const fetchServers = async (): Promise<Server[]> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await apiClient.get("/api/newserver/getServers/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching servers:", error);
    throw error;
  }
};

// ---------- Channel APIs ----------
export const fetchChannelsByUser = async (userId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/user/${userId}/getChannels`);
    return response.data;
  } catch (error) {
    console.error("Error fetching channels:", error);
    return null;
  }
};

// ---------- Message APIs ----------
export const uploadMessage = async (payload: {
  message: string;
  senderId: string;
  channelId: string;
  isDM: boolean;
}): Promise<Message> => {
  try {
    const response = await apiClient.post<Message>(
      "/api/message/upload",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading message:", error);
    throw error;
  }
};

export const fetchMessages = async (
  channelId: string,
  isDM: boolean = false,
  offset: number = 1
): Promise<ApiResponse<Message[]>> => {
  try {
    const response = await apiClient.get<{
      messages?: Message[];
      data?: Message[];
    }>(
      `/api/message/fetch?channel_id=${channelId}&is_dm=${isDM}&offset=${offset}`
    );

    const messages = response.data.messages || response.data.data || [];

    return { data: messages };
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

// ---------- Direct Messages ----------
export const getUserDMs = async (userId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/message/${userId}/getDms`);
    return response.data;
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      console.error("Request timed out");
      throw new Error("Request timed out. Please try again.");
    }
    console.error("Error fetching DMs:", error.message || error);
    throw new Error("Error fetching DMs");
  }
};

// ---------- Auth Utils ----------
export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("supabase_token");
  }
};

export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

export const getLoggedInUserId = (): string | null => {
  return getUserIdFromToken(getToken());
};
