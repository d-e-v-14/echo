"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { fetchProfile, logout } from "@/api";
import { profile } from "@/api/types/profile.types";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { ProfilePageSkeleton } from "@/components/loading/pageSkeletons";

export default function ProfilePage() {
  const [profile, setProfile] = useState<profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const router = useRouter();
  const goToProfileSettings = () => {
    router.push("/profile-settings");
  };
  useEffect(() => {
    const getProfileData = async () => {
      try {
        const data = await fetchProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);

        setToast({
          message: "Could not load profile",
          type: "error",
        });

        setError("Could not load profile");
      } finally {
        setLoading(false);
      }
    };

    getProfileData();
  }, []);

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!profile) {
    return <ProfilePageSkeleton />;
  }

  const handleLogout = async () => {
    try {
      setToast({ message: "Logging out…", type: "info" });

      await logout();

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToast({ message: "Logged out successfully", type: "success" });

      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (error) {
      console.error("Failed to logout:", error);

      setToast({
        message: "Failed to logout",
        type: "error",
      });
    }
  };

  return (
    <>
      {toast &&
        (() => {
          const { message, type } = toast;
          return (
            <div className="fixed top-6 right-6 z-[9999]">
              <Toast
                message={message}
                type={type}
                duration={3000}
                onClose={() => setToast(null)}
              />
            </div>
          );
        })()}

      <div className="flex min-h-screen bg-black text-white relative font-poppins">
        <main className="flex-1 p-10 flex flex-col gap-6 relative">
          <div className="relative w-[calc(100%-2rem)] ml-[1.5rem] mr-[20rem] rounded overflow-hidden shadow-lg">
            <img
              src="/banner.png"
              alt="Banner"
              className="w-full h-36 object-cover rounded border border-[#23272a]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <section className="flex flex-row gap-8 w-full">
            <div className="flex-1 min-w-0 relative">
              <div
                className="absolute -top-[80px] left-4 z-20"
                style={{ width: 140, height: 140 }}
              >
                <div className="relative w-[140px] h-[140px]">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFC341] to-[#FFD700] p-[3px]">
                    <div className="w-full h-full rounded-full bg-black p-[2px]">
                      <img
                        src={profile?.avatar_url || "/avatar.png"}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 ml-1">
                <h1 className="text-3xl font-bold flex items-center justify-between">
                  {profile.fullname}

                  <button
                    onClick={goToProfileSettings}
                    className="text-white/50 hover:text-white transition cursor-pointer"
                    aria-label="Edit profile name"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M18.5 2.5C18.8978 2.10218 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43738 22.1213 4C22.1213 4.56262 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </h1>
                <p className="text-sm text-white/60">@{profile.username}</p>
                <div className="mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold">About</h3>
                    <button
                      onClick={goToProfileSettings}
                      className="text-white/50 hover:text-white"
                    ></button>
                  </div>

                  <p className="mt-4 text-white/70 border-t border-white/20 pt-4 text-[1.12rem]">
                    {profile.bio || "Enter interesting details about you!"}
                  </p>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold -mb-2">
                    Avatar & Banner
                  </h3>
                  <hr className="my-4 border-t border-white/20" />
                  <div className="flex gap-4">
                    <button
                      className="bg-[#23272a] hover:bg-[#2f3136] text-white font-semibold px-3 py-1.5 rounded text-sm border border-[#72767d] transition"
                      onClick={() => router.push("/profile-settings")}
                    >
                      Change Avatar
                    </button>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2">
                    Account Settings
                  </h3>
                  <hr className="my-2 border-t border-white/20" />

                  <Link
                    href="/profile-settings"
                    className="bg-[#23272a] hover:bg-[#2f3136] px-3 py-1.5 rounded text-white text-sm border border-[#72767d] transition inline-block"
                  >
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="bg-[#23272a] hover:bg-[#ed4245]/10 px-3 py-1.5 rounded text-[#ed4245] text-sm ml-2 border border-[#ed4245]/30 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div
              className="w-px bg-white/20 ml-4 mr-16"
              style={{ minHeight: 320 }}
            />

            <aside className="w-full lg:w-[380px] bg-[#18191c] border border-[#23272a] rounded p-6 text-white self-start">
              <h2 className="text-xl font-bold text-center mb-4 text-white">
                Unleash Your Profile!
              </h2>
              <p className="text-sm text-[#b5bac1] text-center mb-4">
                Make your profile truly yours with these awesome additions:
              </p>
              <ul className="flex flex-col gap-2 mb-4">
                <li className="flex items-center gap-2 border border-[#23272a] rounded px-3 py-2 hover:bg-[#23272a] transition">
                  <span className="text-[#FFC341]">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7S10.87 0 7 0zm3.36 5.36L6.3 8.42c-.19.19-.44.29-.7.29-.26 0-.51-.1-.7-.29L3.64 6.76c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0L5.6 5.8l3.36-3.36c.39-.39 1.02-.39 1.41 0 .38.39.38 1.01-.01 1.41z" fill="currentColor"/>
                    </svg>
                  </span>
                  <span className="text-sm">Custom Profile Themes</span>
                </li>
                <li className="flex items-center gap-2 border border-[#23272a] rounded px-3 py-2 hover:bg-[#23272a] transition">
                  <span className="text-[#FFC341]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  </span>
                  <span className="text-sm">Profile Anthem/Music</span>
                </li>
                <li className="flex items-center gap-2 border border-[#23272a] rounded px-3 py-2 hover:bg-[#23272a] transition">
                  <span className="text-[#FFC341]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  </span>
                  <span className="text-sm">Animated Avatar Borders</span>
                </li>
                <li className="flex items-center gap-2 border border-[#23272a] rounded px-3 py-2 hover:bg-[#23272a] transition">
                  <span className="text-[#FFC341]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  </span>
                  <span className="text-sm">Achievement Badge</span>
                </li>
                <li className="flex items-center gap-2 border border-[#23272a] rounded px-3 py-2 hover:bg-[#23272a] transition">
                  <span className="text-[#FFC341]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                  </span>
                  <span className="text-sm">Personal Milestones</span>
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-bold rounded py-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5">
                Explore Customizations
              </button>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
