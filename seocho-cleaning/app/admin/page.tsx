"use client";

import { useState, useEffect } from "react";

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

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl p-6">
          <h1 className="text-lg font-bold mb-4">관리자 로그인</h1>
          <input
            type="password"
            placeholder="관리자 키"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="w-full h-11 px-3 rounded-lg border border-gray-300 mb-3"
          />
          <button
            onClick={login}
            className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  const filteredSubmissions =
    data?.submissions.filter((s) => !filterC || s.hasC) || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">청소 점검 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">서초여성가족플라자 서초센터</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            로그아웃
          </button>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">조회 기간:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm"
          >
            <option value={1}>오늘</option>
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
          <label className="ml-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterC}
              onChange={(e) => setFilterC(e.target.checked)}
              className="w-4 h-4"
            />
            C 등급 포함된 제출만 보기
          </label>
          <button
            onClick={loadData}
            className="ml-auto h-9 px-4 rounded-lg bg-blue-600 text-white text-sm"
          >
            새로고침
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-4">
            {error}
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-500">불러오는 중...</div>}

        {data && !loading && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatCard label="총 제출 건수" value={data.totalSubmissions} />
              <StatCard label="완료율" value={`${data.completionRate}%`} />
              <StatCard
                label="C 등급 항목"
                value={data.cCount}
                emphasis={data.cCount > 0}
              />
            </div>

            {/* 제출 목록 */}
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm">
                제출 내역 ({filteredSubmissions.length}건)
              </div>
              {filteredSubmissions.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500">
                  조회된 데이터가 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
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

function StatCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          emphasis ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(submission.hasC);

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-sm">
              {submission.date} · {submission.timeSlotLabel}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {submission.workerName}
            </p>
          </div>
          {submission.hasC && (
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 font-semibold">
              C 발생
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-3 pl-3 border-l-2 border-gray-200 space-y-2">
          {submission.results.map((r, i) => (
            <div key={i} className="text-xs">
              <span
                className={`inline-block w-6 h-6 leading-6 text-center rounded font-bold mr-2 ${
                  r.grade === "A"
                    ? "bg-green-100 text-green-800"
                    : r.grade === "B"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {r.grade}
              </span>
              <span className="font-medium">{r.itemName}</span>
              {r.note && (
                <p className="ml-8 mt-1 text-gray-600">📝 {r.note}</p>
              )}
              {r.photoUrl && (
                <a
                  href={r.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-8 mt-1 inline-block text-blue-600 hover:underline"
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
