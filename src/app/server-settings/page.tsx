"use client";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Overview from "./components/ServerSettings/Overview";
import Role from "./components/ServerSettings/Role";
import Members from "./components/ServerSettings/Members";
import InvitePeople from "./components/ServerSettings/InvitePeople";
import Leave from "./components/ServerSettings/Leave";

const initialRoles = [
  { id: 1, name: "Admin", color: "#ed4245", permissions: ["Manage Server", "Ban Members"] },
  { id: 2, name: "Moderator", color: "#5865f2", permissions: ["Kick Members", "Manage Messages"] },
  { id: 3, name: "Member", color: "#43b581", permissions: ["Send Messages"] },
];

export default function ServerSettingsPage() {
  const [selected, setSelected] = useState<string>("Overview");
  const [roles, setRoles] = useState(initialRoles);

  let Content;
  switch (selected) {
    case "Overview":
      Content = <Overview />;
      break;
    case "Role":
      Content = <Role roles={roles} setRoles={setRoles} />;
      break;
    case "Members":
      Content = <Members />;
      break;
    case "Invite people":
      Content = <InvitePeople />;
      break;
    case "Leave":
      Content = <Leave />;
      break;
    default:
      Content = <Overview />;
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar selected={selected} onSelect={setSelected} />
      <main className="flex-1 p-8 bg-black">{Content}</main>
    </div>
  );
}
