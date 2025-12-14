"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinServer } from "@/app/api/API";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }

    const join = async () => {
      try {
        await joinServer(code);
        router.replace("/servers");
      } catch (err: any) {
router.replace("/servers");
}
finally {
        setLoading(false);
      }
    };

    join();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-black to-gray-900 text-white px-6">
      <div className="w-full max-w-md bg-[#111214] rounded-2xl shadow-2xl p-8 border border-gray-800 text-center">
        {loading && (
          <>
            <h1 className="text-2xl font-bold mb-3">Joining Server</h1>
            <p className="text-gray-400">
              Accepting invite… please wait
            </p>
          </>
        )}

        {!loading && error && (
          <>
            <h1 className="text-2xl font-bold mb-3 text-red-500">
              Invite Failed
            </h1>
            <p className="text-gray-400 mb-6">{error}</p>

            <button
              onClick={() => router.push("/servers")}
              className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
            >
              Back to Servers
            </button>
          </>
        )}
      </div>
    </div>
  );
}
