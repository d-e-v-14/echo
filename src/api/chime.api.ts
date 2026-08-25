import { apiClient } from "./axios";
import { ChimeMeetingResponse } from "./types/chime.types";

export const joinChimeMeeting = async (
  channelId: string,
  userId: string
): Promise<ChimeMeetingResponse> => {
  try {
    const response = await apiClient.post<ChimeMeetingResponse>(
      "/api/chime/join",
      {
        channelId,
        userId,
      }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to join voice channel.";
    throw new Error(errorMessage);
  }
};

export const leaveChimeMeeting = async (
  channelId: string,
  attendeeId: string
): Promise<void> => {
  try {
    await apiClient.post("/api/chime/leave", {
      channelId,
      attendeeId,
    });
  } catch (error: any) {
    console.error(
      "Error leaving Chime meeting:",
      error.response?.data || error.message || error
    );
  }
};

export const getChimeMeetingAttendees = async (
  channelId: string
): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/api/chime/attendees/${channelId}`);
    return response.data.attendees || [];
  } catch (error: any) {
    console.error(
      "Error getting Chime attendees:",
      error.response?.data || error.message || error
    );
    return [];
  }
};

