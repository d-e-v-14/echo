"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import JoinServerModal from "@/components/JoinServerModal";

interface JoinServerModalContextType {
  openJoinServerModal: () => void;
}

const JoinServerModalContext = createContext<
  JoinServerModalContextType | undefined
>(undefined);

export function JoinServerModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <JoinServerModalContext.Provider value={{ openJoinServerModal: open }}>
      {children}
      <JoinServerModal isOpen={isOpen} onClose={close} />
    </JoinServerModalContext.Provider>
  );
}

export function useJoinServerModal() {
  const context = useContext(JoinServerModalContext);
  if (!context) {
    throw new Error(
      "useJoinServerModal must be used within JoinServerModalProvider"
    );
  }
  return context;
}
