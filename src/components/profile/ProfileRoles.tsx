"use client";

import React from "react";
import { ProfileSection } from "./ProfileSection";
import type { ProfileRole } from "./profile.types";

interface ProfileRolesProps {
  roles?: ProfileRole[];
  loading?: boolean;
}

export function ProfileRoles({ roles, loading }: ProfileRolesProps) {
  if (loading) {
    return (
      <ProfileSection title="Roles">
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-6 w-20 rounded-full" />
          ))}
        </div>
      </ProfileSection>
    );
  }

  if (!roles || roles.length === 0) return null;

  return (
    <ProfileSection title="Roles">
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role, index) => {
          const color = role.color || "#b5bac1";
          return (
            <span
              key={`${role.id}-${index}`}
              title={role.name}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs font-medium"
              style={{ color }}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{role.name}</span>
            </span>
          );
        })}
      </div>
    </ProfileSection>
  );
}
