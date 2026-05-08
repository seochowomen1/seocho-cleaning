"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useConfig } from "@/lib/useConfig";
import type { ChecklistItem } from "@/lib/config";

// 5일 (월~금)
const WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
];

type ViewMode = "all" | string; // "all" 또는 slot.id

export default function WeeklyTemplatePage() {
  const router = useRouter();
  const { org, items: CHECKLIST_ITEMS, timeSlots: TIME_SLOTS, workers: WORKERS } = useConfig();
  const [view, setView] = useState<ViewMode>("all");

  const slotInfo = useMemo(
    () =>
      TIME_SLOTS.map((s) => {
        const w = WORKERS.find((wk) => wk.timeSlotId === s.id);
        return {
          ...s,
          worker: w?.name || "",
          initial: w?.name?.charAt(0) || "",
          short: s.label.replace(/:00/g, "").replace(" ~ ", "-"),
        };
      }),
    [TIME_SLOTS, WORKERS]
  );

  // 단일 슬롯 모드일 때 사용
  const selectedSlot = view === "all" ? null : slotInfo.find((s) => s.id === view);
  const visibleItems = useMemo(() => {
    if (view === "all") return CHECKLIST_ITEMS;
    return CHECKLIST_ITEMS.filter(
      (it) => !it.slots || (it.slots as string[]).includes(view)
    );
  }, [CHECKLIST_ITEMS, view]);

  const isPortrait = view !== "all";

  const handleExcelDownload = () => {
    const html =
      view === "all"
        ? buildExcelAllHtml(org.name, CHECKLIST_ITEMS, slotInfo)
        : buildExcelSingleHtml(
            org.name,
            visibleItems,
            selectedSlot!
          );
    const bom = "﻿";
    const blob = new Blob([bom + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileSuffix =
      view === "all" ? "통합" : selectedSlot?.worker || view;
    link.download = `청소점검_주간_${fileSuffix}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* 인쇄 방향: 통합=가로, 개별=세로 */}
      <style>{`
        @media print {
          @page {
            size: A4 ${isPortrait ? "portrait" : "landscape"};
            margin: ${isPortrait ? "1.2cm" : "0.8cm"};
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

          {/* 양식 선택 (화면 전용) */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4 print:hidden">
            <span className="text-xs font-semibold text-ink-600 mr-2">양식:</span>
            <button
              onClick={() => setView("all")}
              className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                view === "all"
                  ? "bg-ink-900 text-white"
                  : "bg-white border border-ink-200 text-ink-700 hover:bg-ink-50"
              }`}
            >
              통합 (3교대)
            </button>
            {slotInfo.map((s) => (
              <button
                key={s.id}
                onClick={() => setView(s.id)}
                className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  view === s.id
                    ? "bg-ink-900 text-white"
                    : "bg-white border border-ink-200 text-ink-700 hover:bg-ink-50"
                }`}
                title={`${s.short} 시간대`}
              >
                {s.worker}
              </button>
            ))}
          </div>

          {/* 안내 (화면 전용) */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-900 print:hidden">
            {view === "all" ? (
              <>
                <b>📋 통합 주간 양식</b> — 월~금 5일치 × 3교대를 가로 A4 한 장에 담은 양식입니다.
              </>
            ) : (
              <>
                <b>📋 {selectedSlot?.worker} ({selectedSlot?.short}) 전용 주간 양식</b> — 본인 시간대만 표시됩니다. 세로 A4로 인쇄됩니다.
              </>
            )}
          </div>

          {/* ========================= 인쇄 영역 ========================= */}
          <div className="print-area">
            {/* 제목 */}
            <header className="border-b-2 border-black pb-1.5 mb-2.5 flex items-baseline justify-between">
              <h1 className="text-[18px] font-bold tracking-tight">
                {view === "all"
                  ? "청소점검 주간 체크리스트"
                  : `청소점검 주간 체크리스트 — ${selectedSlot?.worker} (${selectedSlot?.short})`}
              </h1>
              <p className="text-[11px] text-ink-700">{org.name}</p>
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

            {view === "all" ? (
              /* ===== 통합 그리드 (5일 × 3교대) ===== */
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
                        className="border-2 border-black p-1.5 bg-ink-100 text-center"
                      >
                        <div className="text-[13px] font-bold">{d.label}</div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {WEEKDAYS.flatMap((d) =>
                      slotInfo.map((s) => (
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
                        <ItemLabel item={item} idx={idx} />
                      </td>
                      {WEEKDAYS.flatMap((d) =>
                        slotInfo.map((s) => {
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
            ) : (
              /* ===== 단일 슬롯 그리드 (5일 × 1) ===== */
              <table className="w-full border-collapse text-[12px] mb-3 table-fixed">
                <colgroup>
                  <col style={{ width: "40%" }} />
                  {WEEKDAYS.map((d) => (
                    <col key={d.key} style={{ width: "12%" }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="border-2 border-black p-2 bg-ink-100 text-left align-middle text-[12px]">
                      점검 항목
                    </th>
                    {WEEKDAYS.map((d) => (
                      <th
                        key={d.key}
                        className="border-2 border-black p-2 bg-ink-100 text-center"
                      >
                        <div className="text-[15px] font-bold">{d.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-ink-700 p-2 align-top">
                        <ItemLabel item={item} idx={idx} large />
                      </td>
                      {WEEKDAYS.map((d) => (
                        <td
                          key={d.key}
                          className="border border-ink-700"
                          style={{ height: "18mm" }}
                        ></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 범례 */}
            <p className="text-[10px] text-ink-800 mb-3 leading-relaxed">
              <b>평가:</b> <b className="text-emerald-700">O</b> 양호&nbsp;·&nbsp;
              <b className="text-rose-700">X</b> 불량
              {view === "all" && (
                <>
                  &nbsp;&nbsp;|&nbsp;&nbsp;<span className="text-ink-500">▨ 해당없음</span>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  {slotInfo
                    .map((s) => `${s.initial} = ${s.worker} (${s.short})`)
                    .join(" · ")}
                </>
              )}
            </p>

            {/* 특이사항 */}
            <section className="mb-3">
              <h2 className="text-[11px] font-bold mb-1">
                특이사항 / 불량 내용
              </h2>
              <div className="border border-ink-700">
                <div className="border-b border-ink-300 h-[6mm] px-2 py-0.5 text-[9px] text-ink-300">
                  날짜·시간대·항목·내용
                </div>
                <div className="border-b border-ink-300 h-[6mm]"></div>
                <div className={view === "all" ? "h-[6mm]" : "border-b border-ink-300 h-[6mm]"}></div>
                {view !== "all" && <div className="h-[6mm]"></div>}
              </div>
            </section>

            {/* 서명 */}
            {view === "all" ? (
              <div className="print-signature grid grid-cols-4 gap-3">
                {slotInfo.map((s) => (
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
            ) : (
              <div className="print-signature grid grid-cols-2 gap-12 mt-6">
                <div className="text-center">
                  <p className="text-[12px] text-ink-700 mb-8">
                    {selectedSlot?.worker} 서명
                  </p>
                  <div className="border-b border-black h-0.5"></div>
                  <p className="text-[10px] text-ink-600 mt-1.5">
                    {selectedSlot?.short}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[12px] text-ink-700 mb-8">관리자 서명</p>
                  <div className="border-b border-black h-0.5"></div>
                  <p className="text-[10px] text-ink-600 mt-1.5">확인</p>
                </div>
              </div>
            )}
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
type SlotForExcel = {
  id: string;
  worker: string;
  initial: string;
  short: string;
};
type ItemForExcel = {
  id: string;
  name: string;
  floors?: string;
  frequency?: string;
  slots?: string[];
};
function buildExcelAllHtml(
  orgName: string,
  items: ItemForExcel[],
  slotInfo: SlotForExcel[]
): string {
  // 헤더 행 1: 점검 항목 + 5개 요일 (각 3 열 병합)
  const dayHeaderCells = WEEKDAYS.map(
    (d) =>
      `<th colspan="3" style="border:1.5px solid #000;background:#e5e7eb;padding:6px;text-align:center;">${d.label}</th>`
  ).join("");

  // 헤더 행 2: 점검자 이니셜 (5일 × 3교대 = 15개)
  const initialHeaderCells = WEEKDAYS.flatMap(() =>
    slotInfo.map(
      (s) =>
        `<th style="border:1px solid #555;background:#f3f4f6;padding:3px;text-align:center;font-size:10px;">${s.initial}</th>`
    )
  ).join("");

  // 항목 행
  const itemRows = items.map((item, idx) => {
    const meta: string[] = [];
    if (item.floors) meta.push(`(${item.floors})`);
    if (item.frequency === "weekly") meta.push("주1회");
    const metaStr = meta.length
      ? ` <span style="color:#666;font-size:9px;">${meta.join(" ")}</span>`
      : "";

    const dayCells = WEEKDAYS.flatMap(() =>
      slotInfo.map((s) => {
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
  <div style="font-size:11px;color:#444;">${orgName}</div>
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
    평가: O 양호 · X 불량  |  ▨ 해당없음  |
    김 = 김성만 (09:00~12:00) · 배 = 배정열 (12:00~15:00) · 조 = 조숙임 (15:00~18:00)
  </p>

  <h2>특이사항 / 불량 내용</h2>
  <table>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
  </table>

  <br/><br/>
  <table>
    <tr>
      ${slotInfo.map(
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

// ============================================
// 엑셀 다운로드 — 단일 슬롯 (세로 A4)
// ============================================
function buildExcelSingleHtml(
  orgName: string,
  items: ItemForExcel[],
  slot: SlotForExcel
): string {
  const dayHeaderCells = WEEKDAYS.map(
    (d) =>
      `<th style="border:1.5px solid #000;background:#e5e7eb;padding:10px;text-align:center;width:60px;">
        <div style="font-size:14px;font-weight:bold;">${d.label}</div>
       </th>`
  ).join("");

  const itemRows = items.map((item, idx) => {
    const meta: string[] = [];
    if (item.floors) meta.push(`(${item.floors})`);
    if (item.frequency === "weekly") meta.push("주1회");
    const metaStr = meta.length
      ? ` <span style="color:#666;font-size:10px;">${meta.join(" ")}</span>`
      : "";
    const dayCells = WEEKDAYS.map(
      () => `<td style="border:1px solid #555;height:40px;"></td>`
    ).join("");
    return `<tr>
      <td style="border:1px solid #555;padding:6px 8px;font-size:12px;">
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
        <x:Name>${slot.worker} 주간</x:Name>
        <x:WorksheetOptions>
          <x:Print>
            <x:ValidPrinterInfo />
            <x:PaperSizeIndex>9</x:PaperSizeIndex>
            <x:Orientation>Portrait</x:Orientation>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 12px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 12px; margin: 14px 0 4px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: middle; }
  .meta-row td { border: 1px solid #555; padding: 6px; }
</style>
</head>
<body>
  <h1>청소점검 주간 체크리스트 — ${slot.worker} (${slot.short})</h1>
  <div style="font-size:11px;color:#444;">${orgName}</div>
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
        <th style="border:1.5px solid #000;background:#e5e7eb;padding:8px;text-align:left;">점검 항목</th>
        ${dayHeaderCells}
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>
  <p style="font-size:11px;color:#444;margin-top:8px;">
    평가: O 양호 · X 불량
  </p>
  <h2>특이사항 / 불량 내용</h2>
  <table>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
    <tr><td style="border:1px solid #555;height:30px;">&nbsp;</td></tr>
  </table>
  <br/><br/>
  <table>
    <tr>
      <td style="border-bottom:1px solid #000;text-align:center;width:50%;padding-top:36px;font-size:12px;">
        ${slot.worker} 서명<br/><small style="color:#666;">${slot.short}</small>
      </td>
      <td style="border-bottom:1px solid #000;text-align:center;width:50%;padding-top:36px;font-size:12px;">
        관리자 서명<br/><small style="color:#666;">확인</small>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// 항목 라벨 (그리드 안 좌측 셀)
// ============================================
function ItemLabel({
  item,
  idx,
  large,
}: {
  item: ChecklistItem;
  idx: number;
  large?: boolean;
}) {
  const titleClass = large ? "text-[12px]" : "text-[10px]";
  const metaClass = large ? "text-[10px]" : "text-[9px]";
  return (
    <div className={`${titleClass} leading-tight`}>
      <span className="font-bold tabular-nums">{idx + 1}.</span>{" "}
      <span className="font-semibold">{item.name}</span>
      {item.floors && (
        <span className={`ml-1 ${metaClass} font-medium text-ink-600`}>
          ({item.floors})
        </span>
      )}
      {item.frequency === "weekly" && (
        <span className={`ml-1 ${metaClass} font-bold text-amber-700`}>
          주1회
        </span>
      )}
    </div>
  );
}
