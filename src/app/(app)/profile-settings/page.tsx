"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { apiClient } from "@/api/axios";
import { useUser } from "@/components/UserContext";
import { SettingsFormSkeleton } from "@/components/loading/pageSkeletons";

const BIO_MAX_LENGTH = 100;

export default function ProfilePage() {
  useRouter();
  const { setUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [email, setEmail] = useState("");

  const [avatar, setAvatar] = useState("/User_profil.png");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [editing, setEditing] = useState({ name: false, about: false });
  const [, setPrevName] = useState("");
  const [prevAbout, setPrevAbout] = useState("");

  const [changed, setChanged] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastBioLimitToastAt, setLastBioLimitToastAt] = useState(0);

  const avatarInput = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const aboutTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const showBioLimitToast = () => {
    const now = Date.now();
    if (now - lastBioLimitToastAt < 1200) return;
    setLastBioLimitToastAt(now);
    showToast("Bio cannot exceed 100 characters.");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/api/profile/getProfile");
        const profile = res.data.user;

        setDisplayName(profile.fullname || "");
        setUsername(profile.username || "");
        setAbout((profile.bio || "").slice(0, BIO_MAX_LENGTH));
        setEmail(profile.email || "");
        setAvatar(profile.avatar_url || "/User_profil.png");

        setUser(profile);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setUser]);

  useEffect(() => {
    if (!loading) setChanged(true);
  }, [displayName, about, avatarFile, loading]);

  useEffect(() => {
    if (editing.name) nameInputRef.current?.focus();
  }, [editing.name]);

  useEffect(() => {
    if (editing.about) aboutTextareaRef.current?.focus();
  }, [editing.about]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum avatar size is 5MB");
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
      formData.append("fullname", displayName);
      formData.append("bio", about.slice(0, BIO_MAX_LENGTH));
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await apiClient.patch("/api/profile/updateProfile", formData);

      const updatedUser = res.data.user;

      setAvatar(updatedUser.avatar_url || "/User_profil.png");

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-profile-updated"));

      setAvatarFile(null);
      setChanged(false);
      showToast("Profile updated");
    } catch (err) {
      console.error(err);
      showToast("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-6 py-16 flex justify-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 opacity-70">
          <SettingsFormSkeleton fields={4} />
          <SettingsFormSkeleton fields={2} titleWidth="w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12 flex justify-center">
      {toast && (
        <div className="fixed top-6 right-6 bg-[#3ba55c] text-white px-6 py-3 rounded shadow-lg z-50 text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="bg-[#18191c] border border-[#23272a] rounded p-8 flex flex-col items-center gap-5">
            <div
              className="group relative cursor-pointer"
              onClick={() => avatarInput.current?.click()}
            >
              <div className="relative h-28 w-28 rounded-full border-2 border-[#72767d] overflow-hidden transition-all group-hover:border-[#FFC341]">
                <Image
                  src={avatar}
                  alt="Avatar"
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 bg-[#72767d] rounded-full p-1 cursor-pointer hover:bg-[#b5bac1] transition">
                <Pencil size={14} className="text-[#23272a]" />
              </div>
            </div>

            <input
              ref={avatarInput}
              type="file"
              hidden
              accept="image/*"
              onChange={handleAvatarChange}
            />

            <div className="text-center">
              <h2 className="text-xl font-bold text-white truncate max-w-[220px]">
                {displayName}
              </h2>
              <p className="text-sm text-[#b5bac1]">@{username}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="block font-semibold text-[#b5bac1]">
                About
              </label>
              <button
                onClick={() => {
                  setPrevAbout(about);
                  setEditing((p) => ({ ...p, about: true }));
                }}
                className={`text-xs flex items-center gap-1 transition ${
                  editing.about
                    ? "text-[#FFC341]"
                    : "text-[#72767d] hover:text-[#b5bac1]"
                }`}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>

            <textarea
              ref={aboutTextareaRef}
              value={about}
              readOnly={!editing.about}
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
                if (e.key === "Escape") {
                  setAbout(prevAbout);
                  setEditing((p) => ({ ...p, about: false }));
                  return;
                }

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
              onBlur={() => setEditing((p) => ({ ...p, about: false }))}
              className="w-full flex-1 resize-none p-4 rounded bg-black text-white border-2 border-[#72767d] focus:border-[#b5bac1] focus:outline-none transition-all duration-200 min-h-[120px]"
            />
            <div className="mt-2 text-right text-xs text-[#72767d]">
              {about.length}/{BIO_MAX_LENGTH}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-center">
              <label className="block font-semibold text-[#b5bac1]">
                Display Name
              </label>
              <button
                onClick={() => {
                  setPrevName(displayName);
                  setEditing((p) => ({ ...p, name: true }));
                }}
                className={`text-xs flex items-center gap-1 transition ${
                  editing.name
                    ? "text-[#FFC341]"
                    : "text-[#72767d] hover:text-[#b5bac1]"
                }`}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>

            <input
              ref={nameInputRef}
              value={displayName}
              maxLength={20}
              readOnly={!editing.name}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => setEditing((p) => ({ ...p, name: false }))}
              className="w-full mt-3 px-4 py-3 rounded bg-black text-white border-2 border-[#72767d] focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#b5bac1]">
              Username
            </label>
            <input
              value={username}
              readOnly
              className="w-full mt-3 px-4 py-3 rounded bg-black text-[#72767d] border-2 border-[#72767d] cursor-not-allowed opacity-70"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#b5bac1]">
              Email
            </label>
            <input
              value={email}
              readOnly
              className="w-full mt-3 px-4 py-3 rounded bg-black text-[#72767d] border-2 border-[#72767d] cursor-not-allowed opacity-70"
            />
          </div>

          <div className="pt-6 border-t border-[#23272a]">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!changed || isSaving}
                className={`font-bold rounded px-6 py-3 transition-all duration-200 ${
                  changed && !isSaving
                    ? "bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black hover:-translate-y-0.5"
                    : "bg-[#23272a] text-[#72767d] cursor-not-allowed border border-[#72767d]"
                }`}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
