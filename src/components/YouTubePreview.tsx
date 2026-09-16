"use client";

import React, { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { safeImgSrc } from "@/lib/security/safeUrl";
import type { YouTubeVideo } from "@/lib/media/youtube";

const titleCache = new Map<string, string>();

interface YouTubePreviewProps {
  video: YouTubeVideo;
}

const YouTubePreview: React.FC<YouTubePreviewProps> = ({ video }) => {
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState<string | undefined>(() =>
    titleCache.get(video.id)
  );

  useEffect(() => {
    const cached = titleCache.get(video.id);
    if (cached) {
      setTitle(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        video.canonicalUrl
      )}&format=json`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const fetched = typeof data?.title === "string" ? data.title.trim() : "";
        if (!cancelled && fetched) {
          titleCache.set(video.id, fetched);
          setTitle(fetched);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [video.id, video.canonicalUrl]);

  const thumbnail = safeImgSrc(video.thumbnailUrl);

  if (playing) {
    return (
      <div className="mt-2 w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-black">
        <div className="relative aspect-video">
          <iframe
            src={video.embedUrl}
            title={title || "YouTube video player"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setPlaying(true);
      }}
      aria-label={title ? `Play ${title}` : "Play YouTube video"}
      className="group relative mt-2 block w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-black text-left"
    >
      <div className="relative aspect-video">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}

        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:bg-[#FFC341] group-hover:text-black">
            <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
          </span>
        </span>

        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FFC341]">
            YouTube
          </span>
          {title ? (
            <span className="line-clamp-2 text-xs font-medium text-white">
              {title}
            </span>
          ) : null}
        </span>
      </div>
    </button>
  );
};

export default YouTubePreview;
