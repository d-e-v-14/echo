"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinServerPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!inviteCode.trim()) {
      setError("Please enter a valid invite code or link.");
      return;
    }

    try {
      setLoading(true);
    
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/server/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ inviteCode }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to join server");
      }

      router.push("/servers"); 
    } catch (err) {
      setError("Failed to join server. Check your invite code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md bg-[#000000] rounded-2xl shadow-lg p-8 border border-gray-800">
        <h1 className="text-2xl font-bold mb-2 text-center">Join a Server</h1>
        <p className="text-gray-400 text-center mb-6">
          Enter an invite code or link to join your friend's server.
        </p>

        <form onSubmit={handleJoinServer} className="space-y-5">
          <div>
            <label
              htmlFor="inviteCode"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Invite Code or Link
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. abcd1234 or https://discord.gg/abcd1234"
              className="w-full px-4 py-2 rounded-md bg-[#2f3136] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md font-semibold text-white transition-all ${
              loading
                ? "bg-blue-800 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Joining..." : "Join Server"}
          </button>
        </form>

        <button
          onClick={() => router.push("/servers")}
          className="mt-6 w-full py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-all"
        >
          ← Back to Servers
        </button>
      </div>

      <p className="mt-8 text-gray-500 text-sm">
        Don’t have an invite?{" "}
        <button
          onClick={() => router.push("/create-server")}
          className="text-blue-400 hover:underline"
        >
          Create your own server
        </button>
      </p>
    </div>
  );
}
