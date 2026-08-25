"use client";

import React from "react";
import { ProfileSection } from "./ProfileSection";

interface ProfileAboutProps {
  bio?: string | null;
  loading?: boolean;
}

export function ProfileAbout({ bio, loading }: ProfileAboutProps) {
  if (loading) {
    return (
      <ProfileSection title="About Me">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton h-3.5 w-4/5 rounded" />
        </div>
      </ProfileSection>
    );
  }

  return (
    <ProfileSection title="About Me">
      <p
        className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
          bio ? "text-[#b5bac1]" : "text-[#72767d]"
        }`}
      >
        {bio || "No bio yet."}
      </p>
    </ProfileSection>
  );
}
