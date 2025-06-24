"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("Sophie Fortune");
  const [username, setUsername] = useState("@sophie&89");
  const [about, setAbout] = useState(
    "Gamer, dreamer, meme enthusiast. I run on caffeine and chaos. Fluent in sarcasm, bad puns, and Discord emojis. Here to vibe, chat, laugh, and pretend I’m productive."
  );
  const [editing, setEditing] = useState({
    name: false,
    username: false,
    about: false,
  });

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center p-10 select-none">
      <div className="flex flex-col md:flex-row gap-10 w-full max-w-6xl">
        {/* Left: Profile Card & About */}
        <div className="flex-1">
          {/* Profile Card with dark overlay */}
          <div className="relative rounded-3xl text-center text-white shadow-xl p-12 overflow-hidden">
            <div
              className="absolute inset-0 z-0 bg-black bg-opacity-95"
              style={{
                backgroundImage: "url('/profile-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <Image
                  src="/User_profil.png"
                  alt="Profile"
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-blue-400"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black" />
              </div>

              <h2 className="text-xl font-semibold mt-4">{displayName}</h2>
              <p className="text-sm text-gray-300">{username}</p>
            </div>
          </div>

          {/* About Section */}
          <div className="mt-6 max-w-[480px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm">About</h3>
              <button
                onClick={() =>
                  setEditing((prev) => ({ ...prev, about: !prev.about }))
                }
              >
                ✏️
              </button>
            </div>
            {editing.about ? (
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                onBlur={() => setEditing((prev) => ({ ...prev, about: false }))}
                className="bg-[#444] border border-gray-300 text-sm text-white p-4 rounded-xl w-full h-40 resize-none focus:outline-none"
              />
            ) : (
              <div className="bg-[#444] border border-gray-300 text-sm text-white p-4 rounded-xl w-full h-40">
                {about}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Info Fields + Buttons */}
        <div className="flex flex-col justify-between w-full md:w-1/2">
          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm">Display Name</label>
                <span
                  className="text-sm cursor-pointer"
                  onClick={() =>
                    setEditing((prev) => ({ ...prev, name: !prev.name }))
                  }
                >
                  ✏️
                </span>
              </div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                readOnly={!editing.name}
                onBlur={() => setEditing((prev) => ({ ...prev, name: false }))}
                className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
              />
            </div>

            {/* Username */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm">Username</label>
                <span
                  className="text-sm cursor-pointer"
                  onClick={() =>
                    setEditing((prev) => ({ ...prev, username: true }))
                  }
                >
                  ✏️
                </span>
              </div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                readOnly={!editing.username}
                onBlur={() =>
                  setEditing((prev) => ({ ...prev, username: false }))
                }
                className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                value="sophie.fortune@gmail.com"
                readOnly
                className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm mb-1">Phone Number</label>
              <input
                value="+91 9876543210"
                readOnly
                className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
              />
            </div>
          </div>

          {/* Buttons Section */}
          <div className="flex flex-col gap-14 mt-10">
            {/* First row: only Change Password */}
            <div>
              <button className="bg-yellow-400 text-black px-6 py-2 rounded-md font-semibold hover:brightness-110">
                Change Password
              </button>
            </div>

            {/* Second row: Disable + Delete */}
            <div className="flex gap-14">
              <button className="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700">
                Disable Account
              </button>
              <button className="bg-blue-800 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-900">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
