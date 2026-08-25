"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, LogOut, Menu } from "lucide-react";
import { apiClient } from "@/api/axios";
import { logout } from "@/api/auth.api";
import { queryKeys } from "@/lib/query/keys";
import { useUser } from "@/components/UserContext";
import { useToast } from "@/contexts/ToastContext";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileAbout } from "@/components/profile/ProfileAbout";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { SettingsFormSkeleton } from "@/components/loading/pageSkeletons";
import Skeleton from "@/components/loading/Skeleton";
import SettingsSidebar from "./components/SettingsSidebar";

const BIO_MAX_LENGTH = 100;
const NAME_MAX_LENGTH = 20;

const inputClass =
  "w-full rounded-lg border border-white/[0.06] bg-[#18191c] px-3 py-2.5 text-sm text-white transition focus:border-[#FFC341]/50 focus:outline-none focus:ring-2 focus:ring-[#FFC341]/20";

const readonlyInputClass = `${inputClass} cursor-not-allowed text-[#72767d] opacity-70`;

const fieldLabelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#72767d]";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111214] p-5 shadow-2xl">
      <h2 className="mb-1 text-sm font-semibold text-white">{title}</h2>
      {description && (
        <p className="mb-4 text-sm text-[#72767d]">{description}</p>
      )}
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const { setUser } = useUser();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");

  const [avatar, setAvatar] = useState("/User_profil.png");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [changed, setChanged] = useState(false);
  const lastBioLimitToastAt = useRef(0);
  const avatarInput = useRef<HTMLInputElement | null>(null);
  const originalValues = useRef({ displayName: "", about: "", avatar: "" });

  const showBioLimitToast = () => {
    const now = Date.now();
    if (now - lastBioLimitToastAt.current < 1200) return;
    lastBioLimitToastAt.current = now;
    showToast("Bio cannot exceed 100 characters.", "error");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/api/profile/getProfile");
        const profile = res.data.user;

        setDisplayName(profile.fullname || "");
        setUsername(profile.username || "");
        setAbout((profile.bio || "").slice(0, BIO_MAX_LENGTH));
        setAvatar(profile.avatar_url || "/User_profil.png");

        originalValues.current = {
          displayName: profile.fullname || "",
          about: (profile.bio || "").slice(0, BIO_MAX_LENGTH),
          avatar: profile.avatar_url || "/User_profil.png",
        };

        setUser(profile);
      } catch (err) {
        console.error("Failed to fetch profile", err);
        showToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setUser, showToast]);

  useEffect(() => {
    if (!loading) setChanged(true);
  }, [displayName, about, avatarFile, loading]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Maximum avatar size is 5MB", "error");
      return;
    }

    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!changed) return;

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("fullname", displayName.slice(0, NAME_MAX_LENGTH));
      formData.append("bio", about.slice(0, BIO_MAX_LENGTH));
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await apiClient.patch("/api/profile/updateProfile", formData);

      const updatedUser = res.data.user;

      setAvatar(updatedUser.avatar_url || "/User_profil.png");

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-profile-updated"));

      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(updatedUser.id),
      });
      queryClient.invalidateQueries({ queryKey: ["friends", "relationship"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });

      setAvatarFile(null);
      setChanged(false);
      showToast("Profile updated", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(originalValues.current.displayName);
    setAbout(originalValues.current.about);
    setAvatar(originalValues.current.avatar);
    setAvatarFile(null);
    setChanged(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to logout:", err);
      showToast("Failed to logout", "error");
    }
  };

  const previewCard = (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111214] shadow-2xl">
      <ProfileBanner alt={displayName || username} />

      <div className="px-4 pb-4">
        <div className="-mt-10 w-fit">
          <ProfileAvatar
            username={displayName || username}
            avatarUrl={avatar}
            size={80}
          />
        </div>
        <div className="pt-3">
          <ProfileIdentity
            displayName={displayName}
            username={username || "username"}
          />
        </div>
      </div>

      <div className="mx-3 mb-3 rounded-xl bg-[#18191c]/80 p-3.5 ring-1 ring-white/[0.04]">
        <ProfileAbout bio={about} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-black text-white">
      <div className="hidden md:block">
        <SettingsSidebar />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative h-full w-72 overflow-y-auto bg-black shadow-xl">
            <SettingsSidebar />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-white/[0.06] bg-black/80 px-4 backdrop-blur-md md:px-8">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-[#b5bac1] transition hover:text-white md:hidden"
            aria-label="Open settings menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-[#72767d] transition hover:text-[#b5bac1]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="mx-1 hidden h-4 w-px bg-white/[0.06] sm:block" />
          <span className="hidden text-sm text-[#72767d] sm:inline">
            User Settings
          </span>
          <span className="hidden text-sm text-[#72767d] sm:inline">/</span>
          <span className="text-sm font-medium text-[#b5bac1]">Profile</span>
        </div>

        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            {loading ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 space-y-5">
                  <Skeleton className="h-6 w-40 rounded" />
                  <SettingsFormSkeleton fields={4} />
                </div>
                <div className="min-w-0">
                  <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111214] shadow-2xl">
                    <ProfileSkeleton variant="page" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="order-2 min-w-0 space-y-5 lg:order-1">
                  <SectionCard title="Avatar" description="Change your profile picture.">
                    <div className="flex flex-wrap items-center gap-4">
                      <ProfileAvatar
                        username={displayName || username}
                        avatarUrl={avatar}
                        size={64}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => avatarInput.current?.click()}
                          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-[#18191c] px-4 text-sm font-medium text-[#b5bac1] transition hover:bg-[#23272a] hover:text-white"
                        >
                          <Camera className="h-4 w-4" />
                          Change Avatar
                        </button>
                        <p className="mt-1.5 text-xs text-[#72767d]">
                          PNG or JPG. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </SectionCard>

                  <input
                    ref={avatarInput}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />

                  <SectionCard title="Profile" description="How you appear across Echo.">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="display-name" className={fieldLabelClass}>
                          Display Name
                        </label>
                        <input
                          id="display-name"
                          value={displayName}
                          maxLength={NAME_MAX_LENGTH}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className={inputClass}
                          placeholder="Display name"
                        />
                      </div>

                      <div>
                        <label htmlFor="username" className={fieldLabelClass}>
                          Username
                        </label>
                        <input
                          id="username"
                          value={username}
                          readOnly
                          className={readonlyInputClass}
                        />
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="About Me" description="Tell people what you're about.">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="about" className={fieldLabelClass}>
                          Bio
                        </label>
                        <span className="text-xs text-[#72767d]">
                          {about.length}/{BIO_MAX_LENGTH}
                        </span>
                      </div>
                      <textarea
                        id="about"
                        value={about}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next.length > BIO_MAX_LENGTH) {
                            showBioLimitToast();
                            setAbout(next.slice(0, BIO_MAX_LENGTH));
                            return;
                          }
                          setAbout(next);
                        }}
                        onKeyDown={(e) => {
                          const isModifier = e.ctrlKey || e.metaKey || e.altKey;
                          const isSingleCharKey = e.key.length === 1;
                          if (
                            !isModifier &&
                            isSingleCharKey &&
                            about.length >= BIO_MAX_LENGTH
                          ) {
                            e.preventDefault();
                            showBioLimitToast();
                          }
                        }}
                        className={`${inputClass} min-h-[100px] resize-none`}
                        placeholder="Tell people about yourself"
                      />
                    </div>
                  </SectionCard>
                </div>

                <div className="order-1 min-w-0 lg:order-2">
                  <div className="lg:sticky lg:top-16">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#72767d]">
                      Profile Preview
                    </p>
                    {previewCard}

                    <div className="mt-4 flex items-stretch gap-2 rounded-2xl bg-black p-4 shadow-2xl">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-[#18191c] px-4 text-sm font-medium text-[#ed4245] transition hover:bg-[#ed4245]/10 hover:text-[#ed4245]"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={!changed || isSaving}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg border border-white/[0.06] bg-[#18191c] px-4 text-sm font-medium text-[#b5bac1] transition hover:bg-[#23272a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!changed || isSaving}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-5 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}