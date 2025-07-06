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

export default function Role() {
  const [roles, setRoles] = useState<RoleType[]>(initialRoles);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
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
      <h1 className="text-3xl font-bold mb-8">Roles</h1>
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
 
      <div className="mb-8 flex gap-2 items-center">
        <input
          className="bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#ed4245] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
          type="text"
          placeholder="New role name"
          value={newRoleName}
          onChange={e => setNewRoleName(e.target.value)}
        />
        <input
          className="w-10 h-10 rounded border-2 border-[#72767d] cursor-pointer transition-all duration-200 hover:-translate-y-1 focus:-translate-y-1"
          type="color"
          value={newRoleColor}
          onChange={e => setNewRoleColor(e.target.value)}
        />
<button
  className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-2 shadow transition-all duration-200
    hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105 focus:outline-none"
  style={{
    backgroundSize: "200% 200%",
    backgroundPosition: "left center",
    transition: "background-position 0.5s, transform 0.2s",
  }}
  onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
  onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
  onClick={handleAddRole}
>
  Create Role
</button>

      </div>

      {selectedRole && (
        <div className="mb-8">
          <h2 className="font-semibold mb-4 text-[#ed4245]">Edit Role</h2>
          <label className="block font-semibold mb-2 text-[#b5bac1]">Role Name</label>
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#ed4245] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
            value={selectedRole.name}
            onChange={e => handleEditRole("name", e.target.value)}
          />
          <label className="block font-semibold mb-2 text-[#b5bac1]">Role Color</label>
          <input
            className="w-10 h-10 rounded border-2 border-[#72767d] mb-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 focus:-translate-y-1"
            type="color"
            value={selectedRole.color}
            onChange={e => handleEditRole("color", e.target.value)}
          />
          <label className="block font-semibold mb-2 text-[#b5bac1]">Permissions (comma separated)</label>
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#ed4245] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
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
          <div className="flex gap-2">
            <button
              className="bg-gradient-to-r from-[#ed4245] via-[#ff616d] to-[#ed4245] text-white font-semibold rounded px-6 py-2 shadow transition-all duration-200
                hover:from-[#ff616d] hover:to-[#ed4245] hover:via-[#a32224] hover:-translate-y-1 hover:scale-105 focus:outline-none"
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
              className="bg-[#23272a] text-[#ed4245] font-semibold rounded px-6 py-2 border-2 border-[#ed4245] shadow transition-all duration-200 hover:bg-[#ed4245] hover:text-white hover:-translate-y-1 hover:scale-105"
              onClick={() => handleDeleteRole(selectedRole.id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
