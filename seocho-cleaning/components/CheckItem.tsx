"use client";

import { useState, useRef } from "react";
import type { ChecklistItem, GradeId, CheckResult } from "@/lib/config";

interface Props {
  item: ChecklistItem;
  index?: number;
  value: CheckResult | undefined;
  onChange: (result: CheckResult) => void;
}

export default function CheckItem({ item, index, value, onChange }: Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    value?.photoBase64 || null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const setGrade = (grade: GradeId) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
    if (grade !== "C") {
      setPhotoPreview(null);
      onChange({ itemId: item.id, itemName: item.name, grade });
    } else {
      onChange({
        itemId: item.id,
        itemName: item.name,
        grade,
        note: value?.note || "",
      });
    }
  };

  const setNote = (note: string) => {
    if (!value) return;
    onChange({ ...value, note });
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !value) return;
    const compressed = await compressImage(file, 1280, 0.7);
    setPhotoPreview(compressed);
    onChange({ ...value, photoBase64: compressed });
  };

  const removePhoto = () => {
    if (!value) return;
    setPhotoPreview(null);
    onChange({ ...value, photoBase64: undefined });
    if (fileRef.current) fileRef.current.value = "";
  };

  const grade = value?.grade;
  const isC = grade === "C";
  const isDone = !!grade;

  // 카드 외곽 색상 (선택된 등급에 따라)
  const cardBorder = isDone
    ? grade === "A"
      ? "border-emerald-200 bg-emerald-50/40"
      : grade === "B"
      ? "border-amber-200 bg-amber-50/40"
      : "border-red-300 bg-red-50/40"
    : "border-gray-200 bg-white";

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-colors ${cardBorder}`}
    >
      {/* 헤더: 번호 + 제목 + 완료 표시 */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isDone
              ? grade === "A"
                ? "bg-emerald-500 text-white"
                : grade === "B"
                ? "bg-amber-500 text-white"
                : "bg-red-500 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {isDone ? grade : index ?? ""}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight">
            {item.name}
          </p>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* 등급 버튼 */}
      <div className="grid grid-cols-3 gap-2">
        <GradeButton
          grade="A"
          label="양호"
          subLabel="A"
          selected={grade === "A"}
          onClick={() => setGrade("A")}
        />
        <GradeButton
          grade="B"
          label="보통"
          subLabel="B"
          selected={grade === "B"}
          onClick={() => setGrade("B")}
        />
        <GradeButton
          grade="C"
          label="조치"
          subLabel="C"
          selected={grade === "C"}
          onClick={() => setGrade("C")}
        />
      </div>

      {isC && (
        <div className="mt-4 space-y-3 animate-pop-in">
          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1.5">
              어떤 문제인가요? *
            </label>
            <input
              type="text"
              placeholder="예) 책상 두 개가 흐트러져 있음"
              value={value?.note || ""}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-2 border-red-300 bg-white text-base focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500"
            />
          </div>

          {!photoPreview ? (
            <label className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-red-300 bg-red-50 text-red-700 text-sm font-semibold cursor-pointer hover:bg-red-100 transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              사진 첨부 (선택)
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhoto}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative rounded-xl overflow-hidden border-2 border-red-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="첨부 사진"
                className="w-full max-h-56 object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/85 text-white flex items-center justify-center"
                aria-label="사진 제거"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GradeButton({
  grade,
  label,
  subLabel,
  selected,
  onClick,
}: {
  grade: GradeId;
  label: string;
  subLabel: string;
  selected: boolean;
  onClick: () => void;
}) {
  const styles: Record<GradeId, { sel: string; unsel: string }> = {
    A: {
      sel: "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100",
      unsel:
        "bg-white border-gray-300 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50",
    },
    B: {
      sel: "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100",
      unsel:
        "bg-white border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50",
    },
    C: {
      sel: "bg-red-500 border-red-500 text-white shadow-md shadow-red-100",
      unsel:
        "bg-white border-gray-300 text-gray-700 hover:border-red-300 hover:bg-red-50",
    },
  };

  const style = selected ? styles[grade].sel : styles[grade].unsel;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`grade-btn h-14 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-0 ${style}`}
    >
      <span className="text-base leading-tight">{label}</span>
      <span
        className={`text-[10px] tracking-widest ${
          selected ? "text-white/80" : "text-gray-400"
        }`}
      >
        {subLabel}
      </span>
    </button>
  );
}

// ============================================
// 이미지 압축 유틸
// ============================================
async function compressImage(
  file: File,
  maxSize: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
