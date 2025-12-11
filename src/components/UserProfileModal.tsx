"use client";

import React from "react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
  } | null;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
}: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm">
      <div className="bg-[#1E1F22] rounded-2xl shadow-2xl w-80 p-6 text-white relative animate-fadeIn">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ✖
        </button>
        <div className="flex flex-col items-center space-y-3">
          <img
            src={user.avatarUrl || "/User_profil.png"}
            alt={user.username}
            className="w-20 h-20 rounded-full border-2 border-gray-500"
          />
          <h2 className="text-xl font-semibold">{user.username}</h2>
          {user.about && (
            <p className="text-sm text-gray-300 text-center">{user.about}</p>
          )}
          <div className="w-full mt-4">
            <button
              onClick={onClose}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
