"use client";

import { useRouter } from "next/navigation";
import { CHECKLIST_ITEMS, TIME_SLOTS, WORKERS } from "@/lib/config";

// 5일 (월~금)
const WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
];

const SLOT_INFO = TIME_SLOTS.map((s) => {
  const w = WORKERS.find((wk) => wk.timeSlotId === s.id);
  return {
    ...s,
    worker: w?.name || "",
    initial: w?.name?.charAt(0) || "",
    short: s.label.replace(/:00/g, "").replace(" ~ ", "-"),
  };
});

export default function WeeklyTemplatePage() {
  const router = useRouter();

  const handleExcelDownload = () => {
    const html = buildExcelHtml();
    const bom = "﻿";
    const blob = new Blob([bom + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `청소점검_주간_양식.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* 가로 A4 인쇄 설정 (이 페이지 한정) */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.8cm;
          }
        }
      `}</style>

      <div className="bg-white text-black min-h-screen">
        <div className="max-w-[300mm] mx-auto p-4 print-root">
          {/* 화면 전용 액션 바 */}
          <div className="flex items-center justify-between mb-4 print:hidden">
            <button
              onClick={() => router.push("/admin")}
              className="text-sm text-ink-600 hover:text-ink-900 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              대시보드로
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleExcelDownload}
                className="h-10 px-4 rounded-lg border border-ink-300 bg-white text-sm font-semibold hover:bg-ink-50 inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                엑셀 다운로드
              </button>
              <button
                onClick={() => window.print()}
                className="h-10 px-4 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800"
              >
                🖨 인쇄
              </button>
            </div>
          </div>

          {/* 안내 (화면 전용) */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-900 print:hidden">
            <b>📋 주간 수기 점검표</b> — 월~금 5일치를 가로 A4 한 장에 담은
            양식입니다. 인쇄해 사용하거나 엑셀로 다운로드해 편집할 수 있어요.
          </div>

          {/* ========================= 인쇄 영역 ========================= */}
          <div className="print-area">
            {/* 제목 */}
            <header className="border-b-2 border-black pb-1.5 mb-2.5 flex items-baseline justify-between">
              <h1 className="text-[18px] font-bold tracking-tight">
                청소점검 주간 체크리스트
              </h1>
              <p className="text-[11px] text-ink-700">
                서초여성가족플라자 서초센터
              </p>
            </header>

            {/* 주차 입력 */}
            <p className="text-[11px] mb-2">
              <b>주차:</b>&nbsp;
              <span className="inline-block min-w-[40px] border-b border-black mx-1">&nbsp;</span>
              년&nbsp;
              <span className="inline-block min-w-[28px] border-b border-black mx-1">&nbsp;</span>
              월&nbsp;
              <span className="inline-block min-w-[28px] border-b border-black mx-1">&nbsp;</span>
              일 (월) ~&nbsp;
              <span className="inline-block min-w-[28px] border-b border-black mx-1">&nbsp;</span>
              월&nbsp;
              <span className="inline-block min-w-[28px] border-b border-black mx-1">&nbsp;</span>
              일 (금)
            </p>

            {/* 메인 그리드 */}
            <table className="w-full border-collapse text-[10px] mb-2 table-fixed">
              <colgroup>
                <col style={{ width: "20%" }} />
                {Array.from({ length: 15 }).map((_, i) => (
                  <col key={i} style={{ width: `${80 / 15}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="border-2 border-black p-1.5 bg-ink-100 text-left align-middle"
                  >
                    점검 항목
                  </th>
                  {WEEKDAYS.map((d) => (
                    <th
                      key={d.key}
                      colSpan={3}
                      className="border-2 border-black p-1 bg-ink-100 text-center"
                    >
                      <div className="text-[13px] font-bold">{d.label}</div>
                      <div className="text-[9px] font-normal text-ink-600 mt-0.5">
                        __ / __
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  {WEEKDAYS.flatMap((d) =>
                    SLOT_INFO.map((s) => (
                      <th
                        key={`${d.key}-${s.id}`}
                        className="border border-ink-700 px-0.5 py-0.5 bg-ink-50 text-[11px] font-bold text-center"
                        title={`${s.worker} (${s.short})`}
                      >
                        {s.initial}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITEMS.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border border-ink-700 p-1.5 align-top">
                      <div className="text-[10px] leading-tight">
                        <span className="font-bold tabular-nums">
                          {idx + 1}.
                        </span>{" "}
                        <span className="font-semibold">{item.name}</span>
                        {item.floors && (
                          <span className="ml-1 text-[9px] font-medium text-ink-600">
                            ({item.floors})
                          </span>
                        )}
                        {item.frequency === "weekly" && (
                          <span className="ml-1 text-[9px] font-bold text-amber-700">
                            주1회
                          </span>
                        )}
                      </div>
                    </td>
                    {WEEKDAYS.flatMap((d) =>
                      SLOT_INFO.map((s) => {
                        const skip = item.slots && !item.slots.includes(s.id);
                        return (
                          <td
                            key={`${d.key}-${s.id}`}
                            className={`border border-ink-700 ${
                              skip ? "bg-ink-100" : ""
                            }`}
                            style={{ height: "11mm" }}
                          >
                            {skip && (
                              <span className="block text-center text-ink-400 text-[14px] leading-none pt-1">
                                ▨
                              </span>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 범례 */}
            <p className="text-[10px] text-ink-800 mb-3 leading-relaxed">
              <b>평가:</b> <b className="text-emerald-700">A</b> 양호&nbsp;·&nbsp;
              <b className="text-amber-700">B</b> 보통&nbsp;·&nbsp;
              <b className="text-rose-700">C</b> 조치필요
              &nbsp;&nbsp;|&nbsp;&nbsp;<span className="text-ink-500">▨ 해당없음</span>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <b>김</b> = 김성만 (09:00~12:00) ·&nbsp;
              <b>배</b> = 배정열 (12:00~15:00) ·&nbsp;
              <b>조</b> = 조숙임 (15:00~18:00)
            </p>

            {/* 특이사항 */}
            <section className="mb-3">
              <h2 className="text-[11px] font-bold mb-1">
                특이사항 / 조치필요 내용
              </h2>
              <div className="border border-ink-700">
                <div className="border-b border-ink-300 h-[6mm] px-2 py-0.5 text-[9px] text-ink-300">
                  날짜·시간대·항목·내용
                </div>
                <div className="border-b border-ink-300 h-[6mm]"></div>
                <div className="h-[6mm]"></div>
              </div>
            </section>

            {/* 서명 */}
            <div className="print-signature grid grid-cols-4 gap-3">
              {SLOT_INFO.map((s) => (
                <div key={s.id} className="text-center">
                  <p className="text-[10px] text-ink-700 mb-5">{s.worker}</p>
                  <div className="border-b border-black h-0.5"></div>
                  <p className="text-[9px] text-ink-600 mt-1">{s.short}</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-[10px] text-ink-700 mb-5">관리자</p>
                <div className="border-b border-black h-0.5"></div>
                <p className="text-[9px] text-ink-600 mt-1">확인 서명</p>
              </div>
            </div>
          </div>
          {/* ========================= /인쇄 영역 ========================= */}
        </div>
      </div>
    </>
  );
}

// ============================================
// 엑셀 다운로드 (HTML → .xls)
// 동일한 주간 양식, 가로 A4에 맞춰 셀 너비 지정
// ============================================
function buildExcelHtml(): string {
  // 헤더 행 1: 점검 항목 + 5개 요일 (각 3 열 병합)
  const dayHeaderCells = WEEKDAYS.map(
    (d) =>
      `<th colspan="3" style="border:1.5px solid #000;background:#e5e7eb;padding:6px;text-align:center;">${d.label}</th>`
  ).join("");

  // 헤더 행 2: 점검자 이니셜 (5일 × 3교대 = 15개)
  const initialHeaderCells = WEEKDAYS.flatMap(() =>
    SLOT_INFO.map(
      (s) =>
        `<th style="border:1px solid #555;background:#f3f4f6;padding:3px;text-align:center;font-size:10px;">${s.initial}</th>`
    )
  ).join("");

  // 항목 행
  const itemRows = CHECKLIST_ITEMS.map((item, idx) => {
    const meta: string[] = [];
    if (item.floors) meta.push(`(${item.floors})`);
    if (item.frequency === "weekly") meta.push("주1회");
    const metaStr = meta.length
      ? ` <span style="color:#666;font-size:9px;">${meta.join(" ")}</span>`
      : "";

    const dayCells = WEEKDAYS.flatMap(() =>
      SLOT_INFO.map((s) => {
        const skip = item.slots && !item.slots.includes(s.id);
        if (skip) {
          return `<td style="border:1px solid #555;background:#e5e7eb;text-align:center;color:#999;height:24px;">▨</td>`;
        }
        return `<td style="border:1px solid #555;height:24px;"></td>`;
      })
    ).join("");

    return `<tr>
      <td style="border:1px solid #555;padding:4px 6px;font-size:10px;">
        <b>${idx + 1}. ${item.name}</b>${metaStr}
      </td>
      ${dayCells}
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>주간 점검표</x:Name>
        <x:WorksheetOptions>
          <x:Print>
            <x:ValidPrinterInfo />
            <x:PaperSizeIndex>9</x:PaperSizeIndex>
            <x:Orientation>Landscape</x:Orientation>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 11px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 12px; margin: 12px 0 4px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: middle; }
  .meta-row td { border: 1px solid #555; padding: 6px; }
</style>
</head>
<body>
  <h1>청소점검 주간 체크리스트</h1>
  <div style="font-size:11px;color:#444;">서초여성가족플라자 서초센터</div>
  <br/>

  <table>
    <tr class="meta-row">
      <td><b>주차</b></td>
      <td>____년 ____월 ____일 (월) ~ ____월 ____일 (금)</td>
    </tr>
  </table>
  <br/>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="border:1.5px solid #000;background:#e5e7eb;padding:6px;text-align:left;width:200px;">점검 항목</th>
        ${dayHeaderCells}
      </tr>
      <tr>
        ${initialHeaderCells}
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <p style="font-size:10px;color:#444;margin-top:8px;">
    평가: A 양호 · B 보통 · C 조치필요  |  ▨ 해당없음  |
    김 = 김성만 (09:00~12:00) · 배 = 배정열 (12:00~15:00) · 조 = 조숙임 (15:00~18:00)
  </p>

  <h2>특이사항 / 조치필요 내용</h2>
  <table>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
  </table>

  <br/><br/>
  <table>
    <tr>
      ${SLOT_INFO.map(
        (s) => `<td style="border-bottom:1px solid #000;text-align:center;width:25%;padding-top:30px;font-size:10px;">
          ${s.worker} 서명<br/><small style="color:#666;">${s.short}</small>
        </td>`
      ).join("")}
      <td style="border-bottom:1px solid #000;text-align:center;width:25%;padding-top:30px;font-size:10px;">
        관리자 서명<br/><small style="color:#666;">확인</small>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
