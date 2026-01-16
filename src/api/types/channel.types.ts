export interface ChannelRoleAccess {
    id: string;
    role_id: string;
    roles: {
        id: string;
        name: string;
        color: string;
    };
}

export interface ChannelData {
  name: string;
  type: "text" | "voice";
  is_private: boolean;
}

