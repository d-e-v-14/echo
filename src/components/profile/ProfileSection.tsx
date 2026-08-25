"use client";

import React from "react";

interface ProfileSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <section className="min-w-0">
      {title && (
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#72767d]">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
