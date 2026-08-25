"use client";
import { useRouter } from "next/navigation";

export default function Navbar() {
  useRouter();
  return (
    <nav className="w-screen px-6 py-4 ">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
      </div>
    </nav>
  );
}
