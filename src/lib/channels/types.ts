export type MessageStatus = "pending" | "sent" | "failed";

export interface MessageReply {
  id: string | number;
  content: string;
  author: string;
  avatarUrl?: string;
  mediaUrl?: string | null;
  mediaType?: string;
}

export interface ChannelMessage {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
  username?: string;
  file?: string;
  mediaUrl?: string;
  mediaType?: string;
  replyTo?: MessageReply | null;
  status?: MessageStatus;
  tempId?: string;
}

export interface ChannelMessagesPage {
  messages: ChannelMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface ChannelMessagesData {
  pages: ChannelMessagesPage[];
  pageParams: unknown[];
}

export interface ChannelPermissions {
  channelType: string;
  canView: boolean;
  canSend: boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

export interface ChatRole {
  id: string;
  name: string;
  color?: string;
}

export interface ChatMember {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface MessageGroup {
  key: string;
  senderId: string;
  name: string;
  isSender: boolean;
  avatarUrl?: string;
  messages: Array<ChannelMessage & { timeLabel: string }>;
}

export interface MessageSection {
  dayLabel: string;
  groups: MessageGroup[];
}

export const DEFAULT_AVATAR = "/User_profil.png";
