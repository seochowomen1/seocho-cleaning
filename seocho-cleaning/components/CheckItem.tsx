"use client";

import { useState, useRef } from "react";
import type { ChecklistItem, GradeId, CheckResult } from "@/lib/config";

interface Props {
  item: ChecklistItem;
  value: CheckResult | undefined;
  onChange: (result: CheckResult) => void;
}

export default function CheckItem({ item, value, onChange }: Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    value?.photoBase64 || null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const setGrade = (grade: GradeId) => {
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

    // 사진 압축 (긴 변 1280px, JPEG 0.7 품질)
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

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-base font-semibold text-gray-900">{item.name}</p>
      <p className="mt-1 mb-3 text-sm text-gray-600 leading-relaxed">
        {item.description}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <GradeButton
          grade="A"
          label="A 양호"
          selected={grade === "A"}
          onClick={() => setGrade("A")}
        />
        <GradeButton
          grade="B"
          label="B 보통"
          selected={grade === "B"}
          onClick={() => setGrade("B")}
        />
        <GradeButton
          grade="C"
          label="C 조치"
          selected={grade === "C"}
          onClick={() => setGrade("C")}
        />
      </div>

      {isC && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="특이사항을 입력해주세요"
            value={value?.note || ""}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-red-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-red-200"
          />

          {!photoPreview ? (
            <label className="flex items-center justify-center h-11 rounded-lg border border-dashed border-red-300 bg-red-50 text-red-700 text-sm font-medium cursor-pointer">
              📷 사진 첨부 (선택)
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
            <div className="relative">
              <img
                src={photoPreview}
                alt="첨부 사진"
                className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
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
  selected,
  onClick,
}: {
  grade: GradeId;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const styles: Record<GradeId, { sel: string; unsel: string }> = {
    A: {
      sel: "bg-green-100 border-green-500 text-green-900",
      unsel: "bg-white border-gray-300 text-gray-700",
    },
    B: {
      sel: "bg-amber-100 border-amber-500 text-amber-900",
      unsel: "bg-white border-gray-300 text-gray-700",
    },
    C: {
      sel: "bg-red-100 border-red-500 text-red-900",
      unsel: "bg-white border-gray-300 text-gray-700",
    },
  };

  const style = selected ? styles[grade].sel : styles[grade].unsel;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${style}`}
    >
      {label}
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
