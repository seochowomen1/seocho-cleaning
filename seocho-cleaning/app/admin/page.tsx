"use client";

import { useState, useEffect, useMemo } from "react";

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

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [filterC, setFilterC] = useState(false);
  const [filterWorker, setFilterWorker] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("adminKey");
    if (saved) {
      setAdminKey(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, days]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats?days=${days}`, {
        headers: { "x-admin-key": adminKey },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "조회 실패");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
      if (err instanceof Error && err.message.includes("권한")) {
        setAuthed(false);
        localStorage.removeItem("adminKey");
      }
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    if (!adminKey.trim()) return;
    localStorage.setItem("adminKey", adminKey);
    setAuthed(true);
  };

  const logout = () => {
    localStorage.removeItem("adminKey");
    setAdminKey("");
    setAuthed(false);
    setData(null);
  };

  // 등급 분포 계산
  const gradeDist = useMemo(() => {
    if (!data) return { A: 0, B: 0, C: 0, total: 0 };
    let A = 0,
      B = 0,
      C = 0;
    data.submissions.forEach((s) =>
      s.results.forEach((r) => {
        if (r.grade === "A") A++;
        else if (r.grade === "B") B++;
        else if (r.grade === "C") C++;
      })
    );
    return { A, B, C, total: A + B + C };
  }, [data]);

  // 점검자 목록
  const workerList = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.submissions.map((s) => s.workerName));
    return Array.from(set).sort();
  }, [data]);

  const filteredSubmissions = useMemo(() => {
    if (!data) return [];
    return data.submissions.filter(
      (s) =>
        (!filterC || s.hasC) &&
        (!filterWorker || s.workerName === filterWorker)
    );
  }, [data, filterC, filterWorker]);

  const exportCSV = () => {
    if (!filteredSubmissions.length) return;
    const headers = [
      "점검일자",
      "시간대",
      "점검자",
      "항목",
      "등급",
      "특이사항",
      "사진URL",
    ];
    const rows = filteredSubmissions.flatMap((s) =>
      s.results.map((r) => [
        s.date,
        s.timeSlotLabel,
        s.workerName,
        r.itemName,
        r.grade,
        (r.note || "").replace(/\n/g, " "),
        r.photoUrl || "",
      ])
    );
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const bom = "﻿"; // Excel 한글 깨짐 방지
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `청소점검_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ----- 로그인 화면 -----
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4m-6-4a6 6 0 1112 0c0 4-6 9-6 9s-6-5-6-9z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center mb-1">관리자 로그인</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            청소 점검 대시보드
          </p>
          <input
            type="password"
            placeholder="관리자 키"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 mb-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
            autoFocus
          />
          <button
            onClick={login}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            로그인
          </button>
          {error && (
            <p className="mt-3 text-xs text-red-600 text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ----- 대시보드 -----
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* 헤더 */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              청소 점검 대시보드
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              서초여성가족플라자 서초센터 · 관리자
            </p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-white"
          >
            로그아웃
          </button>
        </header>

        {/* 필터 바 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">기간</span>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {[
                { v: 1, label: "오늘" },
                { v: 7, label: "7일" },
                { v: 30, label: "30일" },
                { v: 90, label: "90일" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setDays(opt.v)}
                  className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${
                    days === opt.v
                      ? "bg-white shadow text-blue-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white"
          >
            <option value="">전체 점검자</option>
            {workerList.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterC}
              onChange={(e) => setFilterC(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="font-medium">C 등급만</span>
          </label>

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportCSV}
              disabled={!filteredSubmissions.length}
              className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              ⬇ CSV
            </button>
            <button
              onClick={loadData}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-gray-500">불러오는 중...</div>
        )}

        {data && !loading && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
              <StatCard
                label="총 제출"
                value={data.totalSubmissions}
                hint="건"
                color="blue"
                icon={
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                }
              />
              <StatCard
                label="완료율"
                value={`${data.completionRate}%`}
                hint="기간 내 예상 대비"
                color="emerald"
                icon={
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                }
              />
              <StatCard
                label="C 등급"
                value={data.cCount}
                hint="조치 필요"
                color={data.cCount > 0 ? "red" : "gray"}
                icon={
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"
                  />
                }
              />
              <StatCard
                label="활동 점검자"
                value={workerList.length}
                hint="명"
                color="purple"
                icon={
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z"
                  />
                }
              />
            </div>

            {/* 등급 분포 바 */}
            {gradeDist.total > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  등급 분포{" "}
                  <span className="font-normal text-gray-500">
                    (총 {gradeDist.total}건의 항목)
                  </span>
                </h3>
                <div className="flex h-10 rounded-lg overflow-hidden">
                  {gradeDist.A > 0 && (
                    <div
                      className="bg-emerald-500 text-white text-xs font-bold flex items-center justify-center"
                      style={{
                        width: `${(gradeDist.A / gradeDist.total) * 100}%`,
                      }}
                    >
                      A {gradeDist.A}
                    </div>
                  )}
                  {gradeDist.B > 0 && (
                    <div
                      className="bg-amber-500 text-white text-xs font-bold flex items-center justify-center"
                      style={{
                        width: `${(gradeDist.B / gradeDist.total) * 100}%`,
                      }}
                    >
                      B {gradeDist.B}
                    </div>
                  )}
                  {gradeDist.C > 0 && (
                    <div
                      className="bg-red-500 text-white text-xs font-bold flex items-center justify-center"
                      style={{
                        width: `${(gradeDist.C / gradeDist.total) * 100}%`,
                      }}
                    >
                      C {gradeDist.C}
                    </div>
                  )}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    양호 {Math.round((gradeDist.A / gradeDist.total) * 100)}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    보통 {Math.round((gradeDist.B / gradeDist.total) * 100)}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    조치 필요 {Math.round((gradeDist.C / gradeDist.total) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* 제출 목록 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">
                  제출 내역{" "}
                  <span className="text-gray-400 font-normal">
                    ({filteredSubmissions.length}건)
                  </span>
                </h3>
              </div>
              {filteredSubmissions.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <p className="text-gray-400 text-sm">
                    조회된 데이터가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredSubmissions.map((s, idx) => (
                    <SubmissionRow key={idx} submission={s} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// Components
// ============================================

function StatCard({
  label,
  value,
  hint,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  color: "blue" | "emerald" | "red" | "gray" | "purple";
  icon: React.ReactNode;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", fg: "text-blue-600", value: "text-gray-900" },
    emerald: {
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
      value: "text-gray-900",
    },
    red: { bg: "bg-red-50", fg: "text-red-600", value: "text-red-600" },
    gray: { bg: "bg-gray-50", fg: "text-gray-500", value: "text-gray-900" },
    purple: {
      bg: "bg-purple-50",
      fg: "text-purple-600",
      value: "text-gray-900",
    },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <div
        className={`w-12 h-12 shrink-0 rounded-xl ${c.bg} ${c.fg} flex items-center justify-center`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 leading-tight ${c.value}`}>
          {value}
        </p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(submission.hasC);

  const aCount = submission.results.filter((r) => r.grade === "A").length;
  const bCount = submission.results.filter((r) => r.grade === "B").length;
  const cCount = submission.results.filter((r) => r.grade === "C").length;

  return (
    <div className="px-5 py-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900">
              {submission.date} · {submission.timeSlotLabel}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {submission.workerName}
            </p>
          </div>
          {submission.hasC && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-red-100 text-red-700 font-bold">
              ⚠ C 발생
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-xs">
            {aCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                A {aCount}
              </span>
            )}
            {bCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                B {bCount}
              </span>
            )}
            {cCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
                C {cCount}
              </span>
            )}
          </div>
          <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-2">
          {submission.results.map((r, i) => (
            <div key={i} className="text-sm">
              <span
                className={`inline-block w-6 h-6 leading-6 text-center rounded font-bold mr-2 text-xs ${
                  r.grade === "A"
                    ? "bg-emerald-100 text-emerald-800"
                    : r.grade === "B"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {r.grade}
              </span>
              <span className="font-medium text-gray-800">{r.itemName}</span>
              {r.note && (
                <p className="ml-8 mt-1 text-xs text-gray-600 leading-relaxed">
                  📝 {r.note}
                </p>
              )}
              {r.photoUrl && (
                <a
                  href={r.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-8 mt-1 inline-block text-xs text-blue-600 hover:underline"
                >
                  📷 사진 보기
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
