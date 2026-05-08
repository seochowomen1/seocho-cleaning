import { NextResponse } from "next/server";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

// 60초 단위로 갱신 (실제 운영자가 Sheet 편집한 뒤 1분 내 반영)
export const revalidate = 60;

export async function GET() {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json(
      { success: false, error: "APPS_SCRIPT_URL 미설정" },
      { status: 500 }
    );
  }

  try {
    const url = `${APPS_SCRIPT_URL}?action=config`;
    const res = await fetch(url, {
      method: "GET",
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          success: false,
          error: `Apps Script 오류 (${res.status}): ${text.slice(0, 200)}`,
        },
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
