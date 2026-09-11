import { apiClient } from "./axios";

export interface UserReportPayload {
  reported_user_id: string;
  server_id?: string;
  channel_id?: string;
  category?: string;
  reason: string;
}

export const submitUserReport = async (
  payload: UserReportPayload
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post("/api/moderate/report", payload);
  return response.data;
};