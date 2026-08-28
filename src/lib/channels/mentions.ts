import { ChatRole } from "./types";

export const normalizeUsername = (name: string): string => name.trim();

export const normalizeRoleName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

export const isValidUsernameMention = (
  mention: string,
  validUsernames: Set<string>
): boolean => {
  const name = mention.replace("@", "").trim().toLowerCase();
  if (name === "everyone") return true;
  return validUsernames.has(name);
};

export const validateUserMentions = (
  message: string,
  validUsernames: Set<string>
): { valid: boolean; invalidUser?: string } => {
  const userMentionRegex = /@([a-zA-Z0-9_]+)/g;
  let match: RegExpExecArray | null;

  while ((match = userMentionRegex.exec(message)) !== null) {
    if (message.includes(`@&${match[1]}`)) continue;

    const mention = `@${match[1]}`;
    if (mention.toLowerCase() === "@everyone") continue;

    if (!isValidUsernameMention(mention, validUsernames)) {
      return { valid: false, invalidUser: mention };
    }
  }

  return { valid: true };
};

export const validateRoleMentions = (
  message: string,
  validRoles: Set<string>
): { valid: boolean; invalidRole?: string } => {
  const roleMentionRegex = /@&([^\s@]+)/g;
  let match: RegExpExecArray | null;

  while ((match = roleMentionRegex.exec(message)) !== null) {
    const rawRole = match[1];
    const normalized = normalizeRoleName(rawRole);

    if (!validRoles.has(normalized)) {
      return { valid: false, invalidRole: rawRole };
    }
  }

  return { valid: true };
};

export const isContentMentioningMe = (
  content: string,
  options: {
    username?: string;
    roleIds: string[];
    roles: ChatRole[];
    validUsernames?: Set<string>;
  }
): boolean => {
  if (!content) return false;

  if (/@(everyone|here)\b/i.test(content)) return true;

  if (options.username) {
    const escapedUsername = options.username.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    if (new RegExp(`@${escapedUsername}\\b`, "i").test(content)) return true;
  }

  for (const roleId of options.roleIds) {
    const role = options.roles.find((r) => r.id === roleId);
    if (!role) continue;

    const escapedRole = role.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`@&${escapedRole}\\b`, "i").test(content)) return true;

    // Single-token `@Role` form: only a role mention when no server member
    // owns that name (matches backend user-first resolution).
    const tokenMentioned = new RegExp(`@${escapedRole}\\b`, "i").test(content);
    if (tokenMentioned) {
      const nameIsAlsoAUser = (options.validUsernames?.has(role.name.toLowerCase()) ?? false);
      if (!nameIsAlsoAUser) return true;
    }
  }

  return false;
};
