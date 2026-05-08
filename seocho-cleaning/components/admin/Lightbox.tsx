"use client";

import { useEffect, useCallback } from "react";

export type PhotoEntry = {
  photoUrl: string;
  itemName: string;
  itemId: string;
  workerName: string;
  date: string;
  timeSlotLabel: string;
  note: string;
};

interface Props {
  photos: PhotoEntry[];
  index: number;
  onClose: () => void;
  onIndexChange: (idx: number) => void;
}

/** Google Drive URL을 인라인 임베딩 가능한 thumbnail URL로 변환. 다른 URL은 그대로 통과. */
export function toEmbedUrl(url: string, size = 1600): string {
  if (!url) return url;
  const match = url.match(/\/file\/d\/([^/]+)|[?&]id=([^&]+)/);
  const fileId = match?.[1] || match?.[2];
  if (fileId && url.includes("drive.google.com")) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }
  return url;
}

export default function Lightbox({ photos, index, onClose, onIndexChange }: Props) {
  const photo = photos[index];

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index < photos.length - 1) onIndexChange(index + 1);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <div className="text-sm font-medium tabular-nums">
          <span className="text-white">{index + 1}</span>
          <span className="text-white/40 mx-1">/</span>
          <span className="text-white/60">{photos.length}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 이미지 영역 */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4 relative min-h-0">
        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="이전"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={toEmbedUrl(photo.photoUrl, 1600)}
          alt={photo.itemName}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {index < photos.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="다음"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* 메타데이터 스트립 */}
      <div
        className="bg-black/60 backdrop-blur text-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 tracking-wider">
              불량
            </span>
            <span className="text-base font-bold tracking-tight">
              {photo.itemName}
            </span>
          </div>
          <p className="text-xs text-white/70">
            {photo.date} · {photo.timeSlotLabel} · {photo.workerName}
          </p>
          {photo.note && (
            <p className="text-sm mt-3 text-white/95 leading-relaxed">
              📝 {photo.note}
            </p>
          )}
          <a
            href={photo.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-block mt-3 text-xs text-white/60 hover:text-white underline"
          >
            원본 열기 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
