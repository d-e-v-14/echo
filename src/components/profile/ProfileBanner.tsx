"use client";

import { useState } from "react";

interface ProfileBannerProps {
  url?: string | null;
  alt?: string;
}

export function ProfileBanner({ url, alt }: ProfileBannerProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;

  return (
    <div className="relative h-24 w-full shrink-0 overflow-hidden bg-[#18191c] sm:h-28">
      {showImage ? (
        <img
          src={url as string}
          alt={alt ? `${alt}'s banner` : "Profile banner"}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFC341]/25 via-[#23272a] to-[#0d0e10]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  );
}
