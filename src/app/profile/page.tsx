// src/app/profile/page.tsx
"use client";

import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center p-10 select-none">
      <div className="flex flex-col md:flex-row gap-10 w-full max-w-6xl">
        {/* Left: Profile Card & About */}
        <div className="flex-1">
          {/* Profile Card */}
          <div
            className="rounded-3xl text-center text-white shadow-xl p-12"
            style={{
              backgroundImage: "url('/bg-dashboard.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative flex flex-col items-center">
              <Image
                src="/User_profil.png"
                alt="Profile"
                width={120}
                height={120}
                className="rounded-full border-4 border-blue-400"
              />
              <span className="absolute bottom-1 right-[42%] w-4 h-4 rounded-full bg-green-500 border-2 border-black" />
            </div>
            <h2 className="text-xl font-semibold mt-4">Sophie Fortune</h2>
            <p className="text-sm text-gray-300">@sophiefortune</p>
          </div>

          {/* About Section - BELOW the card */}
          <div className="mt-6">
            <h3 className="text-sm mb-2 ml-1">About</h3>
            <div className="bg-[#333] text-sm text-gray-200 p-4 rounded-xl">
              Gamer, dreamer, meme enthusiast. I run on caffeine and chaos.
              Fluent in sarcasm, bad puns, and Discord emojis. Here to vibe,
              chat, laugh, and pretend I’m productive.
            </div>
          </div>
        </div>

        {/* Right: Edit Section */}
        <div className="flex flex-col justify-start w-full md:w-1/2 space-y-4">
          <div>
            <label className="block text-sm mb-1">Display Name</label>
            <input
              value="Sophie Fortune"
              readOnly
              className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input
              value="@sophie&89"
              readOnly
              className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <div className="relative">
              <input
                value="xxxxxxxxxxx@gmail.com"
                readOnly
                className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
              />
              <span className="absolute right-3 top-2.5 text-sm cursor-pointer">
                ✏️
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Phone Number</label>
            <div className="relative">
              <input
                value="xxxxxxxxxx"
                readOnly
                className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
              />
              <span className="absolute right-3 top-2.5 text-sm cursor-pointer">
                ✏️
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <button className="bg-yellow-400 text-black px-4 py-2 rounded-md font-semibold hover:brightness-110">
              Change Password
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700">
              Disable Account
            </button>
            <button className="bg-blue-800 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-900">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
