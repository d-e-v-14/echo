"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinServer } from "@/api";
import Loader from "@/components/Loader";
import Toast from "@/components/Toast";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const joinAttemptRef = useRef<string | null>(null);

  const [pageState, setPageState] = useState<
    "loading" | "confirm" | "joining" | "done" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!code) {
      setToast({ message: "Invalid invite link.", type: "error" });
      setError("Invalid invite link.");
      setPageState("error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const tokenExpiry = localStorage.getItem("tokenExpiry");
    const isExpired = tokenExpiry && Date.now() > parseInt(tokenExpiry);

    if (!token || isExpired) {
      localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
      setToast({ message: "Please log in to join this server.", type: "info" });
      setTimeout(() => router.replace("/"), 1000);
      return;
    }

    setPageState("confirm");
  }, [code, router]);

  const handleJoin = async () => {
    if (!code || joinAttemptRef.current === code) return;
    joinAttemptRef.current = code;

    const lockKey = `invite_lock_${code}`;
    const existingLock = localStorage.getItem(lockKey);
    if (existingLock && Date.now() - parseInt(existingLock) < 10000) {
      setToast({ message: "Join already in progress...", type: "info" });
      return;
    }
    localStorage.setItem(lockKey, Date.now().toString());

    setPageState("joining");

    try {
      setToast({ message: "Accepting invite…", type: "info" });

      await joinServer(code);

      localStorage.removeItem(lockKey);

      setToast({ message: "Joined server successfully!", type: "success" });
      setPageState("done");

      setTimeout(() => {
        router.replace("/servers");
      }, 800);
    } catch (err: any) {
      localStorage.removeItem(lockKey);

      if (err.code === "AUTH_REQUIRED" || err?.response?.status === 401) {
        localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
        setToast({
          message: "Session expired. Please log in again.",
          type: "info",
        });
        setTimeout(() => {
          router.replace("/");
        }, 1000);
        return;
      }

      const msg = err?.message || "Failed to join the server.";

      setToast({ message: msg, type: "error" });

      setError(msg);
      setErrorCode(err?.code || "");
      setPageState("error");
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
        <div className="w-full max-w-md bg-[#111214] rounded-2xl shadow-2xl p-8 border border-gray-800">
          {(pageState === "loading" || pageState === "joining") && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
              {pageState === "joining" && (
                <p className="mt-4 text-sm text-gray-400 text-center">
                  Joining server...
                </p>
              )}
            </div>
          )}

          {pageState === "confirm" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center mb-2">
                You&apos;re invited!
              </h1>

              <p className="text-gray-400 text-center mb-6">
                Someone has invited you to join their server. Click below to
                accept.
              </p>

              <div className="bg-[#1e1f22] rounded-lg px-4 py-3 mb-6 text-center border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Invite Code
                </p>
                <p className="text-lg font-mono font-semibold text-white tracking-widest">
                  {code}
                </p>
              </div>

              <button
                onClick={handleJoin}
                className="w-full py-3 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-500 transition-all"
              >
                Join Server
              </button>

              <button
                onClick={() => router.push("/servers")}
                className="w-full mt-2 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </>
          )}

          {pageState === "done" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-600/20">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center mb-2 text-green-400">
                Joined!
              </h1>

              <p className="text-gray-400 text-center">
                Redirecting to your servers...
              </p>
            </>
          )}

          {pageState === "error" && errorCode === "USER_BANNED" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/20">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold mb-3 text-red-500 text-center">
                Access Denied
              </h1>

              <p className="text-gray-300 mb-2 font-semibold text-center">
                {error}
              </p>

              <p className="text-gray-400 mb-6 text-sm text-center">
                You have been banned from this server and cannot join. Please
                contact the server administrators if you believe this is a
                mistake.
              </p>

              <button
                onClick={() => router.push("/servers")}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition"
              >
                Back to Servers
              </button>
            </>
          )}

          {pageState === "error" && errorCode !== "USER_BANNED" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-600/20">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold mb-3 text-white text-center">
                Invite Failed
              </h1>

              <p className="text-gray-400 mb-6 text-center">{error}</p>

              <button
                onClick={() => router.push("/servers")}
                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-white"
              >
                Back to Servers
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
