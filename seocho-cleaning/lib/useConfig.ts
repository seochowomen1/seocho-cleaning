"use client";

import { useState, useEffect } from "react";
import {
  ORG_INFO as DEFAULT_ORG,
  TIME_SLOTS as DEFAULT_SLOTS,
  WORKERS as DEFAULT_WORKERS,
  CHECKLIST_ITEMS as DEFAULT_ITEMS,
  type Worker,
  type TimeSlot,
  type ChecklistItem,
} from "./config";

const CACHE_KEY = "appConfig_v1";
const CACHE_TS_KEY = "appConfig_v1_ts";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분 — 그 이상 지나면 캐시 무시

export type AppConfig = {
  org: { name: string; department?: string };
  timeSlots: TimeSlot[];
  workers: Worker[];
  items: ChecklistItem[];
};

export const DEFAULT_CONFIG: AppConfig = {
  org: DEFAULT_ORG,
  timeSlots: DEFAULT_SLOTS,
  workers: DEFAULT_WORKERS,
  items: DEFAULT_ITEMS,
};

function readCache(): AppConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || "0", 10);
    if (!ts || Date.now() - ts > CACHE_TTL_MS) return null;
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? (JSON.parse(cached) as AppConfig) : null;
  } catch {
    return null;
  }
}

function writeCache(config: AppConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // 용량 초과 등 무시
  }
}

// 응답이 사용 가능한 모양인지 검증 (1개라도 빠지면 기본값으로 폴백)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidConfig(c: any): c is AppConfig {
  return !!(
    c &&
    c.org &&
    typeof c.org.name === "string" &&
    Array.isArray(c.timeSlots) &&
    c.timeSlots.length > 0 &&
    Array.isArray(c.workers) &&
    c.workers.length > 0 &&
    Array.isArray(c.items) &&
    c.items.length > 0
  );
}

/**
 * 운영자가 Sheets에서 편집한 점검 설정을 가져옵니다.
 * - 캐시(localStorage) 즉시 사용
 * - 백그라운드에서 /api/config 호출해 최신 값으로 업데이트
 * - 실패 시 기본값(lib/config.ts) 그대로 사용
 */
export function useConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    return readCache() || DEFAULT_CONFIG;
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && isValidConfig(json.data)) {
          setConfig(json.data);
          writeCache(json.data);
        }
      })
      .catch(() => {
        // 캐시/기본값 유지
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
