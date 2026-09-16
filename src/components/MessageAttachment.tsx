"use client";

import React, { useState } from "react";
import {
  Download,
  File,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useImageModal } from "@/contexts/ImageModalContext";
import { safeHref, isSafeMediaUrl } from "@/lib/security/safeUrl";

interface MessageAttachmentProps {
  media_url: string;
  media_type?: string;
}

const FILE_ICONS: Record<string, LucideIcon> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  rtf: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  ppt: FileText,
  pptx: FileText,
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  m4a: FileAudio,
  mp4: FileVideo,
  avi: FileVideo,
  mov: FileVideo,
  mkv: FileVideo,
  webm: FileVideo,
};

function getFileName(url: string, isBlobUrl: boolean, ext: string): string {
  if (isBlobUrl) return ext ? `Attachment.${ext}` : "Attachment";

  try {
    const path = url.split("?")[0].split("#")[0];
    const raw = decodeURIComponent(path.split("/").pop() || "");
    return raw || (ext ? `Attachment.${ext}` : "Attachment");
  } catch {
    return ext ? `Attachment.${ext}` : "Attachment";
  }
}

export default function MessageAttachment({
  media_url,
  media_type,
}: MessageAttachmentProps) {
  const { openImage } = useImageModal();
  const [downloading, setDownloading] = useState(false);

  if (!media_url || !isSafeMediaUrl(media_url)) return null;

  const isBlobUrl = media_url.startsWith("blob:");
  const ext = media_url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

  const isImage =
    isBlobUrl ||
    imageExts.includes(ext) ||
    (media_type && media_type.startsWith("image/"));

  if (isImage) {
    return (
      <>
        <img
          src={media_url}
          alt="attachment"
          className="w-40 h-40 rounded-lg object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          onClick={() => openImage(media_url)}
          onError={(e) => {
            console.error("Failed to load image:", media_url);
            e.currentTarget.style.display = "none";
          }}
        />
      </>
    );
  }

  const Icon = FILE_ICONS[ext] || File;
  const fileName = getFileName(media_url, isBlobUrl, ext);
  const typeLabel = ext ? ext.toUpperCase() : "FILE";
  const href = safeHref(media_url);

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (downloading) return;

    setDownloading(true);
    try {
      const response = await fetch(media_url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Failed to download file:", error);
      if (href) {
        window.open(href, "_blank", "noopener,noreferrer");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="group flex w-full max-w-xs items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-left transition-colors hover:bg-white/20">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/30 text-[#dbdee1]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[#dbdee1]">
            {fileName}
          </span>
          <span className="block text-xs text-[#949ba4]">{typeLabel}</span>
        </span>
      </a>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Download ${fileName}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b5bac1] transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
