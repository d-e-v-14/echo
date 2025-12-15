"use client";

import { useEffect, useState } from "react";

export default function MobileBlocker({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    console.log("mobile-block: effect running");
    const check = () => {
      console.log("mobile-block: innerWidth", window.innerWidth);
      setIsMobile(window.innerWidth < 1024);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  console.log("mobile-block: isMobile =", isMobile);

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6 border-4 border-red-500">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl font-semibold">Mobile App Coming Soon</h1>
          <p className="text-xl">We’re still building the mobile experience.</p>
          <p className="text-xl">For now, please use Echo on a laptop or desktop browser.</p>
          <p className="text-md">Stay tuned</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}