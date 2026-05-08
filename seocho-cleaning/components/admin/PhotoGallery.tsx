"use client";

import { useState, useMemo } from "react";
import Lightbox, { toEmbedUrl, type PhotoEntry } from "./Lightbox";

interface Props {
  photos: PhotoEntry[];
}

export default function PhotoGallery({ photos }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [filterItem, setFilterItem] = useState("");
  const [filterWorker, setFilterWorker] = useState("");
  const [sortDesc, setSortDesc] = useState(true); // true = 최신순

  const itemList = useMemo(() => {
    return Array.from(new Set(photos.map((p) => p.itemName))).sort();
  }, [photos]);

  const workerList = useMemo(() => {
    return Array.from(new Set(photos.map((p) => p.workerName))).sort();
  }, [photos]);

  const filtered = useMemo(() => {
    const f = photos.filter(
      (p) =>
        (!filterItem || p.itemName === filterItem) &&
        (!filterWorker || p.workerName === filterWorker)
    );
    return f.sort((a, b) => {
      const ka = `${a.date}${a.timeSlotLabel}`;
      const kb = `${b.date}${b.timeSlotLabel}`;
      return sortDesc ? kb.localeCompare(ka) : ka.localeCompare(kb);
    });
  }, [photos, filterItem, filterWorker, sortDesc]);

  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-ink-100 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ink-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-ink-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.6}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-base font-bold text-ink-800">사진이 없습니다</p>
        <p className="text-sm text-ink-500 mt-1">
          불량 항목에 사진이 첨부되면 여기에 모입니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filterItem}
          onChange={(e) => setFilterItem(e.target.value)}
          className="h-9 px-3 rounded-lg border border-ink-200 text-sm bg-white shadow-soft hover:border-ink-300 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-400"
        >
          <option value="">전체 항목</option>
          {itemList.map((it) => (
            <option key={it} value={it}>
              {it}
            </option>
          ))}
        </select>
        <select
          value={filterWorker}
          onChange={(e) => setFilterWorker(e.target.value)}
          className="h-9 px-3 rounded-lg border border-ink-200 text-sm bg-white shadow-soft hover:border-ink-300 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-400"
        >
          <option value="">전체 점검자</option>
          {workerList.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="h-9 px-3 rounded-lg border border-ink-200 text-sm bg-white shadow-soft hover:bg-ink-50 inline-flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={
                sortDesc
                  ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  : "M3 4h13M3 8h9m-9 4h9m5 4l-4 4m0 0l-4-4m4 4V4"
              }
            />
          </svg>
          {sortDesc ? "최신순" : "오래된 순"}
        </button>
        <p className="ml-auto text-xs text-ink-500">
          <b className="text-ink-800">{filtered.length}</b>장
          {filtered.length !== photos.length && ` / ${photos.length}장`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-100 p-12 text-center">
          <p className="text-sm text-ink-500">필터 조건에 맞는 사진이 없습니다</p>
          <button
            onClick={() => {
              setFilterItem("");
              setFilterWorker("");
            }}
            className="mt-3 text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            필터 해제
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p, i) => (
            <button
              key={`${p.date}-${p.itemId}-${i}`}
              onClick={() => setLightboxIdx(i)}
              className="group bg-white rounded-2xl border border-ink-100 shadow-soft hover:shadow-card overflow-hidden text-left transition-shadow"
            >
              <div className="aspect-[4/3] bg-ink-100 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toEmbedUrl(p.photoUrl, 600)}
                  alt={p.itemName}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white tracking-wider shadow">
                    불량
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-ink-900 truncate">
                  {p.itemName}
                </p>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  {p.date} · {p.workerName}
                </p>
                {p.note && (
                  <p className="text-xs text-ink-700 mt-1.5 line-clamp-2 leading-relaxed">
                    {p.note}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          photos={filtered}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onIndexChange={setLightboxIdx}
        />
      )}
    </>
  );
}
