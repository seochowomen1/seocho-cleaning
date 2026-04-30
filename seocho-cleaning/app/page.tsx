"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ORG_INFO,
  WORKERS,
  TIME_SLOTS,
  CHECKLIST_ITEMS,
  detectTimeSlot,
  formatDate,
  getKoreanDay,
  type CheckResult,
  type Submission,
  type TimeSlot,
} from "@/lib/config";
import CheckItem from "@/components/CheckItem";

type Status = "idle" | "submitting" | "success" | "error";

export default function HomePage() {
  const [workerId, setWorkerId] = useState<string>("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [now, setNow] = useState<Date | null>(null);

  // 클라이언트에서만 시간 감지 (SSR hydration 이슈 방지)
  useEffect(() => {
    const n = new Date();
    setNow(n);
    setTimeSlot(detectTimeSlot(n));
  }, []);

  const updateResult = (r: CheckResult) => {
    setResults((prev) => ({ ...prev, [r.itemId]: r }));
  };

  const completedCount = Object.keys(results).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allComplete = completedCount === totalCount;

  const cWithoutNote = useMemo(() => {
    return Object.values(results).filter(
      (r) => r.grade === "C" && (!r.note || r.note.trim() === "")
    );
  }, [results]);

  const canSubmit =
    workerId !== "" &&
    timeSlot !== null &&
    allComplete &&
    cWithoutNote.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit || !timeSlot || !now) return;

    const worker = WORKERS.find((w) => w.id === workerId);
    if (!worker) return;

    const submission: Submission = {
      workerId: worker.id,
      workerName: worker.name,
      timeSlotId: timeSlot.id,
      timeSlotLabel: timeSlot.label,
      date: formatDate(now),
      submittedAt: new Date().toISOString(),
      results: CHECKLIST_ITEMS.map((item) => results[item.id]),
    };

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "제출 실패");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  };

  // 제출 완료 화면
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            제출 완료되었습니다
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            오늘 {timeSlot?.label} 점검 기록이 저장되었습니다.
            <br />
            수고하셨습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-lg bg-blue-600 text-white font-semibold"
          >
            새 점검 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-32">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-200 text-center">
          <h1 className="text-lg font-bold text-gray-900">청소 점검</h1>
          <p className="text-xs text-gray-500 mt-1">{ORG_INFO.name}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* 시간대 자동 감지 */}
          {timeSlot && now && (
            <div className="rounded-xl bg-green-50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700">자동 감지된 시간대</p>
                <p className="text-base font-bold text-green-900 mt-0.5">
                  {timeSlot.label}
                </p>
              </div>
              <p className="text-sm text-green-600">
                {String(now.getMonth() + 1).padStart(2, "0")}/
                {String(now.getDate()).padStart(2, "0")} ({getKoreanDay(now)})
              </p>
            </div>
          )}

          {/* 시간대 수동 변경 (혹시 다를 경우) */}
          {timeSlot && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                시간대가 다른가요?
              </summary>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`h-10 rounded-lg border text-xs font-medium ${
                      slot.id === timeSlot.id
                        ? "bg-blue-50 border-blue-500 text-blue-900"
                        : "bg-white border-gray-300 text-gray-700"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </details>
          )}

          {/* 점검자 선택 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1.5 font-medium">
              점검자 *
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full h-12 px-3 rounded-lg border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">선택해주세요</option>
              {WORKERS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* 점검 항목들 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>점검 항목 ({completedCount}/{totalCount})</span>
              <span>각 항목에 A·B·C 선택</span>
            </div>
            {CHECKLIST_ITEMS.map((item) => (
              <CheckItem
                key={item.id}
                item={item}
                value={results[item.id]}
                onChange={updateResult}
              />
            ))}
          </div>

          {/* 검증 메시지 */}
          {cWithoutNote.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              C 등급 항목은 특이사항을 반드시 입력해주세요.
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              제출 실패: {errorMsg}
              <br />
              잠시 후 다시 시도해주세요.
            </div>
          )}
        </div>

        {/* 하단 고정 제출 버튼 */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || status === "submitting"}
              className={`w-full h-14 rounded-xl text-base font-bold transition-colors ${
                canSubmit && status !== "submitting"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {status === "submitting"
                ? "제출 중..."
                : !workerId
                ? "점검자를 선택해주세요"
                : !allComplete
                ? `${totalCount - completedCount}개 항목 남음`
                : "제출하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
