import { useState } from "react";

interface RoleType {
  id: number;
  name: string;
  color: string;
  permissions: string[];
}

const initialRoles: RoleType[] = [
  { id: 1, name: "Admin", color: "#ed4245", permissions: ["Manage Server", "Ban Members"] },
  { id: 2, name: "Moderator", color: "#5865f2", permissions: ["Kick Members", "Manage Messages"] },
  { id: 3, name: "Member", color: "#43b581", permissions: ["Send Messages"] },
];

export default function Role({
  roles,
  setRoles,
}: {
  roles: RoleType[];
  setRoles: React.Dispatch<React.SetStateAction<RoleType[]>>;
}) {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#99aab5");

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    setRoles([
      ...roles,
      {
        id: Date.now(),
        name: newRoleName,
        color: newRoleColor,
        permissions: [],
      },
    ]);
    setNewRoleName("");
    setNewRoleColor("#99aab5");
    setShowAddPopup(false);
  };

  const handleSelectRole = (role: RoleType) => setSelectedRole(role);

  const handleEditRole = (field: keyof RoleType, value: any) => {
    if (!selectedRole) return;
    setSelectedRole({ ...selectedRole, [field]: value });
  };

  const handleSaveRole = () => {
    if (!selectedRole) return;
    setRoles(roles.map(r => (r.id === selectedRole.id ? selectedRole : r)));
    setSelectedRole(null);
  };

  const handleDeleteRole = (id: number) => {
    setRoles(roles.filter(r => r.id !== id));
    setSelectedRole(null);
  };

  return (
    <div className="max-w-xl mx-auto p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Roles</h1>
        {/* Central "+" Button */}
        <button
          className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded-full w-10 h-10 flex items-center justify-center shadow text-2xl hover:from-[#ffcc33] hover:to-[#ffb347] focus:outline-none"
          style={{
            backgroundSize: "200% 200%",
            backgroundPosition: "left center",
            transition: "background-position 0.5s, transform 0.2s"
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
          onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
          onClick={() => setShowAddPopup(true)}
          title="Create New Role"
        >
          +
        </button>
      </div>
      {/* Roles List */}
      <div className="flex gap-4 mb-8 flex-wrap">
        {roles.map(role => (
          <div
            key={role.id}
            className={`flex items-center gap-2 px-4 py-2 rounded cursor-pointer font-medium border-2 transition-all duration-200
              ${
                selectedRole?.id === role.id
                  ? "border-[#ed4245] bg-[#23272a] text-white scale-105"
                  : "border-[#36393f] text-[#b5bac1] hover:bg-[#23272a] hover:text-white hover:scale-105"
              }
            `}
            style={{ borderColor: selectedRole?.id === role.id ? "#ed4245" : "#36393f" }}
            onClick={() => handleSelectRole(role)}
          >
            <span
              className="w-4 h-4 rounded-full border border-[#72767d]"
              style={{ background: role.color }}
            />
            <span>{role.name}</span>
          </div>
        ))}
      </div>
      {selectedRole && (
        <div className="mb-8">
          <h2 className="font-semibold mb-4 text-[#ed4245]">Edit Role</h2>
          <label className="block font-semibold mb-2 text-[#b5bac1]">Role Name</label>
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
            value={selectedRole.name}
            onChange={e => handleEditRole("name", e.target.value)}
          />
          <label className="block font-semibold mb-2 text-[#b5bac1]">Role Color</label>
          <input
            className="w-10 h-10 rounded border-2 border-[#72767d] mb-4 cursor-pointer transition-all duration-200"
            type="color"
            value={selectedRole.color}
            onChange={e => handleEditRole("color", e.target.value)}
          />
          <label className="block font-semibold mb-2 text-[#b5bac1]">Permissions (comma separated)</label>
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
            type="text"
            placeholder="Comma separated (e.g. Manage Server, Ban Members)"
            value={selectedRole.permissions.join(", ")}
            onChange={e =>
              handleEditRole(
                "permissions",
                e.target.value.split(",").map((s: string) => s.trim())
              )
            }
          />
          <div className="flex gap-2 mb-8">
            <button
              className="bg-gradient-to-r from-[#ed4245] to-[#a32224] text-white font-bold rounded px-6 py-2 shadow transition-all duration-200 hover:from-[#a32224] hover:to-[#ed4245] focus:outline-none"
              style={{
                backgroundSize: "200% 200%",
                backgroundPosition: "left center",
                transition: "background-position 0.5s, transform 0.2s"
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
              onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
              onClick={handleSaveRole}
            >
              Save
            </button>
            <button
              className="bg-[#23272a] text-[#ed4245] font-semibold rounded px-6 py-2 border-2 border-[#ed4245] transition hover:bg-[#ed4245] hover:text-white"
              onClick={() => handleDeleteRole(selectedRole.id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {showAddPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
          <div className="bg-[#23272a] rounded-lg p-8 shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-[#b5bac1] hover:text-white text-2xl"
              onClick={() => setShowAddPopup(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 text-white">Create New Role</h2>
            <label className="block font-semibold mb-2 text-[#b5bac1]">Role Name</label>
            <input
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
              type="text"
              placeholder="New role name"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
            />
            <label className="block font-semibold mb-2 text-[#b5bac1]">Role Color</label>
            <input
              className="w-10 h-10 rounded border-2 border-[#72767d] mb-6 cursor-pointer transition-all duration-200"
              type="color"
              value={newRoleColor}
              onChange={e => setNewRoleColor(e.target.value)}
            />
            <button
              className="w-full bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-2 shadow transition-all duration-200 hover:from-[#ffcc33] hover:to-[#ffb347] focus:outline-none"
              style={{
                backgroundSize: "200% 200%",
                backgroundPosition: "left center",
                transition: "background-position 0.5s, transform 0.2s"
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
              onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
              onClick={handleAddRole}
            >
              Create Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
