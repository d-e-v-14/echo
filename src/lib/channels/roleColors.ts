export interface RoleColorInfo {
  id: string;
  color?: string | null;
  position?: number | null;
  role_type?: string | null;
}

export const normalizeRoleColor = (color?: string | null): string | null => {
  if (typeof color !== "string") return null;
  const trimmed = color.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const roleTypeWeight = (roleType?: string | null): number => {
  const normalized = (roleType || "").trim().toLowerCase();
  if (normalized === "owner") return 3;
  if (normalized === "admin") return 2;
  return 1;
};

export const getHighestPriorityRoleColor = (
  memberRoleIds: readonly string[] | null | undefined,
  rolesById: Map<string, RoleColorInfo>
): string | null => {
  let bestColor: string | null = null;
  let bestWeight = -1;
  let bestPosition = -1;

  for (const roleId of memberRoleIds || []) {
    const role = rolesById.get(roleId);
    if (!role) continue;

    const color = normalizeRoleColor(role.color);
    if (!color) continue;

    const weight = roleTypeWeight(role.role_type);
    const position = typeof role.position === "number" ? role.position : 0;

    if (
      weight > bestWeight ||
      (weight === bestWeight && position > bestPosition)
    ) {
      bestColor = color;
      bestWeight = weight;
      bestPosition = position;
    }
  }

  return bestColor;
};
