import {api,apiClient} from "./axios";
import {Message} from "./types/message.types";
import {ApiResponse} from "./types/common.types";
import {getUser} from "./profile.api"

export const uploadMessage = async (payload: {
  file?: File;
  content?: string;
  sender_id?: string; // Optional, server can get from session
  channel_id: string;
  reply_to?: string | number;
}): Promise<Message> => {
  try {
    const formData = new FormData();

    // Use exact field names as specified by backend
    formData.append("sender_id", payload.sender_id || "");
    formData.append("channel_id", payload.channel_id);
    formData.append("content", payload.content || "");
    if (payload.reply_to !== undefined && payload.reply_to !== null) {
      formData.append("reply_to", String(payload.reply_to));
    }
    if (payload.file) formData.append("file", payload.file);

    const response = await apiClient.post("/api/message/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading message:", error);
    throw error;
  }
};

export const uploaddm = async (payload: {
  mediaurl?: File;
  message: string;
  sender_id: string;
  receiver_id: string;
}) => {
  try {
    const formData = new FormData();
    
    // Use exact field names as specified by backend
    formData.append("receiver_id", payload.receiver_id);
    formData.append("sender_id", payload.sender_id);
    formData.append("content", payload.message || "");
    if (payload.mediaurl) formData.append("file", payload.mediaurl);

    const response = await apiClient.post('/api/message/upload_dm', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading DM:", error);
    throw error;
  }
};

export const fetchMessages = async (channel_id: string, offset: number = 0): Promise<ApiResponse<Message[]> & { hasMore?: boolean; totalCount?: number }> => {
  try {
    const response = await apiClient.get<{
      messages?: Message[];
      data?: Message[];
      hasMore?: boolean;
      totalCount?: number;
    }>(
      `/api/message/fetch?channel_id=${channel_id}&offset=${offset}`
    );

    const messages = response.data.messages || response.data.data || [];
    return { 
      data: messages,
      hasMore: response.data.hasMore,
      totalCount: response.data.totalCount
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};


export const getUserDMs = async (): Promise<any> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    const response = await apiClient.get(`/api/message/${user.id}/getDms`);
    
    return {
      data: response.data,
      success: true
    };
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      console.error(" Request timed out");
      throw new Error("Request timed out. Please try again.");
    }
    
    if (error.message === 'User not authenticated') {
      console.error(" Authentication error:", error.message);
      throw new Error("Please login to view messages");
    }

    console.error("Error fetching DMs:", error.message || error);
    throw new Error("Failed to fetch messages. Please try again later.");
  }
};

// Get unread message counts
export const getUnreadMessageCounts = async (): Promise<{ unreadCounts: Record<string, number>; totalUnread: number }> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    const response = await apiClient.get(`/api/message/${user.id}/unread-counts`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching unread counts:", error.message || error);
    return { unreadCounts: {}, totalUnread: 0 };
  }
};

// Mark thread as read
export const markThreadAsRead = async (threadId: string): Promise<void> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    await apiClient.post(`/api/message/thread/${threadId}/mark-read`, {
      userId: user.id
    });
  } catch (error: any) {
    console.error("Error marking thread as read:", error.message || error);
  }
};

