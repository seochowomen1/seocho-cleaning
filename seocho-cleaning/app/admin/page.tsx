"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDate } from "@/lib/config";
import { useConfig } from "@/lib/useConfig";
import PhotoGallery from "@/components/admin/PhotoGallery";
import type { PhotoEntry } from "@/components/admin/Lightbox";

type AdminTab = "dashboard" | "gallery" | "submissions";

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
  const { timeSlots: TIME_SLOTS, workers: WORKERS } = useConfig();

  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [filterC, setFilterC] = useState(false);
  const [filterWorker, setFilterWorker] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [drillItem, setDrillItem] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem("adminPreview") === "1") {
      setPreviewMode(true);
      setAuthed(true);
      return;
    }
    const saved = localStorage.getItem("adminKey");
    if (saved) {
      setAdminKey(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (previewMode) {
      setData(generateMockData(days));
      setLastUpdated(new Date());
    } else {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, days, previewMode]);

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
      setLastUpdated(new Date());
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

  const enterPreview = () => {
    localStorage.setItem("adminPreview", "1");
    setPreviewMode(true);
    setAuthed(true);
  };

  const logout = () => {
    localStorage.removeItem("adminKey");
    localStorage.removeItem("adminPreview");
    setAdminKey("");
    setAuthed(false);
    setPreviewMode(false);
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

  // 오늘 슬롯별 현황 (3개 시간대)
  const todayStatus = useMemo(() => {
    const today = formatDate(new Date());
    const nowHour = new Date().getHours();
    return TIME_SLOTS.map((slot) => {
      const worker = WORKERS.find((w) => w.timeSlotId === slot.id);
      const submission = data?.submissions.find(
        (s) =>
          s.date === today &&
          (s.timeSlotLabel === slot.label || s.timeSlotLabel.includes(slot.label))
      );
      let state: "done" | "pending" | "missed" = "pending";
      if (submission) state = "done";
      else if (nowHour >= slot.endHour) state = "missed";
      return {
        slot,
        worker,
        submission,
        state,
        cCount: submission
          ? submission.results.filter((r) => r.grade === "C").length
          : 0,
      };
    });
  }, [data, TIME_SLOTS, WORKERS]);

  // 사진이 첨부된 조치필요 항목 (갤러리용)
  const photos = useMemo<PhotoEntry[]>(() => {
    if (!data) return [];
    const list: PhotoEntry[] = [];
    data.submissions.forEach((s) =>
      s.results.forEach((r) => {
        if (r.grade === "C" && r.photoUrl) {
          list.push({
            photoUrl: r.photoUrl,
            itemName: r.itemName,
            itemId: r.itemId,
            workerName: s.workerName,
            date: s.date,
            timeSlotLabel: s.timeSlotLabel,
            note: r.note || "",
          });
        }
      })
    );
    return list;
  }, [data]);

  // 항목별 조치필요 빈도 (어떤 항목이 자주 문제인지)
  const itemIssues = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    data.submissions.forEach((s) =>
      s.results.forEach((r) => {
        if (r.grade === "C") {
          map.set(r.itemName, (map.get(r.itemName) || 0) + 1);
        }
      })
    );
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
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

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-ink-100" />
            <span className="text-[10px] tracking-widest text-ink-400 font-semibold">
              OR
            </span>
            <div className="flex-1 h-px bg-ink-100" />
          </div>

          <button
            onClick={enterPreview}
            className="w-full h-11 rounded-xl border-2 border-dashed border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 text-ink-700 hover:text-brand-700 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            샘플 데이터로 미리보기
          </button>
          <p className="text-[10px] text-ink-400 text-center mt-2">
            실제 데이터 없이 디자인 확인용
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ===== 상단 바 ===== */}
      <header className="bg-white/85 backdrop-blur border-b border-ink-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shadow-glow">
              SC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-ink-900 tracking-tight leading-none truncate">
                  청소 점검 대시보드
                </h1>
                {previewMode && (
                  <span className="inline-flex items-center gap-1 px-2 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wider uppercase">
                    Preview
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 mt-1 leading-none">
                서초여성가족플라자 서초센터
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {lastUpdated && (
              <span className="hidden sm:inline-block text-[11px] text-ink-400 px-2">
                {formatRelativeTime(lastUpdated)} 갱신
              </span>
            )}
            <button
              onClick={logout}
              className="text-xs text-ink-500 hover:text-ink-900 px-3 py-1.5 rounded-lg hover:bg-ink-50 font-medium"
            >
              {previewMode ? "나가기" : "로그아웃"}
            </button>
          </div>
        </div>
      </header>

      {/* ===== 탭 네비게이션 ===== */}
      <nav className="bg-white border-b border-ink-100 sticky top-16 z-[5]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center gap-1">
          {([
            { id: "dashboard", label: "대시보드" },
            { id: "gallery", label: "사진 갤러리", count: photos.length },
            { id: "submissions", label: "제출 내역" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative h-12 px-4 text-sm font-semibold transition-colors inline-flex items-center gap-1.5 ${
                activeTab === t.id
                  ? "text-ink-900"
                  : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {t.label}
              {"count" in t && t.count !== undefined && t.count > 0 && (
                <span
                  className={`px-1.5 h-5 inline-flex items-center rounded text-[10px] font-bold ${
                    activeTab === t.id
                      ? "bg-rose-100 text-rose-700"
                      : "bg-ink-100 text-ink-600"
                  }`}
                >
                  {t.count}
                </span>
              )}
              {activeTab === t.id && (
                <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-ink-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

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
            <span className="text-sm font-medium text-ink-700">조치필요만</span>
          </label>

          <div className="ml-auto flex flex-wrap gap-2">
            <a
              href="/admin/print/weekly"
              target="_blank"
              rel="noopener"
              className="h-10 px-3 rounded-xl border border-ink-200 bg-white text-sm font-semibold hover:bg-ink-50 shadow-soft inline-flex items-center gap-1.5"
              title="이번 주 데이터를 A4 한 장으로 출력"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              주간 출력
            </a>
            <a
              href="/admin/print/template"
              target="_blank"
              rel="noopener"
              className="h-10 px-3 rounded-xl border border-ink-200 bg-white text-sm font-semibold hover:bg-ink-50 shadow-soft inline-flex items-center gap-1.5"
              title="월~금 5일치 수기 점검표 (가로 A4 1장)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 11h6m-6 4h6m-6 4h2" />
              </svg>
              주간 양식
            </a>
            <button
              onClick={exportCSV}
              disabled={!filteredSubmissions.length}
              className="h-10 px-3 rounded-xl border border-ink-200 bg-white text-sm font-semibold hover:bg-ink-50 disabled:opacity-40 shadow-soft inline-flex items-center gap-1.5"
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

        {/* ===== 미리보기 모드 안내 (모든 탭) ===== */}
        {previewMode && data && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 flex items-center gap-3">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">미리보기 모드</p>
              <p className="text-xs text-amber-800">
                실제 데이터가 아닌 샘플로 디자인을 미리 보고 있습니다.
              </p>
            </div>
          </div>
        )}

        {data && activeTab === "dashboard" && (
          <div className="animate-fade-in">

            {/* ===== 미제출 알림 배너 ===== */}
            {(() => {
              const missed = todayStatus.filter((s) => s.state === "missed");
              if (missed.length === 0) return null;
              return (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/50 p-4 flex items-center gap-3 animate-slide-up">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-rose-500 text-white flex items-center justify-center font-extrabold">
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-rose-900">
                      오늘 미제출 {missed.length}건
                    </p>
                    <p className="text-xs text-rose-800">
                      {missed
                        .map((m) => `${m.slot.label} (${m.worker?.name})`)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* ===== 오늘 현황 (3개 시간대 컴플라이언스) ===== */}
            <TodayStatusPanel slots={todayStatus} />

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
                label="조치필요"
                value={data.cCount}
                unit="건"
                hint={data.cCount > 0 ? "확인 요망" : "이상 없음"}
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
                      <DistLegend color="rose" label="조치필요" grade="C" count={gradeDist.C} total={gradeDist.total} />
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

            {/* ===== 항목별 조치필요 빈도 ===== */}
            <ItemIssuesPanel
              items={itemIssues}
              onItemClick={(name) => setDrillItem(name)}
            />
          </div>
        )}
        {/* ===== /대시보드 ===== */}

        {/* ===== 사진 갤러리 ===== */}
        {data && activeTab === "gallery" && (
          <div className="animate-fade-in">
            <PhotoGallery photos={photos} />
          </div>
        )}

        {/* ===== 제출 내역 ===== */}
        {data && activeTab === "submissions" && (
          <div className="animate-fade-in">
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
          </div>
        )}

        {/* ===== 항목 드릴다운 모달 ===== */}
        {drillItem && data && (
          <ItemDrillModal
            itemName={drillItem}
            submissions={data.submissions}
            onClose={() => setDrillItem(null)}
          />
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
    brand: {
      bar: "bg-brand-500",
      text: "text-brand-600",
      bg: "from-brand-50/60 to-white",
    },
    emerald: {
      bar: "bg-emerald-500",
      text: "text-emerald-600",
      bg: "from-emerald-50/60 to-white",
    },
    rose: {
      bar: "bg-rose-500",
      text: "text-rose-600",
      bg: "from-rose-50/70 to-white",
    },
    ink: {
      bar: "bg-ink-300",
      text: "text-ink-500",
      bg: "from-ink-50 to-white",
    },
    violet: {
      bar: "bg-violet-500",
      text: "text-violet-600",
      bg: "from-violet-50/60 to-white",
    },
  };
  const t = toneMap[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-soft border border-ink-100 p-4 bg-gradient-to-br ${t.bg} hover:shadow-card transition-shadow`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.bar}`} />
      <p className="text-[11px] font-semibold tracking-wider text-ink-500 uppercase">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-2">
        <p className="text-[28px] md:text-3xl font-extrabold text-ink-900 leading-none tracking-tight tabular-nums">
          {value}
        </p>
        {unit && (
          <span className="text-sm font-semibold text-ink-400">{unit}</span>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
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

// ============================================
// 오늘 현황 패널
// ============================================
function TodayStatusPanel({
  slots,
}: {
  slots: {
    slot: { id: string; label: string };
    worker: { name: string } | undefined;
    submission: Submission | undefined;
    state: "done" | "pending" | "missed";
    cCount: number;
  }[];
}) {
  const today = new Date();
  const dateLabel = `${today.getFullYear()}.${String(
    today.getMonth() + 1
  ).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const missed = slots.filter((s) => s.state === "missed").length;
  const done = slots.filter((s) => s.state === "done").length;

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-ink-100 p-5 mb-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-ink-900">오늘 현황</h2>
          <p className="text-[11px] text-ink-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-xs flex items-center gap-3">
          <span className="text-emerald-700 font-semibold">
            완료 {done}/{slots.length}
          </span>
          {missed > 0 && (
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-rose-100 text-rose-700 font-bold">
              ⚠ 미제출 {missed}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {slots.map(({ slot, worker, submission, state, cCount }) => (
          <TodaySlotCard
            key={slot.id}
            slotLabel={slot.label}
            workerName={worker?.name || "—"}
            state={state}
            submittedAt={submission?.submittedAt}
            cCount={cCount}
          />
        ))}
      </div>
    </div>
  );
}

function TodaySlotCard({
  slotLabel,
  workerName,
  state,
  submittedAt,
  cCount,
}: {
  slotLabel: string;
  workerName: string;
  state: "done" | "pending" | "missed";
  submittedAt?: string;
  cCount: number;
}) {
  const tone =
    state === "done"
      ? {
          card: "bg-emerald-50/60 border-emerald-200",
          bar: "bg-emerald-500",
          icon: (
            <svg
              className="w-4 h-4 text-white"
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
          ),
          chip: "bg-emerald-500 text-white",
          chipText: "완료",
        }
      : state === "missed"
      ? {
          card: "bg-rose-50/60 border-rose-300",
          bar: "bg-rose-500",
          icon: <span className="text-white text-xs font-bold">!</span>,
          chip: "bg-rose-500 text-white",
          chipText: "미제출",
        }
      : {
          card: "bg-ink-50 border-ink-200",
          bar: "bg-ink-300",
          icon: (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          chip: "bg-ink-200 text-ink-700",
          chipText: "예정",
        };

  const submittedTime = submittedAt
    ? (() => {
        const d = new Date(submittedAt);
        return `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
      })()
    : null;

  return (
    <div
      className={`relative rounded-xl border p-4 pl-5 transition-colors ${tone.card}`}
    >
      <span
        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${tone.bar}`}
        aria-hidden
      />
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-ink-500 uppercase">
            {slotLabel}
          </p>
          <p className="text-base font-bold text-ink-900 mt-0.5">
            {workerName}
          </p>
        </div>
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${tone.chip}`}
        >
          {tone.icon}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span
          className={`inline-flex items-center px-2 h-6 rounded-md text-[11px] font-bold ${tone.chip}`}
        >
          {tone.chipText}
        </span>
        {state === "done" && (
          <div className="flex items-center gap-2 text-[11px] text-ink-600">
            {submittedTime && <span>{submittedTime} 제출</span>}
            {cCount > 0 && (
              <span className="text-rose-700 font-bold">조치 {cCount}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 항목별 조치필요 빈도
// ============================================
function ItemIssuesPanel({
  items,
  onItemClick,
}: {
  items: { name: string; count: number }[];
  onItemClick?: (name: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-ink-100 p-5 mb-5">
        <h3 className="text-sm font-bold text-ink-900 mb-1">
          항목별 조치필요
        </h3>
        <p className="text-xs text-ink-500 mb-3">
          기간 내 조치필요로 기록된 항목이 없습니다.
        </p>
        <EmptyMini text="이상 없음 🎉" />
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-ink-100 p-5 mb-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-ink-900">
            항목별 조치필요 빈도
          </h3>
          <p className="text-[11px] text-ink-500 mt-0.5">
            항목을 누르면 해당 사례를 자세히 볼 수 있어요
          </p>
        </div>
        <p className="text-xs text-ink-500">
          총{" "}
          <b className="text-rose-700">
            {items.reduce((a, b) => a + b.count, 0)}
          </b>
          건
        </p>
      </div>
      <ul className="space-y-1">
        {items.map((it, idx) => (
          <li key={it.name}>
            <button
              type="button"
              onClick={() => onItemClick?.(it.name)}
              className="w-full flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors text-left group"
            >
              <span className="text-[11px] text-ink-400 w-4 text-right tabular-nums">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-ink-800 w-32 truncate group-hover:text-ink-900">
                {it.name}
              </span>
              <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
                  style={{ width: `${(it.count / max) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-rose-700 w-10 text-right tabular-nums">
                {it.count}
              </span>
              <svg
                className="w-3.5 h-3.5 text-ink-300 group-hover:text-ink-600 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// 항목 드릴다운 모달
// ============================================
function ItemDrillModal({
  itemName,
  submissions,
  onClose,
}: {
  itemName: string;
  submissions: Submission[];
  onClose: () => void;
}) {
  // 해당 항목의 C 등급 사례만 추출
  const cases = useMemo(() => {
    const list: {
      date: string;
      timeSlotLabel: string;
      workerName: string;
      note: string;
      photoUrl?: string;
    }[] = [];
    submissions.forEach((s) =>
      s.results.forEach((r) => {
        if (r.grade === "C" && r.itemName === itemName) {
          list.push({
            date: s.date,
            timeSlotLabel: s.timeSlotLabel,
            workerName: s.workerName,
            note: r.note || "",
            photoUrl: r.photoUrl,
          });
        }
      })
    );
    return list.sort((a, b) =>
      `${b.date}${b.timeSlotLabel}`.localeCompare(`${a.date}${a.timeSlotLabel}`)
    );
  }, [submissions, itemName]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-5 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 md:px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-rose-600 uppercase">
              조치필요 사례
            </p>
            <h2 className="text-lg font-bold text-ink-900 tracking-tight truncate">
              {itemName}
              <span className="text-sm text-ink-500 font-normal ml-2">
                {cases.length}건
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-ink-100 hover:bg-ink-200 text-ink-700 flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto p-5 md:p-6 space-y-3">
          {cases.length === 0 ? (
            <p className="text-center text-sm text-ink-400 py-12">
              사례가 없습니다.
            </p>
          ) : (
            cases.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-ink-100 p-4 hover:border-rose-200 hover:bg-rose-50/30 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-ink-900">
                    {c.date}
                    <span className="font-normal text-ink-500 ml-2">
                      {c.timeSlotLabel}
                    </span>
                  </p>
                  <p className="text-xs text-ink-500 shrink-0">{c.workerName}</p>
                </div>
                {c.note && (
                  <p className="text-sm text-ink-700 mt-2 leading-relaxed">
                    📝 {c.note}
                  </p>
                )}
                {c.photoUrl && (
                  <a
                    href={c.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-brand-600 hover:text-brand-800 hover:underline"
                  >
                    📷 사진 보기 ↗
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
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
                  조치필요
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

// ============================================
// 헬퍼
// ============================================
function formatRelativeTime(d: Date): string {
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============================================
// 샘플 데이터 생성 (미리보기 모드)
// ============================================
function generateMockData(days: number): StatsData {
  const today = new Date();
  const items: { id: string; name: string; slots?: string[] }[] = [
    { id: "desk_chair", name: "강의용 책상/의자 배열 정리" },
    { id: "dust", name: "강의용 책상/의자 이물질 및 먼지 청소" },
    { id: "floor", name: "강의실 내 바닥 점검" },
    { id: "ac_light", name: "빈 강의실 내 전등 및 냉난방기 OFF상태" },
    { id: "healing_room", name: "힐링/마루강의실 거울 및 바닥 청소" },
    { id: "hallway", name: "복도 및 강의실 출입구 눈에 띄는 쓰레기 정리" },
    { id: "recycling", name: "각 층 분리수거함 위 눈에 띄는 쓰레기 정리" },
    { id: "water_cup", name: "각 층 정수기 물컵 점검 및 채우기" },
    { id: "plants", name: "화분 관수 및 상태", slots: ["morning"] },
    { id: "terrace", name: "테라스 주변 정리", slots: ["morning"] },
  ];
  const slots = [
    { id: "morning", label: "09:00 ~ 12:00", worker: "김성만", endHour: 12 },
    { id: "afternoon", label: "12:00 ~ 15:00", worker: "배정열", endHour: 15 },
    { id: "evening", label: "15:00 ~ 18:00", worker: "조숙임", endHour: 18 },
  ];

  // 결정적이지만 그럴듯한 등급 분포 (대부분 A, 가끔 B/C)
  const pickGrade = (seed: number): "A" | "B" | "C" => {
    const r = (Math.sin(seed) * 10000) % 1;
    const v = Math.abs(r);
    if (v < 0.08) return "C";
    if (v < 0.22) return "B";
    return "A";
  };
  const cNotes: Record<string, string[]> = {
    desk_chair: ["5층 상상1 책상 배열 흐트러짐", "의자 정렬 미흡"],
    dust: ["책상 위 먼지 쌓임", "의자 위 이물질"],
    floor: ["바닥에 이물질 지워지지 않음", "물기 자국"],
    ac_light: ["빈 강의실 에어컨 꺼짐 안됨", "전등 1개 점등 그대로"],
    healing_room: ["7층 거울 얼룩", "마루 바닥 오염"],
    hallway: ["복도 종이박스 방치", "출입구 쓰레기 발견"],
    recycling: ["분리수거함 위 종이쓰레기 쌓임", "분리수거함 위 정리 미흡"],
    water_cup: ["3층 물컵 비어있음", "1층 물컵 부족"],
    plants: ["화분 관수 미실시", "화분 받침대 먼지 쌓임"],
    terrace: ["6층 테라스 테이블 먼지", "테라스 잔여 쓰레기"],
  };

  const submissions: Submission[] = [];
  let seed = 1;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;

    for (const slot of slots) {
      // 오늘은 시간이 지난 슬롯만 (예정 슬롯 만들기)
      if (dayOffset === 0 && today.getHours() < slot.endHour) continue;
      // 가끔 미제출 (시뮬레이션) — 단, 오늘은 다 채워야 미제출 마킹 시연
      if (dayOffset > 0 && Math.abs(Math.sin(seed * 7.3)) < 0.06) {
        seed++;
        continue;
      }

      // 해당 시간대에만 보이는 항목 (예: 화분 관수는 morning만)
      const slotItems = items.filter(
        (it) => !it.slots || it.slots.includes(slot.id)
      );

      const results = slotItems.map((it) => {
        seed++;
        const grade = pickGrade(seed);
        const note =
          grade === "C"
            ? cNotes[it.id]?.[seed % (cNotes[it.id]?.length || 1)] || ""
            : undefined;
        // C 등급 중 약 60%에 placeholder 사진 부착 (Picsum)
        const photoUrl =
          grade === "C" && Math.abs(Math.sin(seed * 1.7)) > 0.4
            ? `https://picsum.photos/seed/sc${seed}/640/480`
            : undefined;
        return {
          itemId: it.id,
          itemName: it.name,
          grade,
          note,
          photoUrl,
        };
      });

      const submittedAt = new Date(d);
      submittedAt.setHours(slot.endHour - 1, 30, 0, 0);

      submissions.push({
        date: dateStr,
        timeSlotLabel: slot.label,
        workerName: slot.worker,
        submittedAt: submittedAt.toISOString(),
        results,
        hasC: results.some((r) => r.grade === "C"),
      });
    }
  }

  const cCount = submissions.reduce(
    (acc, s) => acc + s.results.filter((r) => r.grade === "C").length,
    0
  );

  return {
    totalSubmissions: submissions.length,
    completionRate: Math.round((submissions.length / (days * 3)) * 100),
    cCount,
    submissions,
  };
}
