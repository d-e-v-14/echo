"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { profile } from "@/api/types/profile.types";
import { getUser } from "@/api";
import { tokenStore } from "@/lib/auth/tokenStore";

type UserContextType = {
  user: profile | null;
  setUser: React.Dispatch<React.SetStateAction<profile | null>>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<profile | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getUser();
        setUser(data);
      } catch (err) {
        console.error("USER LOAD FAILED:", err);
        setUser(null);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const clearOnLogout = () => {
      if (!tokenStore.hasRefreshToken()) setUser(null);
    };
    clearOnLogout();
    return tokenStore.subscribe(clearOnLogout);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
