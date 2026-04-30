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
      if (!res.ok || !json.success) throw new Error(json.error || "조회 실패");
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

  const gradeDist = useMemo(() => {
    if (!data) return { A: 0, B: 0, C: 0, total: 0 };
    let A = 0, B = 0, C = 0;
    data.submissions.forEach((s) =>
      s.results.forEach((r) => {
        if (r.grade === "A") A++;
        else if (r.grade === "B") B++;
        else if (r.grade === "C") C++;
      })
    );
    return { A, B, C, total: A + B + C };
  }, [data]);

  const workerList = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.submissions.map((s) => s.workerName))).sort();
  }, [data]);

  // 점검자별 제출 건수
  const workerStats = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { total: number; c: number }>();
    data.submissions.forEach((s) => {
      const cur = map.get(s.workerName) || { total: 0, c: 0 };
      cur.total++;
      if (s.hasC) cur.c++;
      map.set(s.workerName, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
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
    const headers = ["점검일자", "시간대", "점검자", "항목", "등급", "특이사항", "사진URL"];
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
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `청소점검_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ----- 로그인 -----
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-ink-50 via-white to-brand-50">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-card p-8 border border-ink-100">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4m-6-4a6 6 0 1112 0c0 4-6 9-6 9s-6-5-6-9z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center text-ink-900 tracking-tight">
            관리자 로그인
          </h1>
          <p className="text-sm text-ink-500 text-center mb-6 mt-1">
            청소 점검 대시보드
          </p>
          <input
            type="password"
            placeholder="관리자 키"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="w-full h-12 px-4 rounded-xl border-2 border-ink-200 mb-3 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-400 transition-colors"
            autoFocus
          />
          <button
            onClick={login}
            className="w-full h-12 rounded-xl bg-ink-900 hover:bg-ink-800 text-white font-semibold transition-colors"
          >
            로그인
          </button>
          {error && (
            <p className="mt-3 text-xs text-rose-600 text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ===== 상단 바 ===== */}
      <header className="bg-white border-b border-ink-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
              SC
            </div>
            <div>
              <h1 className="text-base font-bold text-ink-900 tracking-tight leading-none">
                청소 점검 대시보드
              </h1>
              <p className="text-[11px] text-ink-500 mt-0.5">
                서초여성가족플라자 서초센터
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-ink-500 hover:text-ink-900 px-3 py-1.5 rounded-lg hover:bg-ink-50 font-medium"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-6">
        {/* ===== 필터 바 ===== */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="inline-flex items-center bg-white rounded-xl border border-ink-200 p-1 shadow-soft">
            {[
              { v: 1, label: "오늘" },
              { v: 7, label: "7일" },
              { v: 30, label: "30일" },
              { v: 90, label: "90일" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setDays(opt.v)}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  days === opt.v
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="h-10 px-3 rounded-xl border border-ink-200 text-sm bg-white shadow-soft hover:border-ink-300 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-400"
          >
            <option value="">전체 점검자</option>
            {workerList.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-ink-200 bg-white shadow-soft cursor-pointer hover:border-ink-300">
            <input
              type="checkbox"
              checked={filterC}
              onChange={(e) => setFilterC(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-ink-700">C 등급만</span>
          </label>

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportCSV}
              disabled={!filteredSubmissions.length}
              className="h-10 px-4 rounded-xl border border-ink-200 bg-white text-sm font-semibold hover:bg-ink-50 disabled:opacity-40 shadow-soft inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button
              onClick={loadData}
              className="h-10 px-4 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800 mb-4">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* ===== KPI 카드 ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <KpiCard
                label="총 제출"
                value={data.totalSubmissions}
                unit="건"
                hint={`최근 ${days}일`}
                tone="brand"
              />
              <KpiCard
                label="완료율"
                value={`${data.completionRate}`}
                unit="%"
                hint="기간 내 예상 대비"
                tone="emerald"
                progress={data.completionRate}
              />
              <KpiCard
                label="C 등급"
                value={data.cCount}
                unit="건"
                hint={data.cCount > 0 ? "조치 필요" : "이상 없음"}
                tone={data.cCount > 0 ? "rose" : "ink"}
              />
              <KpiCard
                label="활동 점검자"
                value={workerList.length}
                unit="명"
                hint="제출자 수"
                tone="violet"
              />
            </div>

            {/* ===== 등급 분포 + 점검자 활동 (2열) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
              {/* 등급 분포 */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-ink-100 p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="text-sm font-bold text-ink-900">등급 분포</h3>
                  <p className="text-xs text-ink-500">
                    총 <b className="text-ink-800">{gradeDist.total}</b>개 항목
                  </p>
                </div>
                {gradeDist.total === 0 ? (
                  <EmptyMini text="데이터 없음" />
                ) : (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden bg-ink-100">
                      {gradeDist.A > 0 && (
                        <div className="bg-emerald-500" style={{ width: `${(gradeDist.A / gradeDist.total) * 100}%` }} />
                      )}
                      {gradeDist.B > 0 && (
                        <div className="bg-amber-500" style={{ width: `${(gradeDist.B / gradeDist.total) * 100}%` }} />
                      )}
                      {gradeDist.C > 0 && (
                        <div className="bg-rose-500" style={{ width: `${(gradeDist.C / gradeDist.total) * 100}%` }} />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <DistLegend color="emerald" label="양호" grade="A" count={gradeDist.A} total={gradeDist.total} />
                      <DistLegend color="amber" label="보통" grade="B" count={gradeDist.B} total={gradeDist.total} />
                      <DistLegend color="rose" label="조치" grade="C" count={gradeDist.C} total={gradeDist.total} />
                    </div>
                  </>
                )}
              </div>

              {/* 점검자 활동 Top */}
              <div className="bg-white rounded-2xl shadow-soft border border-ink-100 p-5">
                <h3 className="text-sm font-bold text-ink-900 mb-4">
                  점검자 활동
                </h3>
                {workerStats.length === 0 ? (
                  <EmptyMini text="데이터 없음" />
                ) : (
                  <ul className="space-y-3">
                    {workerStats.slice(0, 5).map((w) => (
                      <li key={w.name} className="flex items-center gap-3">
                        <Avatar name={w.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">
                            {w.name}
                          </p>
                          <p className="text-[11px] text-ink-500">
                            {w.total}건 제출
                            {w.c > 0 && (
                              <span className="ml-1.5 text-rose-600 font-semibold">
                                · C {w.c}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-xs font-bold text-ink-700">
                          {w.total}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* ===== 제출 내역 ===== */}
            <div className="bg-white rounded-2xl shadow-soft border border-ink-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink-900">
                  제출 내역
                  <span className="text-ink-400 font-normal ml-1.5">
                    {filteredSubmissions.length}건
                  </span>
                </h3>
                {(filterC || filterWorker) && (
                  <button
                    onClick={() => {
                      setFilterC(false);
                      setFilterWorker("");
                    }}
                    className="text-[11px] text-ink-500 hover:text-ink-900 font-medium"
                  >
                    필터 해제
                  </button>
                )}
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="px-5 py-20 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-ink-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm text-ink-500">
                    조회된 데이터가 없습니다
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {filteredSubmissions.map((s, idx) => (
                    <SubmissionRow key={idx} submission={s} />
                  ))}
                </ul>
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

function KpiCard({
  label,
  value,
  unit,
  hint,
  tone,
  progress,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone: "brand" | "emerald" | "rose" | "ink" | "violet";
  progress?: number;
}) {
  const toneMap = {
    brand: { bar: "bg-brand-500", text: "text-brand-600" },
    emerald: { bar: "bg-emerald-500", text: "text-emerald-600" },
    rose: { bar: "bg-rose-500", text: "text-rose-600" },
    ink: { bar: "bg-ink-300", text: "text-ink-500" },
    violet: { bar: "bg-violet-500", text: "text-violet-600" },
  };
  const t = toneMap[tone];

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-ink-100 p-4 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.bar}`} />
      <p className="text-[11px] font-semibold tracking-wider text-ink-500 uppercase">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-2">
        <p className="text-3xl font-extrabold text-ink-900 leading-none tracking-tight">
          {value}
        </p>
        {unit && (
          <span className="text-sm font-semibold text-ink-400">{unit}</span>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-ink-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${t.bar} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {hint && (
        <p className={`text-[11px] mt-2 font-medium ${t.text}`}>{hint}</p>
      )}
    </div>
  );
}

function DistLegend({
  color,
  label,
  grade,
  count,
  total,
}: {
  color: "emerald" | "amber" | "rose";
  label: string;
  grade: string;
  count: number;
  total: number;
}) {
  const colorMap = {
    emerald: { dot: "bg-emerald-500", bg: "bg-emerald-50" },
    amber: { dot: "bg-amber-500", bg: "bg-amber-50" },
    rose: { dot: "bg-rose-500", bg: "bg-rose-50" },
  };
  const c = colorMap[color];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`rounded-xl ${c.bg} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <p className="text-[11px] font-bold text-ink-700">
          {grade} · {label}
        </p>
      </div>
      <p className="text-xl font-extrabold text-ink-900 tracking-tight leading-none mt-1">
        {count}
        <span className="text-xs text-ink-500 ml-1 font-medium">
          ({pct}%)
        </span>
      </p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.slice(0, 1);
  // 이름 해시로 컬러 정함
  const colors = [
    "from-brand-400 to-brand-600",
    "from-emerald-400 to-emerald-600",
    "from-amber-400 to-amber-600",
    "from-rose-400 to-rose-600",
    "from-violet-400 to-violet-600",
    "from-sky-400 to-sky-600",
  ];
  const hash = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  return (
    <div
      className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center text-sm font-bold shadow-soft`}
    >
      {initial}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="py-6 text-center text-xs text-ink-400">{text}</div>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(submission.hasC);
  const a = submission.results.filter((r) => r.grade === "A").length;
  const b = submission.results.filter((r) => r.grade === "B").length;
  const c = submission.results.filter((r) => r.grade === "C").length;

  return (
    <li className="px-5 py-4 hover:bg-ink-50/50 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={submission.workerName} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-ink-900 truncate">
              {submission.workerName}
              {submission.hasC && (
                <span className="ml-2 inline-flex items-center px-1.5 h-5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold align-middle">
                  C
                </span>
              )}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5">
              {submission.date} · {submission.timeSlotLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            {a > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                A {a}
              </span>
            )}
            {b > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">
                B {b}
              </span>
            )}
            {c > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">
                C {c}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-ink-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 ml-12 pl-3 border-l-2 border-ink-100 space-y-2 animate-fade-in">
          {submission.results.map((r, i) => (
            <div key={i} className="text-sm">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold mr-2 align-middle ${
                  r.grade === "A"
                    ? "bg-emerald-100 text-emerald-800"
                    : r.grade === "B"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {r.grade}
              </span>
              <span className="font-medium text-ink-800">{r.itemName}</span>
              {r.note && (
                <p className="ml-7 mt-1 text-xs text-ink-600 leading-relaxed">
                  📝 {r.note}
                </p>
              )}
              {r.photoUrl && (
                <a
                  href={r.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-7 mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 hover:underline"
                >
                  📷 사진 보기
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
