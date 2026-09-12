"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Home from "@/app/page";

const LEGAL_PATHS = ["/privacy", "/terms", "/community-guidelines", "/eula"];

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isLegalPath = LEGAL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const isHomePath = pathname === "/";

  if (isMobile && !isLegalPath && !isHomePath) {
    return (
      <div className="[&_nav]:hidden">
        <Home />
      </div>
    );
  }

  return <>{children}</>;
}
