// ============================================
// 시스템 설정 (이 파일만 수정하면 점검 항목/근로자 명단 변경 가능)
// ============================================

export const ORG_INFO = {
  name: "서초여성가족플라자 서초센터",
  department: "사업경영팀",
};

// 시니어 근로자 명단 (시간대별 담당자)
// id는 변경하지 마세요 (데이터 추적용)
export const WORKERS: Worker[] = [
  { id: "w001", name: "김성만", timeSlotId: "morning" },
  { id: "w002", name: "배정열", timeSlotId: "afternoon" },
  { id: "w003", name: "조숙임", timeSlotId: "evening" },
];

// 시간대 정의
export const TIME_SLOTS: TimeSlot[] = [
  { id: "morning",   label: "09:00 ~ 12:00", startHour: 9,  endHour: 12 },
  { id: "afternoon", label: "12:00 ~ 15:00", startHour: 12, endHour: 15 },
  { id: "evening",   label: "15:00 ~ 18:00", startHour: 15, endHour: 18 },
];

// 점검 항목 정의
export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "desk_chair",
    name: "강의용 책상/의자 정리",
    floors: "4·5·6층",
    questions: [
      "책상은 열을 맞추고 의자는 깔끔하게 정리되었는가?",
      "강사 테이블에 쓰레기는 없는가?",
    ],
  },
  {
    id: "dust",
    name: "이물질·먼지",
    questions: ["책상·의자 위 먼지나 이물질이 제거되었는가?"],
  },
  {
    id: "floor",
    name: "바닥 상태",
    questions: ["눈에 띄는 쓰레기나 오염이 없는가?"],
  },
  {
    id: "ac_light",
    name: "냉난방·전등",
    questions: ["빈 강의실의 전등과 냉난방이 꺼져 있는가?"],
  },
  {
    id: "healing_room",
    name: "힐링·마루강의실",
    floors: "7층",
    questions: ["거울 및 바닥은 오염이 없는가?"],
  },
  {
    id: "hallway",
    name: "복도·출입구",
    questions: ["복도 및 출입구의 이물질이 없는가?"],
  },
  {
    id: "recycling",
    name: "각층 분리수거함",
    questions: ["분리수거함 위 쓰레기를 정리 했는가?"],
  },
  {
    id: "water_cup",
    name: "정수기 물컵",
    questions: ["각 층 정수기 물컵이 채워져 있는가?"],
  },
  {
    id: "plants",
    name: "화분 관수 및 상태",
    frequency: "weekly",
    slots: ["morning"], // 09:00~12:00 시간대만
    questions: [
      "화분 관수는 했는가?",
      "잎 먼지제거 및 화분 받침대를 정리 했는가?",
    ],
  },
  {
    id: "terrace",
    name: "테라스 주변 정리",
    floors: "6층",
    questions: ["테라스 테이블 위 먼지나 이물질이 제거되었는가?"],
  },
];

// 평가 등급 정의
export const GRADES: Grade[] = [
  { id: "A", label: "양호",     color: "green",  description: "정리·청결 양호" },
  { id: "B", label: "보통",     color: "amber",  description: "본인 정리 후 체크" },
  { id: "C", label: "조치필요", color: "red",    description: "사무실 보고 필요" },
];

// ============================================
// 타입 정의
// ============================================

export type Worker = {
  id: string;
  name: string;
  /** 이 근로자가 기본 담당하는 시간대 */
  timeSlotId: TimeSlot["id"];
};

export type TimeSlot = {
  id: "morning" | "afternoon" | "evening";
  label: string;
  startHour: number;
  endHour: number;
};

export type ChecklistItem = {
  id: string;
  name: string;
  /** 1개 이상의 질문 (UI에서 bullet 리스트로 표시) */
  questions: string[];
  /** "4·5·6층" / "7층" 등 적용 층 표기 (없으면 표시 안 함) */
  floors?: string;
  /** 주기적 점검 (현재는 주 1회만 지원) */
  frequency?: "weekly";
  /** 이 항목이 표시되는 시간대 (없으면 모든 시간대) */
  slots?: TimeSlot["id"][];
};

export type GradeId = "A" | "B" | "C";

export type Grade = {
  id: GradeId;
  label: string;
  color: "green" | "amber" | "red";
  description: string;
};

export type CheckResult = {
  itemId: string;
  itemName: string; // 서버 매핑 의존 제거를 위해 클라이언트에서 함께 전송
  grade: GradeId;
  note?: string;
  photoBase64?: string; // C 등급일 때만
};

export type Submission = {
  submissionId: string; // 클라이언트가 발급하는 UUID (중복 제출 방지)
  workerId: string;
  workerName: string;
  timeSlotId: TimeSlot["id"];
  timeSlotLabel: string;
  date: string;       // YYYY-MM-DD
  submittedAt: string; // ISO timestamp
  results: CheckResult[];
};

// ============================================
// 헬퍼 함수
// ============================================

/** 현재 시각 기준 자동 시간대 감지 (slots 배열을 함수 인자로 받음 — 동적 config 지원) */
export function detectTimeSlot(
  now: Date = new Date(),
  slots: TimeSlot[] = TIME_SLOTS
): TimeSlot {
  const hour = now.getHours();
  const matched = slots.find((s) => hour >= s.startHour && hour < s.endHour);
  if (matched) return matched;
  // 시간 외 (이른 아침 / 늦은 저녁)에는 가장 가까운 슬롯 반환
  if (hour < (slots[0]?.startHour ?? 9)) return slots[0];
  return slots[slots.length - 1];
}

/** YYYY-MM-DD 형식으로 변환 */
export function formatDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 한국어 요일 */
export function getKoreanDay(d: Date = new Date()): string {
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
}
