"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type Submission = {
  date: string;
  timeSlotLabel: string;
  workerName: string;
  submittedAt: string;
  results: {
    itemId: string;
    itemName: string;
    grade: "A" | "B" | "C";
    note?: string;
    photoUrl?: string;
  }[];
  hasC: boolean;
};

type StatsData = {
  totalSubmissions: number;
  completionRate: number;
  cCount: number;
  submissions: Submission[];
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

const SLOTS = [
  { label: "09:00 ~ 12:00", short: "9-12시", worker: "김성만" },
  { label: "12:00 ~ 15:00", short: "12-15시", worker: "배정열" },
  { label: "15:00 ~ 18:00", short: "15-18시", worker: "조숙임" },
];

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WeeklyPrintPage() {
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("adminPreview") === "1") {
      setPreviewMode(true);
      // 미리보기 모드에서는 가짜 데이터 (간소)
      setData(buildPreviewData());
      setLoading(false);
      return;
    }
    const key = localStorage.getItem("adminKey");
    if (!key) {
      router.replace("/admin");
      return;
    }
    fetch(`/api/stats?days=14`, {
      headers: { "x-admin-key": key },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || "조회 실패");
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [router]);

  // 이번 주 (월~일)
  const week = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일, 1=월
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const findSubmission = (
    date: string,
    slotLabel: string
  ): Submission | undefined => {
    return data?.submissions.find(
      (s) => s.date === date && s.timeSlotLabel === slotLabel
    );
  };

  const cIssues = useMemo(() => {
    if (!data) return [];
    const weekDates = week.map(fmt);
    const issues: {
      date: string;
      dayShort: string;
      slot: string;
      worker: string;
      item: string;
      note: string;
    }[] = [];
    data.submissions
      .filter((s) => weekDates.includes(s.date))
      .forEach((s) => {
        s.results.forEach((r) => {
          if (r.grade === "C") {
            const d = new Date(s.date);
            issues.push({
              date: s.date,
              dayShort: WEEKDAY[d.getDay()],
              slot: s.timeSlotLabel,
              worker: s.workerName,
              item: r.itemName,
              note: r.note || "",
            });
          }
        });
      });
    return issues.sort((a, b) =>
      `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`)
    );
  }, [data, week]);

  const totalDone = useMemo(() => {
    if (!data) return 0;
    const weekDates = week.map(fmt);
    return data.submissions.filter((s) => weekDates.includes(s.date)).length;
  }, [data, week]);

  if (loading) {
    return <div className="p-12 text-center text-ink-500">불러오는 중...</div>;
  }
  if (error) {
    return (
      <div className="p-12 text-center text-rose-700">
        {error}
        <button
          onClick={() => router.push("/admin")}
          className="ml-3 underline"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const weekStart = week[0];
  const weekEnd = week[6];

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="max-w-3xl mx-auto p-6 md:p-10 print-root">
        {/* 화면 전용 액션 바 */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-ink-600 hover:text-ink-900 inline-flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            대시보드로
          </button>
          {previewMode && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold">
              미리보기 모드
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="h-10 px-4 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 inline-flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            인쇄
          </button>
        </div>

        {/* 제목 */}
        <header className="border-b-2 border-black pb-3 mb-5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            청소점검 주간 보고서
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            서초여성가족플라자 서초센터
          </p>
          <p className="text-sm font-semibold mt-2">
            {fmt(weekStart)} ({WEEKDAY[weekStart.getDay()]}) ~ {fmt(weekEnd)} (
            {WEEKDAY[weekEnd.getDay()]}) ·{" "}
            <span className="text-ink-700 font-normal">총 {totalDone}건 제출</span>
          </p>
        </header>

        {/* 요약 그리드 */}
        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr>
              <th className="border-2 border-black p-2 bg-ink-100 text-left w-28">
                날짜
              </th>
              {SLOTS.map((s) => (
                <th
                  key={s.label}
                  className="border-2 border-black p-2 bg-ink-100"
                >
                  <div className="font-bold">{s.worker}</div>
                  <div className="text-[11px] font-normal text-ink-700">
                    {s.short}
                  </div>
                </th>
              ))}
              <th className="border-2 border-black p-2 bg-ink-100 w-16">
                합계
              </th>
            </tr>
          </thead>
          <tbody>
            {week.map((d) => {
              const dStr = fmt(d);
              const cells = SLOTS.map((s) => findSubmission(dStr, s.label));
              const doneCount = cells.filter((s) => s).length;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <tr key={dStr} className={isWeekend ? "bg-ink-50/50" : ""}>
                  <td className="border-2 border-black p-2 font-semibold">
                    <span
                      className={
                        d.getDay() === 0
                          ? "text-rose-600"
                          : d.getDay() === 6
                          ? "text-blue-700"
                          : ""
                      }
                    >
                      {WEEKDAY[d.getDay()]}
                    </span>{" "}
                    {d.getMonth() + 1}/{d.getDate()}
                  </td>
                  {cells.map((sub, i) => (
                    <td
                      key={i}
                      className="border-2 border-black p-2 text-center text-lg"
                    >
                      {!sub ? (
                        <span className="text-ink-400">—</span>
                      ) : sub.hasC ? (
                        <span className="text-rose-600">⚠</span>
                      ) : (
                        <span className="text-emerald-700">✓</span>
                      )}
                    </td>
                  ))}
                  <td className="border-2 border-black p-2 text-center text-xs font-bold tabular-nums">
                    {doneCount}/3
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="text-[11px] text-ink-700 mb-6">
          ✓ 완료 (이상 없음) &nbsp;·&nbsp; ⚠ 완료 (조치필요 있음) &nbsp;·&nbsp;
          — 미제출
        </p>

        {/* 조치필요 사항 */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3 border-b border-ink-300 pb-1">
            조치필요 사항{" "}
            <span className="text-ink-600 font-normal">({cIssues.length}건)</span>
          </h2>
          {cIssues.length === 0 ? (
            <p className="text-sm text-ink-600 italic py-2">
              이번 주 조치필요 사항 없음
            </p>
          ) : (
            <ol className="space-y-2 text-sm">
              {cIssues.map((c, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="font-bold tabular-nums">{i + 1}.</span>{" "}
                  <span className="font-semibold">
                    {c.date.slice(5)} ({c.dayShort})
                  </span>
                  <span className="text-ink-600"> · {c.slot} · {c.worker}</span>
                  <div className="ml-6 mt-0.5">
                    <b>{c.item}</b> —{" "}
                    {c.note || (
                      <span className="text-ink-500">(비고 없음)</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 서명 */}
        <div className="print-signature border-t border-ink-300 pt-6 mt-12 grid grid-cols-2 gap-12">
          <div>
            <p className="text-xs text-ink-700 mb-10">작성</p>
            <div className="border-b border-black h-1"></div>
            <p className="text-[11px] text-ink-600 mt-1.5 text-center">
              담당자 서명
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-700 mb-10">확인</p>
            <div className="border-b border-black h-1"></div>
            <p className="text-[11px] text-ink-600 mt-1.5 text-center">
              관리자 서명
            </p>
          </div>
        </div>

        <p className="text-[10px] text-ink-500 text-center mt-10 print:mt-6">
          자동 생성: {new Date().toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}

// ============================================
// 미리보기용 간단 mock (실제 mock과 별개, 인쇄 페이지 데모용)
// ============================================
function buildPreviewData(): StatsData {
  const today = new Date();
  const submissions: Submission[] = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOffset);
    const dateStr = fmt(d);
    SLOTS.forEach((slot, i) => {
      // 토요일은 빠짐, 일부 슬롯은 미제출 시뮬레이션
      if (d.getDay() === 6) return;
      if (dayOffset === 1 && i === 1) return; // 어제 점심 미제출
      const hasC = (dayOffset + i) % 5 === 2;
      submissions.push({
        date: dateStr,
        timeSlotLabel: slot.label,
        workerName: slot.worker,
        submittedAt: d.toISOString(),
        results: hasC
          ? [
              {
                itemId: "floor",
                itemName: "바닥 상태",
                grade: "C",
                note: "바닥에 이물질이 지워지지 않음",
              },
            ]
          : [],
        hasC,
      });
    });
  }
  return {
    totalSubmissions: submissions.length,
    completionRate: 95,
    cCount: submissions.filter((s) => s.hasC).length,
    submissions,
  };
}
