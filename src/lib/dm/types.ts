export interface DmReplyTarget {
  id: string | number;
  content: string;
  author?: string;
  mediaUrl?: string | null;
  mediaType?: string;
}

export interface DmMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  timestamp: string;
  thread_id?: string;
  media_url?: string | null;
  media_type?: string;
  status?: "pending" | "sent" | "failed";
  replyTo?: DmReplyTarget | null;
}

export interface DmMessagesPage {
  messages: DmMessage[];
  hasMore: boolean;
}

export interface DmMessagesData {
  pages: DmMessagesPage[];
  pageParams: unknown[];
}

export interface DmSummary {
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status?: "pending" | "sent" | "failed";
}