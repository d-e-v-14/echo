import { useState } from "react";

interface Member {
  id: number;
  username: string;
  roles: string[];
  joinDate: string;
  avatar: string;
}

const avatarList = ["/avatar1.jpg", "/avatar2.jpg", "/avatar3.jpg"];

const availableRoles = [
  { id: 1, name: "Admin", color: "#ed4245" },
  { id: 2, name: "Moderator", color: "#5865f2" },
  { id: 3, name: "Member", color: "#43b581" },
];

export default function Members() {
  const [members, setMembers] = useState<Member[]>([
    {
      id: 1,
      username: "@johndoe",
      roles: ["Admin", "Member"],
      joinDate: "Jan 2024",
      avatar: "/avatar1.jpg",
    },
    {
      id: 2,
      username: "@sophiedee",
      roles: ["Member"],
      joinDate: "May 2024",
      avatar: "/avatar2.jpg",
    },
    {
      id: 3,
      username: "@alexdev",
      roles: ["Moderator", "Member"],
      joinDate: "Mar 2024",
      avatar: "/avatar3.jpg",
    },
  ]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [showRolePopupFor, setShowRolePopupFor] = useState<number | null>(null);

  const handleKickMember = (memberId: number) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  const handleBanMember = (memberId: number) => {
    alert(`Member with ID ${memberId} has been banned.`);
  };

  const handleAddRoleToMember = (memberId: number, roleToAdd: string) => {
    setMembers(
      members.map((m) => {
        if (m.id === memberId && !m.roles.includes(roleToAdd)) {
          return { ...m, roles: [...m.roles, roleToAdd] };
        }
        return m;
      })
    );
    setShowRolePopupFor(null);
  };

  const handleRemoveRoleFromMember = (memberId: number, roleToRemove: string) => {
    setMembers(
      members.map((m) =>
        m.id === memberId
          ? { ...m, roles: m.roles.filter((r) => r !== roleToRemove) }
          : m
      )
    );
  };

  const handleAddMember = () => {
    if (newUsername.trim()) {
      const newMember: Member = {
        id: Date.now(),
        username: newUsername,
        roles: ["Member"],
        joinDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        avatar: avatarList[Math.floor(Math.random() * avatarList.length)],
      };
      setMembers([...members, newMember]);
      setNewUsername("");
      setShowAddMember(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Members</h1>
      <div className="rounded-lg shadow">
        <table className="w-full min-w-[1200px] bg-[#23272a] rounded-lg table-fixed">
          <thead>
            <tr>
              <th className="p-2 text-left text-[#b5bac1] font-semibold w-1/4">USERNAME</th>
              <th className="p-2 text-left text-[#b5bac1] font-semibold w-1/3">ROLE(S)</th>
              <th className="p-2 text-left text-[#b5bac1] font-semibold w-1/6">JOIN DATE</th>
              <th className="p-2 text-left text-[#b5bac1] font-semibold w-1/3">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-t border-[#18191c] hover:bg-[#2c2f33] transition"
              >
                <td className="p-2">
                  <div className="flex items-center gap-2 h-10">
                    <img
                      src={member.avatar}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="font-semibold text-base flex items-center h-8">{member.username}</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex gap-3 overflow-x-auto whitespace-nowrap max-w-full">
                    {member.roles.map((roleName, idx) => {
                      const role = availableRoles.find(
                        (r) => r.name === roleName
                      );
                      return (
                        <span
                          key={idx}
                          className="relative inline-block px-4 py-1 rounded-full text-base font-bold tracking-wide shadow-md whitespace-nowrap"
                          style={{
                            background: role?.color ?? "#99aab5",
                            color: "#fff",
                            minWidth: "80px",
                            textAlign: "center",
                            letterSpacing: "1px",
                          }}
                        >
                          {roleName}
                          <button
                            className="ml-2 bg-[#23272a] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-[#ed4245] transition absolute -top-2 -right-2"
                            title="Remove role"
                            onClick={() => handleRemoveRoleFromMember(member.id, roleName)}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="p-2 text-base">{member.joinDate}</td>
                <td className="p-2 relative">
                  <div className="flex gap-2 items-center">
                    <button
                      className="text-[#b5bac1] hover:text-white font-bold text-2xl px-2"
                      title="Add Role"
                      onClick={() => setShowRolePopupFor(member.id)}
                    >
                      +
                    </button>
                    <button
                      className="bg-gradient-to-r from-[#ed4245] to-[#a32224] text-white font-bold rounded px-4 py-1 shadow transition-all duration-200 hover:from-[#a32224] hover:to-[#ed4245] focus:outline-none"
                      onClick={() => handleKickMember(member.id)}
                    >
                      Kick
                    </button>
                    <button
                      className="bg-gradient-to-r from-[#ed4245] to-[#a32224] text-white font-bold rounded px-4 py-1 shadow transition-all duration-200 hover:from-[#a32224] hover:to-[#ed4245] focus:outline-none"
                      onClick={() => handleBanMember(member.id)}
                    >
                      Ban
                    </button>
                  </div>

                  {showRolePopupFor === member.id && (
                    <div className="absolute z-50 mt-2 left-0 bg-[#18191c] border border-[#72767d] rounded shadow-lg p-4">
                      <h3 className="text-white font-semibold mb-2">Add Role</h3>
                      <ul>
                        {availableRoles
                          .filter((r) => !member.roles.includes(r.name))
                          .map((role) => (
                            <li
                              key={role.id}
                              className="cursor-pointer px-2 py-1 rounded hover:bg-[#23272a] flex items-center gap-2"
                              onClick={() => handleAddRoleToMember(member.id, role.name)}
                            >
                              <span
                                className="inline-block w-3 h-3 rounded-full"
                                style={{ backgroundColor: role.color }}
                              ></span>
                              {role.name}
                            </li>
                          ))}
                        {availableRoles.filter((r) => !member.roles.includes(r.name)).length === 0 && (
                          <li className="px-2 py-1 text-gray-400">All roles assigned</li>
                        )}
                      </ul>
                      <button
                        className="mt-2 text-sm text-[#b5bac1] hover:text-white"
                        onClick={() => setShowRolePopupFor(null)}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        {!showAddMember ? (
          <button
            className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-2 shadow transition-all duration-200 hover:from-[#ffcc33] hover:to-[#ffb347] focus:outline-none"
            style={{
              backgroundSize: "200% 200%",
              backgroundPosition: "left center",
              transition: "background-position 0.5s, transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
            onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
            onClick={() => setShowAddMember(true)}
          >
            Add Members +
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Enter username (e.g., @newuser)"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
            />
            <button
              className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-4 py-2 shadow transition-all duration-200 hover:from-[#ffcc33] hover:to-[#ffb347] focus:outline-none"
              style={{
                backgroundSize: "200% 200%",
                backgroundPosition: "left center",
                transition: "background-position 0.5s, transform 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
              onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
              onClick={handleAddMember}
            >
              Add Member
            </button>
            <button
              className="bg-[#23272a] text-[#ed4245] font-semibold rounded px-4 py-2 border-2 border-[#ed4245] transition hover:bg-[#ed4245] hover:text-white"
              onClick={() => {
                setShowAddMember(false);
                setNewUsername("");
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
