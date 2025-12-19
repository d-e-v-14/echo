"use client";

import React from "react";

interface MentionContentProps {
  content: string;
  currentUserId?: string;
  currentUsername?: string; // Add current username for proper comparison
  onMentionClick?: (userId: string, username: string) => void;
}

export default function MessageContentWithMentions({
  content,
  currentUserId,
  currentUsername,
  onMentionClick,
}: MentionContentProps) {
  const renderContent = () => {
    if (!content) return null;

    // patterns:
    // Role mentions: @& followed by role name (alphanumeric, underscore, spaces, but must start with letter/underscore)
    const roleMentionRegex = /@&([a-zA-Z_][a-zA-Z0-9_\s]*)\b/g;
    // Everyone/Here: exact matches only
    const everyoneMentionRegex = /@(everyone|here)\b/g;
    // User mentions: @ followed by username (alphanumeric, underscore, must start with letter/underscore, min 1 char)
    const userMentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    let parts: (string | JSX.Element)[] = [];
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

    const everyoneMatches = Array.from(content.matchAll(everyoneMentionRegex));
    everyoneMatches.forEach((match) => {
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

    /* -------------------- ROLE -------------------- */

    const roleMatches = Array.from(content.matchAll(roleMentionRegex));
    roleMatches.forEach((match) => {
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

    const userMatches = Array.from(content.matchAll(userMentionRegex));
    userMatches.forEach((match) => {
      const username = match[1];

      // ignore everyone/here
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

    mentions.forEach((mention) => {
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

      const username = mention.match.substring(1);
      // Check if this mention is for the current user (compare username, not ID)
      const isCurrentUser =
        mention.type === "user" &&
        currentUsername &&
        username.toLowerCase() === currentUsername.toLowerCase();

      parts.push(
        <span
          key={keyIndex++}
          className={`inline-flex items-center px-1 py-0.5 rounded text-sm font-medium ${
            mention.type === "user"
              ? isCurrentUser
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-blue-500/20 text-blue-300"
              : mention.type === "role"
              ? "bg-purple-500/20 text-purple-300"
              : "bg-yellow-500/20 text-yellow-300"
          }`}
          onClick={
            mention.type === "user" && onMentionClick
              ? () => onMentionClick(username, username)
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

    return parts.map((part, index) =>
      typeof part === "string" ? <span key={index}>{part}</span> : part
    );
  };

  return (
    <div className="text-gray-300 leading-relaxed break-words">
      {renderContent()}
    </div>
  );
}
