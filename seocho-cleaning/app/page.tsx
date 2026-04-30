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
  const [submissionId, setSubmissionId] = useState<string>("");

  // 클라이언트에서만 시간 감지 + 제출 ID 발급 (SSR hydration 이슈 방지)
  useEffect(() => {
    const n = new Date();
    setNow(n);
    setTimeSlot(detectTimeSlot(n));
    setSubmissionId(generateSubmissionId());
  }, []);

  const updateResult = (r: CheckResult) => {
    setResults((prev) => ({ ...prev, [r.itemId]: r }));
  };

  const completedCount = Object.keys(results).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allComplete = completedCount === totalCount;
  const progress = Math.round((completedCount / totalCount) * 100);

  const cWithoutNote = useMemo(() => {
    return Object.values(results).filter(
      (r) => r.grade === "C" && (!r.note || r.note.trim() === "")
    );
  }, [results]);

  const cCount = useMemo(
    () => Object.values(results).filter((r) => r.grade === "C").length,
    [results]
  );

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
      submissionId,
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center animate-pop-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <svg
              className="w-12 h-12 text-white"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            제출 완료되었습니다
          </h1>
          <p className="text-base text-gray-600 leading-relaxed mb-6">
            오늘 <b className="text-gray-900">{timeSlot?.label}</b> 점검이
            저장되었습니다.
            <br />
            수고하셨습니다 🙇‍♀️
          </p>
          {cCount > 0 && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              C 등급 {cCount}건은 사무실에 자동으로 알림이 전송되었습니다.
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-lg transition-colors shadow-md shadow-blue-200"
          >
            새 점검 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-gray-100">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm">
        {/* 헤더 */}
        <header className="px-5 pt-7 pb-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-bold tracking-tight">청소 점검</h1>
            {now && (
              <span className="text-xs font-medium text-blue-100">
                {String(now.getMonth() + 1).padStart(2, "0")}/
                {String(now.getDate()).padStart(2, "0")} ({getKoreanDay(now)})
              </span>
            )}
          </div>
          <p className="text-sm text-blue-100 mt-1">{ORG_INFO.name}</p>
        </header>

        {/* 진행률 바 */}
        <div className="h-1.5 bg-gray-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5 space-y-5">
          {/* 시간대 카드 */}
          {timeSlot && now && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700">
                    자동 감지된 점검 시간대
                  </p>
                  <p className="text-xl font-bold text-emerald-900 mt-1 tracking-tight">
                    {timeSlot.label}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-emerald-700 hover:text-emerald-900 select-none">
                  시간대가 다른가요? 직접 선택
                </summary>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      className={`h-11 rounded-lg border text-xs font-semibold transition-colors ${
                        slot.id === timeSlot.id
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* 점검자 선택 */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-semibold">
              점검자 <span className="text-red-500">*</span>
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className={`w-full h-14 px-4 rounded-2xl border-2 text-base font-medium focus:outline-none focus:ring-4 transition-colors ${
                workerId
                  ? "bg-blue-50 border-blue-300 text-blue-900 focus:ring-blue-100"
                  : "bg-white border-gray-300 text-gray-700 focus:ring-blue-100 focus:border-blue-400"
              }`}
            >
              <option value="">— 본인 이름을 선택해주세요 —</option>
              {WORKERS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* 점검 항목 헤더 */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-base font-bold text-gray-900">점검 항목</h2>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`font-bold ${
                  allComplete ? "text-emerald-600" : "text-blue-600"
                }`}
              >
                {completedCount}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-500">{totalCount}</span>
              <span className="text-gray-500 ml-1">완료</span>
            </div>
          </div>

          {/* 점검 항목들 */}
          <div className="space-y-3">
            {CHECKLIST_ITEMS.map((item, idx) => (
              <CheckItem
                key={item.id}
                item={item}
                index={idx + 1}
                value={results[item.id]}
                onChange={updateResult}
              />
            ))}
          </div>

          {/* 검증 메시지 */}
          {cWithoutNote.length > 0 && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex gap-3">
              <span className="text-xl leading-none">⚠️</span>
              <div>
                <p className="font-semibold mb-0.5">특이사항이 비어 있습니다</p>
                <p className="text-red-700">
                  C 등급 항목은 어떤 문제인지 짧게라도 입력해주세요.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">제출에 실패했어요</p>
              <p className="text-red-700 break-words">{errorMsg}</p>
              <p className="text-red-600 mt-2 text-xs">
                인터넷 연결을 확인하고 다시 제출해주세요.
              </p>
            </div>
          )}
        </div>

        {/* 하단 고정 제출 버튼 */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            {cCount > 0 && (
              <p className="text-xs text-center text-red-600 mb-2 font-medium">
                ⚠ C 등급 {cCount}건 — 사무실에 즉시 알림이 전송됩니다
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || status === "submitting"}
              className={`w-full h-16 rounded-2xl text-lg font-bold transition-all ${
                canSubmit && status !== "submitting"
                  ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-200"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {status === "submitting" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> 제출 중...
                </span>
              ) : !workerId ? (
                "점검자를 먼저 선택해주세요"
              ) : !allComplete ? (
                `${totalCount - completedCount}개 항목 남음`
              ) : (
                "제출하기"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function generateSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
