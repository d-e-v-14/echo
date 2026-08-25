"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  useRouter();
  return (
    <nav className="w-screen px-6 py-4 ">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="logo" className="h-16 w-20" />
        </div> */}


      </div>
    </nav>
  );
}
