export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

export type RelationshipStatus = "none" | "pending" | "accepted" | "rejected";

export interface ProfileRole {
  id: string;
  name: string;
  color?: string | null;
}

export interface ProfileCardUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  customStatus?: string | null;
  createdAt?: string | null;
  presence?: PresenceStatus | null;
  roles?: ProfileRole[];
}

export interface ProfileCardFallback {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}
