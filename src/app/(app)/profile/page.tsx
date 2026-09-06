"use client";
import { useMemo } from "react";
import { LogOut } from "lucide-react";

import { logout } from "@/api";
import { useUser } from "@/components/UserContext";
import { toast } from "@/contexts/ToastContext";
import { UserProfileCard, type ProfileMenuItem } from "@/components/profile/UserProfileCard";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { useSelfProfile } from "@/components/profile/useProfileData";
import type { ProfileCardFallback } from "@/components/profile/profile.types";

export default function ProfilePage() {
  const { user } = useUser();

  const handleLogout = async () => {
    const loadingToast = toast.loading("Logging out…");
    try {
      await logout();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.update(loadingToast, {
        type: "success",
        message: "Logged out successfully",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 600);
    } catch (error) {
      console.error("Failed to logout:", error);
      toast.update(loadingToast, {
        type: "error",
        message: "Failed to logout. Please try again.",
      });
    }
  };

  const selfQuery = useSelfProfile();

  const fallbackUser: ProfileCardFallback | null = useMemo(() => {
    if (selfQuery.data) return selfQuery.data;
    if (!user?.id) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.fullname,
      avatarUrl: user.avatar_url,
      bio: user.bio,
    };
  }, [selfQuery.data, user]);

  const menuItems: ProfileMenuItem[] = useMemo(
    () => [
      {
        label: "Log Out",
        icon: <LogOut className="h-4 w-4" />,
        danger: true,
        onSelect: () => void handleLogout(),
      },
    ],
    []
  );

  if (!fallbackUser) {
    if (selfQuery.isError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4">
          <p className="text-sm text-[#ed4245]">Could not load profile</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-start justify-center bg-black px-4 py-10 font-poppins">
        <div className="w-full max-w-lg animate-slide-up-fade overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111214] shadow-2xl">
          <ProfileSkeleton variant="page" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-black px-4 py-10 font-poppins sm:py-16">
        <UserProfileCard
          variant="page"
          user={fallbackUser}
          currentUserId={fallbackUser.id}
          currentUsername={fallbackUser.username ?? undefined}
          menuItems={menuItems}
        />
      </div>
  );
}
