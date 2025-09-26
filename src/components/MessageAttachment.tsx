"use client";

import React, { useState } from 'react';

interface MessageAttachmentProps {
  media_url: string;
}

export default function MessageAttachment({ media_url }: MessageAttachmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!media_url) return null;

  // Extract file extension from URL (remove query params first)
  const ext = media_url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  
  if (imageExts.includes(ext)) {
    return (
      <>
        <img 
          src={media_url} 
          alt="attachment" 
          className="max-w-60 rounded-lg object-cover border border-white/20 cursor-pointer"
          loading="lazy"
          onClick={() => setIsModalOpen(true)}
          onError={(e) => {
            console.error('Failed to load image:', media_url);
            e.currentTarget.style.display = 'none';
          }}
        />
        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
            onClick={() => setIsModalOpen(false)}
          >
            <img 
              src={media_url} 
              alt="attachment full-size" 
              className="max-w-[95vw] max-h-[95vh] object-contain"
            />
            <button 
              className="absolute top-4 right-4 text-white text-2xl font-bold"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>
          </div>
        )}
      </>
    );
  }

  // For non-image files, show download link with appropriate icon
  const getFileIcon = (extension: string) => {
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📋';
      case 'zip':
      case 'rar':
      case '7z':
        return '🗜️';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return '🎵';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎬';
      default:
        return '📎';
    }
  };

  return (
    <a 
      href={media_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
    >
      <span className="text-lg">{getFileIcon(ext)}</span>
      <span className="text-sm">
        Download file {ext ? `(${ext.toUpperCase()})` : ''}
      </span>
    </a>
  );
}