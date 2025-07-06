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
      roles: ["Admin"],
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

  const handleKickMember = (memberId: number) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  const handleChangeRole = (memberId: number, newRole: string) => {
    setMembers(
      members.map((m) =>
        m.id === memberId ? { ...m, roles: [newRole] } : m
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
    <div className="max-w-3xl mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Members</h1>
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full bg-[#23272a] rounded-lg">
          <thead>
            <tr>
              <th className="p-3 text-left text-[#b5bac1] font-semibold">USERNAME</th>
              <th className="p-3 text-left text-[#b5bac1] font-semibold">ROLE(S)</th>
              <th className="p-3 text-left text-[#b5bac1] font-semibold">JOIN DATE</th>
              <th className="p-3 text-left text-[#b5bac1] font-semibold">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-t border-[#18191c] hover:bg-[#2c2f33] transition"
              >
                <td className="p-3 flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-semibold">{member.username}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {member.roles.map((roleName, idx) => {
                      const role = availableRoles.find(
                        (r) => r.name === roleName
                      );
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: role?.color ?? "#99aab5",
                            color: "#fff",
                          }}
                        >
                          {roleName}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="p-3">{member.joinDate}</td>
                <td className="p-3">
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <select
                        className="appearance-none w-32 bg-[#18191c] text-white border-2 border-[#72767d] rounded px-4 py-2 pr-8 font-semibold shadow transition-all duration-200
                          focus:border-[#b5bac1] focus:outline-none hover:-translate-y-1 focus:-translate-y-1"
                        value={member.roles[0]}
                        onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      >
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#b5bac1]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <button
                      className="bg-[#ed4245] text-white font-semibold rounded px-4 py-1 transition hover:bg-[#a32224]"
                      onClick={() => handleKickMember(member.id)}
                    >
                      Kick
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        {!showAddMember ? (
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
              className="bg-[#ed4245] text-white font-semibold rounded px-4 py-2 transition hover:bg-[#a32224]"
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
