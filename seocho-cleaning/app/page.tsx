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
  const progress = (completedCount / totalCount) * 100;

  const cWithoutNote = useMemo(
    () =>
      Object.values(results).filter(
        (r) => r.grade === "C" && (!r.note || r.note.trim() === "")
      ),
    [results]
  );

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
      if (!res.ok || !data.success) throw new Error(data.error || "제출 실패");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  };

  // ====== 성공 화면 ======
  if (status === "success") {
    return <SuccessScreen timeSlot={timeSlot} cCount={cCount} />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-40 shadow-soft">
        {/* ===== 헤더 ===== */}
        <header className="relative bg-mesh text-white px-6 pt-8 pb-7 overflow-hidden">
          <div className="absolute inset-0 bg-dots opacity-10" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium tracking-widest text-brand-100 uppercase">
                  Cleaning Check
                </p>
                <h1 className="text-[26px] font-extrabold mt-1 tracking-tight leading-tight">
                  오늘의 청소 점검
                </h1>
                <p className="text-sm text-brand-100/90 mt-1">
                  {ORG_INFO.name}
                </p>
              </div>
              {now && (
                <div className="text-right">
                  <p className="text-[11px] text-brand-100/80">
                    {getKoreanDay(now)}요일
                  </p>
                  <p className="text-2xl font-bold leading-none mt-1">
                    {String(now.getMonth() + 1).padStart(2, "0")}.
                    {String(now.getDate()).padStart(2, "0")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ===== 본문 ===== */}
        <div className="px-5 -mt-5 relative space-y-4">
          {/* 시간대 카드 */}
          {timeSlot && (
            <div className="bg-white rounded-3xl shadow-card p-5 border border-ink-100 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
                    Time Slot
                  </p>
                  <p className="text-[22px] font-bold text-ink-900 tracking-tight mt-1">
                    {timeSlot.label}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    자동 감지된 시간대입니다
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-brand-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <details className="mt-4">
                <summary className="text-xs text-brand-700 cursor-pointer select-none font-medium hover:text-brand-900 inline-flex items-center gap-1">
                  시간대 직접 선택
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      className={`h-11 rounded-xl text-xs font-semibold transition-all ${
                        slot.id === timeSlot.id
                          ? "bg-brand-600 text-white shadow-glow"
                          : "bg-ink-50 text-ink-700 hover:bg-ink-100"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* 점검자 선택 (칩 스타일) */}
          <div className="bg-white rounded-3xl shadow-card border border-ink-100 p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink-900">
                점검자 <span className="text-rose-500">*</span>
              </h2>
              {workerId && (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  선택됨
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {WORKERS.map((w) => {
                const selected = workerId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWorkerId(w.id)}
                    className={`grade-btn px-4 h-11 rounded-full text-sm font-semibold border-2 transition-all ${
                      selected
                        ? "bg-brand-600 border-brand-600 text-white shadow-glow"
                        : "bg-white border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    {w.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 진행률 + 항목 도트 */}
          <div className="bg-white rounded-3xl shadow-card border border-ink-100 p-5 animate-slide-up">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-bold text-ink-900">점검 항목</h2>
              <p className="text-xs text-ink-500">
                <span
                  className={`text-base font-bold ${
                    allComplete ? "text-emerald-600" : "text-brand-600"
                  }`}
                >
                  {completedCount}
                </span>
                <span className="mx-0.5 text-ink-300">/</span>
                <span>{totalCount}</span>
              </p>
            </div>

            {/* 도트 진행 바 */}
            <div className="flex gap-1 mb-2">
              {CHECKLIST_ITEMS.map((it) => {
                const r = results[it.id];
                const cls = r
                  ? r.grade === "A"
                    ? "bg-emerald-500"
                    : r.grade === "B"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                  : "bg-ink-200";
                return (
                  <div
                    key={it.id}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${cls}`}
                  />
                );
              })}
            </div>

            {/* 가는 진행률 텍스트 */}
            <p className="text-[11px] text-ink-400 text-right">
              {Math.round(progress)}% 완료
            </p>
          </div>

          {/* 점검 항목 카드들 */}
          <div className="space-y-3 pt-1">
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

          {/* 안내 메시지 */}
          {cWithoutNote.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 animate-slide-up">
              <span className="shrink-0 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold">
                !
              </span>
              <div className="text-sm">
                <p className="font-bold text-rose-900">
                  특이사항이 비어 있습니다
                </p>
                <p className="text-rose-700 mt-0.5">
                  C 등급 항목은 어떤 문제인지 짧게라도 입력해주세요.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <p className="font-bold text-rose-900 text-sm">
                제출에 실패했어요
              </p>
              <p className="text-rose-700 text-sm mt-1 break-words">
                {errorMsg}
              </p>
              <p className="text-rose-600 text-xs mt-2">
                인터넷 연결을 확인하고 다시 제출해주세요.
              </p>
            </div>
          )}
        </div>

        {/* ===== 하단 고정 제출 영역 ===== */}
        <div className="fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-md border-t border-ink-200 safe-pb">
          <div className="max-w-md mx-auto p-4">
            {/* 요약 줄 */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-3 text-[11px] text-ink-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <b className="text-ink-800">
                    {Object.values(results).filter((r) => r.grade === "A").length}
                  </b>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <b className="text-ink-800">
                    {Object.values(results).filter((r) => r.grade === "B").length}
                  </b>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <b className="text-ink-800">{cCount}</b>
                </span>
              </div>
              {cCount > 0 && (
                <p className="text-[11px] font-semibold text-rose-600">
                  ⚠ C 등급 {cCount}건은 즉시 알림 발송
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || status === "submitting"}
              className={`w-full h-16 rounded-2xl text-lg font-bold transition-all ${
                canSubmit && status !== "submitting"
                  ? "bg-ink-900 hover:bg-ink-800 text-white shadow-card"
                  : "bg-ink-100 text-ink-400"
              }`}
            >
              {status === "submitting" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> 제출 중...
                </span>
              ) : !workerId ? (
                "점검자를 먼저 선택해주세요"
              ) : !allComplete ? (
                <span className="inline-flex items-center gap-2">
                  <span>{totalCount - completedCount}개 항목 남음</span>
                  <span className="text-xs font-medium opacity-70">
                    · {Math.round(progress)}%
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  제출하기
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Success Screen
// ============================================
function SuccessScreen({
  timeSlot,
  cCount,
}: {
  timeSlot: TimeSlot | null;
  cCount: number;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-brand-50 via-white to-emerald-50">
      <div className="w-full max-w-md bg-white rounded-4xl shadow-card p-8 text-center animate-pop-in">
        {/* 체크 아이콘 */}
        <div className="relative mx-auto mb-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/60">
            <svg
              className="w-14 h-14 text-white"
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
          <div className="absolute inset-0 -z-10 mx-auto w-32 h-32 rounded-full bg-emerald-200/40 blur-2xl" />
        </div>

        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
          제출이 완료되었습니다
        </h1>
        <p className="text-base text-ink-600 mt-3 leading-relaxed">
          오늘 <b className="text-ink-900">{timeSlot?.label}</b> 점검 기록이
          저장되었습니다.
          <br />
          수고하셨습니다 🙇‍♀️
        </p>

        {cCount > 0 && (
          <div className="mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 text-left">
            <p className="font-bold mb-0.5">조치 필요 {cCount}건</p>
            <p className="text-rose-700">
              사무실에 자동으로 알림이 전송되었습니다.
            </p>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="mt-7 w-full h-14 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white font-bold text-base transition-colors shadow-card"
        >
          새 점검 시작하기
        </button>
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
