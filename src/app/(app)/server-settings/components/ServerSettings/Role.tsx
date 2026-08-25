"use client";
import { useState, useEffect } from "react";
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleCategories,
  createRoleCategory,
  deleteRoleCategory,
  getSelfAssignableRoles,
  getMyRoles,
  selfAssignRole,
  selfUnassignRole,
} from "@/api";
import { Role as RoleType, RoleCategory } from "@/api/types/roles.types";
import { SettingsFormSkeleton } from "@/components/loading/pageSkeletons";
import InlineSpinner from "@/components/loading/InlineSpinner";

interface RoleProps {
  serverId: string;
  isOwner: boolean;
  isAdmin: boolean;
}

export default function Role({ serverId, isOwner, isAdmin }: RoleProps) {
  const canManageRoles = isOwner || isAdmin;

  if (!canManageRoles) {
    return <MemberRoleView serverId={serverId} />;
  }

  return (
    <AdminRoleView serverId={serverId} isOwner={isOwner} isAdmin={isAdmin} />
  );
}

function MemberRoleView({ serverId }: { serverId: string }) {
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<RoleType[]>(
    []
  );
  const [myRoles, setMyRoles] = useState<RoleType[]>([]);
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set()
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!serverId) return;
      try {
        setLoading(true);
        const [rolesData, myRolesData, categoriesData] = await Promise.all([
          getSelfAssignableRoles(serverId),
          getMyRoles(serverId),
          getRoleCategories(serverId),
        ]);

        const filteredRoles = rolesData.filter(
          (r: RoleType) => r.role_type !== "owner" && r.role_type !== "admin"
        );

        setSelfAssignableRoles(filteredRoles);
        setMyRoles(myRolesData);
        setCategories(categoriesData);

        const myRoleIds = new Set(myRolesData.map((r: RoleType) => r.id));
        setSelectedRoleIds(myRoleIds);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serverId]);

  const toggleRole = (roleId: string) => {
    const newSelected = new Set(selectedRoleIds);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoleIds(newSelected);

    const myRoleIds = new Set(myRoles.map((r) => r.id));
    const newSelectedArr = Array.from(newSelected);
    const myRoleIdsArr = Array.from(myRoleIds);
    const hasChanges =
      newSelectedArr.some((id) => !myRoleIds.has(id)) ||
      myRoleIdsArr.some(
        (id) =>
          selfAssignableRoles.some((r) => r.id === id) && !newSelected.has(id)
      );
    setHasChanges(hasChanges);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const myRoleIds = new Set(myRoles.map((r) => r.id));
      const selectedArr = Array.from(selectedRoleIds);
      const myRoleIdsArr = Array.from(myRoleIds);

      const rolesToAdd = selectedArr.filter((id) => !myRoleIds.has(id));
      const rolesToRemove = myRoleIdsArr.filter(
        (id) =>
          selfAssignableRoles.some((r) => r.id === id) &&
          !selectedRoleIds.has(id)
      );

      for (const roleId of rolesToAdd) {
        await selfAssignRole(serverId, roleId);
      }

      for (const roleId of rolesToRemove) {
        await selfUnassignRole(serverId, roleId);
      }

      const updatedMyRoles = await getMyRoles(serverId);
      setMyRoles(updatedMyRoles);
      setHasChanges(false);
      setSuccess("Roles updated successfully!");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update roles");
    } finally {
      setSaving(false);
    }
  };

  const groupedRoles = selfAssignableRoles.reduce(
    (acc, role) => {
      const categoryId = role.category_id || "uncategorized";
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push(role);
      return acc;
    },
    {} as Record<string, RoleType[]>
  );

  const getCategoryName = (categoryId: string) => {
    if (categoryId === "uncategorized") return "Other Roles";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Other Roles";
  };

  const getCategoryDescription = (categoryId: string) => {
    if (categoryId === "uncategorized") return null;
    const category = categories.find((c) => c.id === categoryId);
    return category?.description;
  };

  if (loading) {
    return (
      <div className="p-8">
        <SettingsFormSkeleton fields={3} />
      </div>
    );
  }

  if (selfAssignableRoles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-[#72767d] mt-1">Pick roles to customize your experience</p>
        </div>
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-6 text-center">
          <p className="text-sm text-[#72767d]">No self-assignable roles available.</p>
          <p className="text-sm text-[#72767d] mt-1">Contact server admins to create some.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles</h1>
        <p className="text-sm text-[#72767d] mt-1">Pick roles to customize your experience</p>
      </div>

      {error && (
        <div className="p-3 bg-[#ed4245]/10 border border-[#ed4245]/20 text-[#ed4245] rounded text-sm">
          {error}
          <button className="float-right" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-[#3ba55c]/10 border border-[#3ba55c]/20 text-[#3ba55c] rounded text-sm">
          {success}
        </div>
      )}

      {myRoles.length > 0 && (
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
          <h3 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider mb-3">
            Your Current Roles
          </h3>
          <div className="flex flex-wrap gap-2">
            {myRoles.map((role) => (
              <span
                key={role.id}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${role.color}20`,
                  color: role.color,
                  border: `1px solid ${role.color}40`,
                }}
              >
                {role.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.entries(groupedRoles).map(([categoryId, roles]) => (
        <div key={categoryId}>
          <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
            <h3 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider mb-3">
              {getCategoryName(categoryId)}
            </h3>
            {getCategoryDescription(categoryId) && (
              <p className="text-sm text-[#72767d] mb-3">{getCategoryDescription(categoryId)}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => {
                const isSelected = selectedRoleIds.has(role.id);
                return (
                  <button
                    key={role.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 border ${
                      isSelected
                        ? "border-current bg-current/10"
                        : "border-white/[0.06] bg-[#18191c] hover:bg-[#23272a]"
                    }`}
                    style={{ color: isSelected ? role.color : "#b5bac1" }}
                    onClick={() => toggleRole(role.id)}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <span>{role.name}</span>
                    {isSelected && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-center">
        <button
          className={`px-5 py-2 rounded text-sm font-medium transition-all duration-150 ${
            hasChanges && !saving
              ? "bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black"
              : "bg-[#23272a] text-[#72767d] cursor-not-allowed"
          }`}
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <InlineSpinner size="sm" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
        <p className="text-sm text-[#72767d]">
          Click roles to select or deselect them, then save. Roles help you
          access specific channels and show your interests.
        </p>
      </div>
    </div>
  );
}

function AdminRoleView({
  serverId,
  isOwner,
  isAdmin,
}: {
  serverId: string;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#99aab5");
  const [newRoleSelfAssignable, setNewRoleSelfAssignable] = useState(false);
  const [newRoleCategory, setNewRoleCategory] = useState<string>("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!serverId) return;

      try {
        setLoading(true);
        const [rolesData, categoriesData] = await Promise.all([
          getAllRoles(serverId),
          getRoleCategories(serverId),
        ]);
        setRoles(rolesData);
        setCategories(categoriesData);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serverId]);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      setSaving(true);
      const newRole = await createRole(serverId, {
        name: newRoleName,
        color: newRoleColor,
        is_self_assignable: newRoleSelfAssignable,
        category_id: newRoleCategory || undefined,
      });

      setRoles([...roles, newRole]);
      setNewRoleName("");
      setNewRoleColor("#99aab5");
      setNewRoleSelfAssignable(false);
      setNewRoleCategory("");
      setShowAddPopup(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setSaving(true);
      const newCategory = await createRoleCategory(serverId, {
        name: newCategoryName,
        description: newCategoryDescription || undefined,
      });

      setCategories([...categories, newCategory]);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowCategoryPopup(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectRole = (role: RoleType) => {
    if (role.role_type === "owner" && !isOwner) return;
    setSelectedRole({ ...role });
  };

  const handleEditRole = (field: keyof RoleType, value: any) => {
    if (!selectedRole) return;
    setSelectedRole({ ...selectedRole, [field]: value });
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);
      const updatedRole = await updateRole(serverId, selectedRole.id, {
        name: selectedRole.name,
        color: selectedRole.color,
        is_self_assignable: selectedRole.is_self_assignable,
        category_id: selectedRole.category_id || undefined,
      });

      setRoles(roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)));
      setSelectedRole(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    if (role.role_type === "owner") {
      setError("Cannot delete the owner role");
      return;
    }

    if (role.role_type === "admin" && !isOwner) {
      setError("Only the owner can delete the admin role");
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${role.name}" role?`))
      return;

    try {
      setSaving(true);
      await deleteRole(serverId, roleId);
      setRoles(roles.filter((r) => r.id !== roleId));
      setSelectedRole(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (
      !confirm(
        `Are you sure you want to delete the "${category.name}" category?`
      )
    )
      return;

    try {
      await deleteRoleCategory(serverId, categoryId);
      setCategories(categories.filter((c) => c.id !== categoryId));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete category");
    }
  };

  const getRoleTypeLabel = (type: string) => {
    switch (type) {
      case "owner":
        return "Owner";
      case "admin":
        return "Admin";
      case "self_assignable":
        return "Self-Assignable";
      default:
        return "Custom";
    }
  };

  const getRoleTypeBadgeColor = (type: string) => {
    switch (type) {
      case "owner":
        return "bg-yellow-500/20 text-yellow-400";
      case "admin":
        return "bg-orange-500/20 text-orange-400";
      case "self_assignable":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const groupedRoles = roles.reduce(
    (acc, role) => {
      const categoryId = role.category_id || "uncategorized";
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push(role);
      return acc;
    },
    {} as Record<string, RoleType[]>
  );

  if (loading) {
    return (
      <div className="p-8">
        <SettingsFormSkeleton fields={3} />
      </div>
    );
  }

  const canManageRoles = isOwner || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-[#72767d] mt-1">
            Manage server roles and self-assignable roles
          </p>
        </div>
        {canManageRoles && (
          <div className="flex gap-2">
            <button
              className="bg-[#23272a] text-white px-4 py-2 rounded border border-white/[0.06] hover:bg-[#2f3136] transition text-sm"
              onClick={() => setShowCategoryPopup(true)}
              title="Create Category"
            >
              + Category
            </button>
            <button
              className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm px-4 py-2 rounded transition"
              onClick={() => setShowAddPopup(true)}
              title="Create New Role"
            >
              + Role
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#ed4245]/10 border border-[#ed4245]/20 text-[#ed4245] px-3 py-2 rounded text-sm">
          {error}
          <button
            className="float-right text-[#ed4245]"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      <div>
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
          <h3 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider mb-3">
            System Roles
          </h3>
          <div className="flex gap-2 flex-wrap">
            {roles
              .filter((r) => r.role_type === "owner" || r.role_type === "admin")
              .map((role) => (
                <button
                  key={role.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer font-medium text-sm border transition ${
                    selectedRole?.id === role.id
                      ? "border-[#FFC341] bg-[#FFC341]/10 text-white"
                      : "border-white/[0.06] bg-[#18191c] text-[#b5bac1] hover:bg-[#23272a]"
                  }
                  `}
                  onClick={() => handleSelectRole(role)}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ background: role.color }}
                  />
                  <span>{role.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleTypeBadgeColor(
                      role.role_type
                    )}`}
                  >
                    {getRoleTypeLabel(role.role_type)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category.id}>
          <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-[#72767d] mt-0.5">{category.description}</p>
                )}
              </div>
              {canManageRoles && (
                <button
                  className="text-[#ed4245] hover:underline text-xs"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(groupedRoles[category.id] || []).map((role) => (
                <button
                  key={role.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer font-medium text-sm border transition ${
                    selectedRole?.id === role.id
                      ? "border-[#FFC341] bg-[#FFC341]/10 text-white"
                      : "border-white/[0.06] bg-[#18191c] text-[#b5bac1] hover:bg-[#23272a]"
                  }
                  `}
                  onClick={() => handleSelectRole(role)}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ background: role.color }}
                  />
                  <span>{role.name}</span>
                  {role.is_self_assignable && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3ba55c]/20 text-[#3ba55c]">
                      Self-Assign
                    </span>
                  )}
                </button>
              ))}
              {(!groupedRoles[category.id] ||
                groupedRoles[category.id].length === 0) && (
                <p className="text-sm text-[#72767d]">No roles in this category</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {groupedRoles["uncategorized"]?.filter(
        (r) => r.role_type !== "owner" && r.role_type !== "admin"
      ).length > 0 && (
        <div>
          <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
            <h3 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider mb-3">
              Other Roles
            </h3>
            <div className="flex gap-2 flex-wrap">
              {groupedRoles["uncategorized"]
                ?.filter(
                  (r) => r.role_type !== "owner" && r.role_type !== "admin"
                )
                .map((role) => (
                  <button
                    key={role.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer font-medium text-sm border transition ${
                      selectedRole?.id === role.id
                        ? "border-[#FFC341] bg-[#FFC341]/10 text-white"
                        : "border-white/[0.06] bg-[#18191c] text-[#b5bac1] hover:bg-[#23272a]"
                    }
                    `}
                    onClick={() => handleSelectRole(role)}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ background: role.color }}
                    />
                    <span>{role.name}</span>
                    {role.is_self_assignable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3ba55c]/20 text-[#3ba55c]">
                        Self-Assign
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {selectedRole && canManageRoles && (
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-5 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#ed4245]">
              Edit Role: {selectedRole.name}
            </h2>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getRoleTypeBadgeColor(
                selectedRole.role_type
              )}`}
            >
              {getRoleTypeLabel(selectedRole.role_type)}
            </span>
          </div>

          <label className="block font-semibold mb-2 text-[#b5bac1]">
            Role Name
          </label>
          <input
            className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-4 focus:border-[#FFC341] focus:outline-none transition-all"
            value={selectedRole.name}
            onChange={(e) => handleEditRole("name", e.target.value)}
            disabled={
              selectedRole.role_type === "owner" ||
              selectedRole.role_type === "admin"
            }
          />

          <label className="block font-semibold mb-2 text-[#b5bac1]">
            Role Color
          </label>
          <input
            className="w-10 h-10 rounded border border-white/[0.06] mb-4 cursor-pointer"
            type="color"
            value={selectedRole.color}
            onChange={(e) => handleEditRole("color", e.target.value)}
          />

          {selectedRole.role_type !== "owner" &&
            selectedRole.role_type !== "admin" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="selfAssignable"
                    className="w-5 h-5 accent-yellow-400"
                    checked={selectedRole.is_self_assignable}
                    onChange={(e) =>
                      handleEditRole("is_self_assignable", e.target.checked)
                    }
                  />
                  <label htmlFor="selfAssignable" className="text-[#b5bac1]">
                    Allow members to self-assign this role
                  </label>
                </div>

                <label className="block font-semibold mb-2 text-[#b5bac1]">
                  Category
                </label>
                <select
                  className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-4 focus:border-[#FFC341] focus:outline-none"
                  value={selectedRole.category_id || ""}
                  onChange={(e) =>
                    handleEditRole("category_id", e.target.value || null)
                  }
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </>
            )}

          <div className="flex gap-2 mt-6">
            <button
              className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm rounded px-4 py-2 transition disabled:opacity-50"
              onClick={handleSaveRole}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="bg-[#23272a] text-[#b5bac1] font-medium text-sm rounded px-4 py-2 border border-white/[0.06] transition hover:bg-[#2f3136]"
              onClick={() => setSelectedRole(null)}
            >
              Cancel
            </button>
            {selectedRole.role_type !== "owner" &&
              (selectedRole.role_type !== "admin" || isOwner) && (
            <button
              className="bg-[#23272a] text-[#ed4245] font-medium text-sm rounded px-4 py-2 border border-[#ed4245]/30 transition hover:bg-[#ed4245]/10 ml-auto"
                  onClick={() => handleDeleteRole(selectedRole.id)}
                  disabled={saving}
                >
                  Delete
                </button>
              )}
          </div>
        </div>
      )}

      {showAddPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="bg-[#23272a] rounded-lg p-8 shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-[#b5bac1] hover:text-white text-2xl"
              onClick={() => setShowAddPopup(false)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Create New Role
            </h2>

            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Role Name
            </label>
            <input
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-4 focus:border-[#FFC341] focus:outline-none"
              type="text"
              placeholder="e.g., Gaming, Anime, Music"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />

            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Role Color
            </label>
            <input
              className="w-10 h-10 rounded border border-white/[0.06] mb-4 cursor-pointer"
              type="color"
              value={newRoleColor}
              onChange={(e) => setNewRoleColor(e.target.value)}
            />

            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="newSelfAssignable"
                className="w-5 h-5 accent-yellow-400"
                checked={newRoleSelfAssignable}
                onChange={(e) => setNewRoleSelfAssignable(e.target.checked)}
              />
              <label htmlFor="newSelfAssignable" className="text-[#b5bac1]">
                Self-Assignable (members can pick this role)
              </label>
            </div>

            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Category (Optional)
            </label>
            <select
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-6 focus:border-[#FFC341] focus:outline-none"
              value={newRoleCategory}
              onChange={(e) => setNewRoleCategory(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              className="w-full bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm rounded px-4 py-2.5 transition disabled:opacity-50"
              onClick={handleAddRole}
              disabled={saving || !newRoleName.trim()}
            >
              {saving ? "Creating..." : "Create Role"}
            </button>
          </div>
        </div>
      )}

      {showCategoryPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="bg-[#23272a] rounded-lg p-8 shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-[#b5bac1] hover:text-white text-2xl"
              onClick={() => setShowCategoryPopup(false)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Create Role Category
            </h2>
            <p className="text-[#72767d] text-sm mb-4">
              Categories help organize self-assignable roles (e.g.,
              &quot;Interests&quot;, &quot;Pronouns&quot;, &quot;Region&quot;)
            </p>

            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Category Name
            </label>
            <input
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-4 focus:border-[#FFC341] focus:outline-none"
              type="text"
              placeholder="e.g., Interests, Pronouns, Region"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />

            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Description (Optional)
            </label>
            <input
              className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 mb-6 focus:border-[#FFC341] focus:outline-none"
              type="text"
              placeholder="e.g., Pick your interests"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
            />

            <button
              className="w-full bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm rounded px-4 py-2.5 transition disabled:opacity-50"
              onClick={handleAddCategory}
              disabled={saving || !newCategoryName.trim()}
            >
              {saving ? "Creating..." : "Create Category"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
