"use client";

import React from "react";
import { ProfileSection } from "./ProfileSection";

const formatDate = (value: string): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface ProfileMemberSinceProps {
  createdAt?: string | null;
}

export function ProfileMemberSince({ createdAt }: ProfileMemberSinceProps) {
  if (!createdAt) return null;
  const formatted = formatDate(createdAt);
  if (!formatted) return null;

  return (
    <ProfileSection title="Member Since">
      <p className="text-sm font-medium text-[#b5bac1]">{formatted}</p>
    </ProfileSection>
  );
}
