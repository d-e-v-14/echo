import { apiClient } from "./axios";

export interface UserReportPayload {
  reported_user_id: string;
  server_id?: string;
  channel_id?: string;
  category?: string;
  reason: string;
  message_id?: string;
  message?: string;
}

export const submitUserReport = async (
  payload: UserReportPayload
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post("/api/moderate/report", payload);
  return response.data;
};

export interface ServerReportUser {
  id: string;
  username: string | null;
  fullname: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface ServerReportServer {
  id: string;
  name: string | null;
}

export interface ServerReportChannel {
  id: string;
  name: string | null;
}

export interface ServerUserReport {
  id: string;
  category: string | null;
  reason: string;
  status: string;
  created_at: string;
  message_id: string | null;
  message_content: string | null;
  server: ServerReportServer | null;
  channel: ServerReportChannel | null;
  reporter: ServerReportUser | null;
  reported: ServerReportUser | null;
}

export const getServerReports = async (
  serverId: string
): Promise<ServerUserReport[]> => {
  const response = await apiClient.get("/api/moderate/reports", {
    params: { serverId },
  });
  const payload = response.data;
  return Array.isArray(payload) ? payload : payload?.data ?? [];
};