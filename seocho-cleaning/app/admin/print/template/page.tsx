"use client";

import { useRouter } from "next/navigation";
import { CHECKLIST_ITEMS, TIME_SLOTS, WORKERS } from "@/lib/config";

const SLOTS_INFO = TIME_SLOTS.map((s) => ({
  ...s,
  worker: WORKERS.find((w) => w.timeSlotId === s.id)?.name || "",
}));

export default function BlankTemplatePage() {
  const router = useRouter();

  const handleExcelDownload = () => {
    const html = buildExcelHtml();
    const bom = "﻿"; // UTF-8 BOM
    const blob = new Blob([bom + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `청소점검_일일_백업양식.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex gap-2">
            <button
              onClick={handleExcelDownload}
              className="h-10 px-4 rounded-lg border border-ink-300 bg-white text-ink-800 text-sm font-semibold hover:bg-ink-50 inline-flex items-center gap-1.5"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              엑셀 다운로드
            </button>
            <button
              onClick={() => window.print()}
              className="h-10 px-4 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 inline-flex items-center gap-1.5"
            >
              🖨️ 인쇄
            </button>
          </div>
        </div>

        {/* 안내 (화면 전용) */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-5 text-sm text-amber-900 print:hidden">
          <b>📋 백업용 일일 점검표</b> — QR 입력이 불가능할 때 수기로 작성하는
          용도입니다. 인쇄해서 사무실에 비치해두세요.
        </div>

        {/* 제목 */}
        <header className="border-b-2 border-black pb-3 mb-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            청소점검 일일 점검표 (수기 백업)
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            서초여성가족플라자 서초센터
          </p>
        </header>

        {/* 일자/요일 입력 영역 */}
        <div className="grid grid-cols-3 gap-4 text-sm mb-5">
          <Field label="일자" />
          <Field label="요일" />
          <Field label="날씨" />
        </div>

        {/* 점검 항목 표 */}
        <table className="w-full border-collapse text-[12px] mb-4">
          <thead>
            <tr>
              <th className="border-2 border-black p-1.5 bg-ink-100 w-8">#</th>
              <th className="border-2 border-black p-1.5 bg-ink-100 text-left">
                점검 항목
              </th>
              {SLOTS_INFO.map((s) => (
                <th
                  key={s.id}
                  className="border-2 border-black p-1.5 bg-ink-100 w-20"
                >
                  <div className="font-bold text-[11px]">{s.worker}</div>
                  <div className="text-[10px] font-normal text-ink-700">
                    {s.label.replace(":00", "").replace(" ~ ", "-")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-ink-700 p-1.5 text-center font-bold text-[11px] bg-ink-50">
                  {idx + 1}
                </td>
                <td className="border border-ink-700 p-1.5">
                  <div className="flex items-baseline flex-wrap gap-1">
                    <span className="font-semibold text-[11.5px]">
                      {item.name}
                    </span>
                    {item.floors && (
                      <span className="text-[9px] font-bold text-ink-700">
                        ({item.floors})
                      </span>
                    )}
                    {item.frequency === "weekly" && (
                      <span className="text-[9px] font-bold text-amber-700">
                        주 1회
                      </span>
                    )}
                  </div>
                  {item.questions[0] && (
                    <div className="text-[10px] text-ink-600 mt-0.5 leading-tight">
                      {item.questions.join(" / ")}
                    </div>
                  )}
                </td>
                {SLOTS_INFO.map((s) => {
                  const skip = item.slots && !item.slots.includes(s.id);
                  return (
                    <td
                      key={s.id}
                      className={`border border-ink-700 p-1.5 text-center ${
                        skip ? "bg-ink-100" : ""
                      }`}
                      style={{ minHeight: "30px" }}
                    >
                      {skip ? (
                        <span className="text-ink-400 text-[10px]">해당없음</span>
                      ) : (
                        <span className="text-ink-300 text-[11px]">
                          A&nbsp;/&nbsp;B&nbsp;/&nbsp;C
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[11px] text-ink-700 mb-5">
          평가 기준: <b>A 양호</b> · <b>B 보통</b> ·{" "}
          <b className="text-rose-700">C 조치필요</b> (해당 없는 항목은
          A로 표기)
        </p>

        {/* 특이사항 */}
        <section className="mb-6">
          <h2 className="font-bold text-sm mb-2 border-b border-ink-400 pb-1">
            특이사항 / 조치필요 내용
          </h2>
          <div className="border border-ink-700 h-32 p-2 text-[11px] text-ink-400">
            (조치필요(C) 항목이 있을 경우 시간대·항목·구체 내용을 적어주세요)
          </div>
        </section>

        {/* 서명 */}
        <div className="print-signature grid grid-cols-3 gap-6 mt-8">
          {SLOTS_INFO.map((s) => (
            <div key={s.id}>
              <p className="text-xs text-ink-700 mb-7 text-center">
                {s.worker} 서명
              </p>
              <div className="border-b border-black h-1"></div>
              <p className="text-[10px] text-ink-600 mt-1 text-center">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div className="border-b border-black pb-1">
      <span className="text-xs text-ink-700 font-semibold mr-2">{label}</span>
      <span className="inline-block min-w-[60px]">&nbsp;</span>
    </div>
  );
}

// ============================================
// 엑셀 다운로드 (HTML→.xls)
// 별도 라이브러리 없이 표를 .xls 로 내보냄. Excel/한셀 모두 열림.
// ============================================
function buildExcelHtml(): string {
  const itemsRows = CHECKLIST_ITEMS.map((item, idx) => {
    const cells = SLOTS_INFO.map((s) => {
      const skip = item.slots && !item.slots.includes(s.id);
      return skip ? "해당없음" : "";
    })
      .map((v) => `<td style="border:1px solid #555;text-align:center;">${v}</td>`)
      .join("");
    const meta = [
      item.floors ? `(${item.floors})` : "",
      item.frequency === "weekly" ? "주 1회" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const desc = item.questions.join(" / ");
    return `<tr>
      <td style="border:1px solid #555;text-align:center;background:#f3f4f6;font-weight:bold;">${idx + 1}</td>
      <td style="border:1px solid #555;">
        <b>${item.name}</b>${meta ? ` <span style="color:#555;font-size:10px;">${meta}</span>` : ""}
        <br/><span style="color:#666;font-size:10px;">${desc}</span>
      </td>
      ${cells}
    </tr>`;
  }).join("");

  const slotHeaders = SLOTS_INFO.map(
    (s) =>
      `<th style="border:1px solid #555;background:#e5e7eb;padding:6px;">
        <b>${s.worker}</b><br/><small style="color:#555;">${s.label}</small>
      </th>`
  ).join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 13px; margin-top: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 4px 6px; vertical-align: middle; }
  .meta-row td { border: 1px solid #555; padding: 6px; }
</style>
</head>
<body>
  <h1>청소점검 일일 점검표 (수기 백업)</h1>
  <div>서초여성가족플라자 서초센터</div>
  <br/>
  <table>
    <tr class="meta-row">
      <td><b>일자</b></td><td>&nbsp;</td>
      <td><b>요일</b></td><td>&nbsp;</td>
      <td><b>날씨</b></td><td>&nbsp;</td>
    </tr>
  </table>
  <br/>
  <table>
    <thead>
      <tr>
        <th style="border:1px solid #555;background:#e5e7eb;width:30px;">#</th>
        <th style="border:1px solid #555;background:#e5e7eb;text-align:left;">점검 항목</th>
        ${slotHeaders}
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>
  <p style="font-size:11px;color:#444;">평가 기준: A 양호 · B 보통 · C 조치필요</p>

  <h2>특이사항 / 조치필요 내용</h2>
  <table>
    <tr><td style="border:1px solid #555;height:80px;">&nbsp;</td></tr>
  </table>

  <br/><br/>
  <table>
    <tr>
      ${SLOTS_INFO.map(
        (s) => `<td style="border-bottom:1px solid #000;text-align:center;width:33%;padding-top:32px;">
          ${s.worker} 서명<br/><small>${s.label}</small>
        </td>`
      ).join("")}
    </tr>
  </table>
</body>
</html>`;
}
