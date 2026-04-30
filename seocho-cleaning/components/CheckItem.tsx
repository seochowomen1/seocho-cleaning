"use client";

import { useState, useRef } from "react";
import type { ChecklistItem, GradeId, CheckResult } from "@/lib/config";

interface Props {
  item: ChecklistItem;
  index?: number;
  value: CheckResult | undefined;
  onChange: (result: CheckResult) => void;
}

const GRADE_COLORS: Record<
  GradeId,
  {
    bar: string;
    badgeBg: string;
    badgeText: string;
    cardBg: string;
    cardBorder: string;
    accent: string;
  }
> = {
  A: {
    bar: "bg-emerald-500",
    badgeBg: "bg-emerald-500",
    badgeText: "text-white",
    cardBg: "bg-emerald-50/50",
    cardBorder: "border-emerald-200",
    accent: "emerald",
  },
  B: {
    bar: "bg-amber-500",
    badgeBg: "bg-amber-500",
    badgeText: "text-white",
    cardBg: "bg-amber-50/50",
    cardBorder: "border-amber-200",
    accent: "amber",
  },
  C: {
    bar: "bg-rose-500",
    badgeBg: "bg-rose-500",
    badgeText: "text-white",
    cardBg: "bg-rose-50/50",
    cardBorder: "border-rose-300",
    accent: "rose",
  },
};

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
  const palette = grade ? GRADE_COLORS[grade] : null;

  return (
    <div
      className={`relative rounded-3xl border-2 p-4 pl-5 shadow-soft transition-all ${
        palette
          ? `${palette.cardBorder} ${palette.cardBg}`
          : "border-ink-100 bg-white hover:border-ink-200"
      }`}
    >
      {/* 좌측 컬러 액센트 바 */}
      <span
        className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
          palette ? palette.bar : "bg-ink-200"
        }`}
        aria-hidden
      />

      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold ${
            isDone
              ? `${palette!.badgeBg} ${palette!.badgeText}`
              : "bg-ink-100 text-ink-500"
          }`}
        >
          {isDone ? grade : index ?? ""}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-base font-bold text-ink-900 leading-tight tracking-tight">
            {item.name}
          </p>
          <p className="mt-1 text-[13px] text-ink-600 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* 등급 버튼 그룹 */}
      <div className="grid grid-cols-3 gap-2">
        <GradeButton
          grade="A"
          label="양호"
          desc="정리 깔끔"
          selected={grade === "A"}
          onClick={() => setGrade("A")}
        />
        <GradeButton
          grade="B"
          label="보통"
          desc="가볍게 정리"
          selected={grade === "B"}
          onClick={() => setGrade("B")}
        />
        <GradeButton
          grade="C"
          label="조치"
          desc="사무실 보고"
          selected={grade === "C"}
          onClick={() => setGrade("C")}
        />
      </div>

      {/* C 등급 입력 영역 */}
      {isC && (
        <div className="mt-4 space-y-3 animate-pop-in">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-rose-700 uppercase mb-1.5">
              어떤 문제인가요? <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예) 책상 두 개가 흐트러져 있음"
              value={value?.note || ""}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border-2 border-rose-200 bg-white text-[15px] focus:outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-400 placeholder:text-ink-400"
            />
          </div>

          {!photoPreview ? (
            <label className="flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-rose-300 bg-white text-rose-700 text-sm font-semibold cursor-pointer hover:bg-rose-50 transition-colors">
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
            <div className="relative rounded-2xl overflow-hidden border-2 border-rose-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="첨부 사진"
                className="w-full max-h-60 object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-ink-900/75 hover:bg-ink-900 text-white flex items-center justify-center transition-colors"
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
  desc,
  selected,
  onClick,
}: {
  grade: GradeId;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  const styles: Record<GradeId, { sel: string; unsel: string }> = {
    A: {
      sel: "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200",
      unsel:
        "bg-white border-ink-200 text-ink-700 hover:border-emerald-300 hover:bg-emerald-50/50",
    },
    B: {
      sel: "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200",
      unsel:
        "bg-white border-ink-200 text-ink-700 hover:border-amber-300 hover:bg-amber-50/50",
    },
    C: {
      sel: "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200",
      unsel:
        "bg-white border-ink-200 text-ink-700 hover:border-rose-300 hover:bg-rose-50/50",
    },
  };
  const style = selected ? styles[grade].sel : styles[grade].unsel;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`grade-btn h-16 rounded-2xl border-2 font-bold flex flex-col items-center justify-center ${style}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-base leading-none">{label}</span>
        <span
          className={`text-[10px] tracking-widest ${
            selected ? "text-white/85" : "text-ink-400"
          }`}
        >
          {grade}
        </span>
      </div>
      <span
        className={`text-[10px] mt-1 ${
          selected ? "text-white/80" : "text-ink-400"
        }`}
      >
        {desc}
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
