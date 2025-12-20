"use client";

import React from "react";

/* -------------------- TYPES -------------------- */

interface Role {
  id: string;
  name: string;
  color?: string; // hex color like #ff0000
}

interface MentionContentProps {
  content: string;
  currentUserId?: string;
  currentUsername?: string;
  serverRoles: Role[];

  onMentionClick?: (userId: string, username: string) => void;
  onRoleMentionClick?: (roleName: string) => void;
}

/* -------------------- HELPERS -------------------- */


const isDarkColor = (hex: string) => {
  const c = hex.replace("#", "");
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
};

const hexToRgba = (hex: string, alpha = 0.25) => {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
/* -------------------- COMPONENT -------------------- */

export default function MessageContentWithMentions({
  content,
  currentUserId,
  currentUsername,
  serverRoles,
  onMentionClick,
  onRoleMentionClick,
}: MentionContentProps) {
  const renderContent = () => {
    if (!content) return null;

    const everyoneMentionRegex = /@(everyone|here)\b/g;
    const roleMentionRegex = /@&([a-zA-Z_][a-zA-Z0-9_\s]*)\b/g;
    const userMentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let keyIndex = 0;

    const mentions: Array<{
      start: number;
      end: number;
      type: "user" | "role" | "everyone";
      match: string;
    }> = [];

    const usedPositions = new Set<number>();

    /* -------------------- EVERYONE -------------------- */
    Array.from(content.matchAll(everyoneMentionRegex)).forEach((match) => {
      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: "everyone",
        match: match[0],
      });

      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    /* -------------------- ROLE (VALIDATED) -------------------- */
    Array.from(content.matchAll(roleMentionRegex)).forEach((match) => {
      const roleName = match[1].trim();

      const role = serverRoles.find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase()
      );

      if (!role) return; // ❌ invalid role → ignore

      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (!isOverlapping) {
        mentions.push({
          start: match.index!,
          end: match.index! + match[0].length,
          type: "role",
          match: match[0],
        });

        for (let i = match.index!; i < match.index! + match[0].length; i++) {
          usedPositions.add(i);
        }
      }
    });

    /* -------------------- USER -------------------- */
    Array.from(content.matchAll(userMentionRegex)).forEach((match) => {
      const username = match[1];

      if (username === "everyone" || username === "here") return;

      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (!isOverlapping) {
        mentions.push({
          start: match.index!,
          end: match.index! + match[0].length,
          type: "user",
          match: match[0],
        });

        for (let i = match.index!; i < match.index! + match[0].length; i++) {
          usedPositions.add(i);
        }
      }
    });

    mentions.sort((a, b) => a.start - b.start);

    /* -------------------- RENDER -------------------- */
    mentions.forEach((mention) => {
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

      const username = mention.match.substring(1);
      const roleName =
        mention.type === "role" ? mention.match.substring(2) : "";

      const role =
        mention.type === "role"
          ? serverRoles.find(
              (r) => r.name.toLowerCase() === roleName.toLowerCase()
            )
          : null;

      const isCurrentUser =
        mention.type === "user" &&
        (username === currentUsername || username === currentUserId);

      parts.push(
        <span
          key={keyIndex++}
          className="inline-flex items-center text-xs font-bold tracking-wide"
          style={
            mention.type === "role" && role?.color
              ? {
                  /* 🔥 SOLID ROLE PILL — NO TRANSPARENCY */
                  backgroundColor: role.color,
                  color: "#000000",

                  /* force visual separation */
                  opacity: 1,
                  isolation: "isolate",
                  mixBlendMode: "normal",

                  /* shape */
                  borderRadius: "6px",
                  padding: "2px 6px",

                  /* prevent parent effects */
                  filter: "none",
                  backdropFilter: "none",
                }
              : undefined
          }
          onMouseEnter={(e) => {
            if (mention.type === "role" && role?.color) {
              e.currentTarget.style.boxShadow = `0 0 14px ${hexToRgba(
                role.color,
                0.9
              )}`;
            }
          }}
          onMouseLeave={(e) => {
            if (mention.type === "role" && role?.color) {
              e.currentTarget.style.boxShadow = `0 0 8px ${hexToRgba(
                role.color,
                0.6
              )}`;
            }
          }}
          onClick={
            mention.type === "user" && onMentionClick
              ? () => onMentionClick(username, username)
              : mention.type === "role" && onRoleMentionClick
              ? () => onRoleMentionClick(roleName)
              : undefined
          }
        >
          {mention.match}
        </span>
      );

      lastIndex = mention.end;
    });

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="text-gray-300 leading-relaxed break-words">
      {renderContent()}
    </div>
  );
}
