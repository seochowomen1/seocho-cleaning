import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json(
      { success: false, error: "서버 설정 오류 (APPS_SCRIPT_URL 미설정)" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    // Apps Script Web App으로 전달
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", payload: body }),
      // Apps Script는 첫 호출이 느릴 수 있어 타임아웃 여유
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Apps Script 응답 오류 (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
