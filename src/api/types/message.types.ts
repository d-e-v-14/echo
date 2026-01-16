export interface Message {
  id?: string;
  name: string;
  seed: string;
  color: string;
  message: string;
  timestamp: string;
  media_url?: string; // Add media_url field for image support
  mediaUrl?: string; // Also support camelCase variant
  content?: string; // Add content field as backend uses this
  sender_id?: string; // Add sender_id field
  channel_id?: string; // Add channel_id field
}
