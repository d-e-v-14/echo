"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Overview from "./components/ServerSettings/Overview";
import Role from "./components/ServerSettings/Role";
import Members from "./components/ServerSettings/Members";
import BannedUsers from "./components/ServerSettings/BannedUsers";
import InvitePeople from "./components/ServerSettings/InvitePeople";
import Leave from "./components/ServerSettings/Leave";
import DangerZone from "./components/ServerSettings/DangerZone";
import AddChannel from "./components/ServerSettings/AddChannel";

import { getServerDetails, getMyRoles, getServerMembers } from "@/api";
import { type ServerDetails } from "@/api/types/server.types";
import Skeleton from "@/components/loading/Skeleton";

export default function ServerSettingsPage() {
  const router = useRouter();

  const [selected, setSelected] = useState<string>("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [serverId, setServerId] = useState<string | null>(null);
  const [serverIdReady, setServerIdReady] = useState(false);

  const [serverDetails, setServerDetails] = useState<ServerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("serverId");
    const fromStorage = localStorage.getItem("currentServerId");
    const resolved = fromUrl || fromStorage;
    if (resolved) setServerId(resolved);
    setServerIdReady(true);
  }, []);

  useEffect(() => {
    if (!serverIdReady) return;
    if (!serverId) {
      setLoading(false);
      return;
    }

    const loadServerDetails = async () => {
      try {
        setLoading(true);
        const [details, myRoles, members] = await Promise.all([
          getServerDetails(serverId),
          getMyRoles(serverId),
          getServerMembers(serverId).catch(() => []),
        ]);
        setServerDetails(details);
        setIsAdmin(myRoles.some((role) => role.role_type === "admin"));
        if (Array.isArray(members)) setMemberCount(members.length);
        setError(null);
      } catch (err) {
        console.error("Failed to load server details:", err);
        setError("Failed to load server details");
      } finally {
        setLoading(false);
      }
    };

    loadServerDetails();
  }, [serverIdReady, serverId]);

  const handleTabChange = (tab: string) => {
    setSelected(tab);
    setMobileMenuOpen(false);
  };

  if (!serverIdReady || loading) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <div className="w-60 shrink-0 border-r border-white/[0.06] p-4 hidden md:block">
          <Skeleton className="mb-4 h-12 w-full rounded-lg" />
          <Skeleton className="mb-2 h-8 w-full rounded" />
          <Skeleton className="mb-2 h-8 w-full rounded" />
          <Skeleton className="mb-2 h-8 w-full rounded" />
        </div>
        <main className="flex-1 p-6 md:p-8">
          <Skeleton className="mb-6 h-8 w-48 rounded" />
          <Skeleton className="mb-4 h-40 w-full rounded-lg" />
          <Skeleton className="h-60 w-full rounded-lg" />
        </main>
      </div>
    );
  }

  if (!serverId) {
    return (
      <div className="flex min-h-screen bg-black items-center justify-center">
        <div className="text-[#ed4245] text-lg">No server selected</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-black items-center justify-center">
        <div className="text-[#ed4245] text-lg">{error}</div>
      </div>
    );
  }

  if (!serverDetails) {
    return (
      <div className="flex min-h-screen bg-black items-center justify-center">
        <div className="text-[#ed4245] text-lg">Server not found</div>
      </div>
    );
  }

  const resolvedServerId: string = serverId!;
  const isOwner: boolean = Boolean(serverDetails.isOwner);

  const renderContent = () => {
    switch (selected) {
      case "Overview":
        return (
          <Overview
            serverId={resolvedServerId}
            serverDetails={serverDetails}
            onServerUpdate={setServerDetails}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
      case "Role":
        return (
          <Role serverId={resolvedServerId} isOwner={isOwner} isAdmin={isAdmin} />
        );
      case "Members":
        return (
          <Members
            serverId={resolvedServerId}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
      case "Bans":
        return (
          <BannedUsers
            serverId={resolvedServerId}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
      case "Invite people":
        return <InvitePeople serverId={resolvedServerId} />;
      case "Leave":
        return (
          <Leave
            serverId={resolvedServerId}
            serverDetails={serverDetails}
            isOwner={isOwner}
          />
        );
      case "Danger Zone":
        return (
          <DangerZone
            serverId={resolvedServerId}
            serverName={serverDetails.name}
            isOwner={isOwner}
          />
        );
      case "Add Channel":
        return <AddChannel serverId={resolvedServerId} />;
      default:
        return (
          <Overview
            serverId={resolvedServerId}
            serverDetails={serverDetails}
            onServerUpdate={setServerDetails}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <div className="hidden md:block">
        <Sidebar
          selected={selected}
          onSelect={handleTabChange}
          isOwner={isOwner}
          isAdmin={isAdmin}
          serverName={serverDetails.name}
          serverIcon={serverDetails.icon_url}
          memberCount={memberCount}
        />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 h-full bg-black shadow-xl">
            <Sidebar
              selected={selected}
              onSelect={handleTabChange}
              isOwner={isOwner}
              isAdmin={isAdmin}
              serverName={serverDetails.name}
              serverIcon={serverDetails.icon_url}
              memberCount={memberCount}
            />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/[0.06] px-4 md:px-8 h-12 flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-[#b5bac1] hover:text-white transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push("/servers")}
            className="flex items-center gap-2 text-[#72767d] hover:text-[#b5bac1] transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="hidden sm:block w-px h-4 bg-white/[0.06] mx-1" />
          <span className="text-sm text-[#72767d] hidden sm:inline">
            {serverDetails.name}
          </span>
          <span className="text-sm text-[#72767d] hidden sm:inline">/</span>
          <span className="text-sm text-[#b5bac1] font-medium">{selected}</span>
        </div>

        <div className="p-4 md:p-8 max-w-4xl">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
