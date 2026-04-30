import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const ADMIN_KEY = process.env.ADMIN_KEY;

export async function GET(req: NextRequest) {
  if (!APPS_SCRIPT_URL || !ADMIN_KEY) {
    return NextResponse.json(
      { success: false, error: "서버 설정 오류" },
      { status: 500 }
    );
  }

  // 관리자 키 검증 (헤더에서 받음)
  const authHeader = req.headers.get("x-admin-key");
  if (authHeader !== ADMIN_KEY) {
    return NextResponse.json(
      { success: false, error: "권한 없음" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = searchParams.get("days") || "7";

    const url = `${APPS_SCRIPT_URL}?action=stats&days=${days}&adminKey=${encodeURIComponent(
      ADMIN_KEY
    )}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Apps Script 오류: ${text.slice(0, 200)}` },
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
