// ============================================
// 시스템 설정 (이 파일만 수정하면 점검 항목/근로자 명단 변경 가능)
// ============================================

export const ORG_INFO = {
  name: "서초여성가족플라자 서초센터",
  department: "사업경영팀",
};

// 시니어 근로자 명단 (실제 명단으로 교체)
// id는 변경하지 마세요 (데이터 추적용)
export const WORKERS: Worker[] = [
  { id: "w001", name: "근로자1" },
  { id: "w002", name: "근로자2" },
  { id: "w003", name: "근로자3" },
  // 필요한 만큼 추가하세요
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
    id: "desk",
    name: "강의용 책상",
    description: "책상이 열을 맞춰 바르게 정렬되어 있는가?",
  },
  {
    id: "chair",
    name: "강의용 의자",
    description: "의자가 책상 아래에 깔끔하게 정리되었는가?",
  },
  {
    id: "dust",
    name: "이물질·먼지",
    description: "책상·의자 위 먼지나 이물질이 제거되었는가?",
  },
  {
    id: "floor",
    name: "바닥 상태",
    description: "눈에 띄는 쓰레기나 오염이 없는가?",
  },
  {
    id: "ac_light",
    name: "냉난방·전등",
    description: "전등과 에어컨이 꺼져 있는가? (※ 마지막 타임 필수)",
  },
  {
    id: "healing_room",
    name: "힐링·마루강의실",
    description: "거울 및 바닥은 오염이 없는가?",
  },
  {
    id: "hallway",
    name: "복도·출입구",
    description: "복도 및 출입구가 정리·청결한가?",
  },
  {
    id: "trash",
    name: "쓰레기통",
    description: "쓰레기통이 비워졌는가? (가득 찬 경우 비움)",
  },
];

// 평가 등급 정의
export const GRADES: Grade[] = [
  { id: "A", label: "A 양호",  color: "green",  description: "정리·청결 양호" },
  { id: "B", label: "B 보통",  color: "amber",  description: "본인 정리 후 체크" },
  { id: "C", label: "C 조치",  color: "red",    description: "사무실 보고 필요" },
];

// ============================================
// 타입 정의
// ============================================

export type Worker = {
  id: string;
  name: string;
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
  description: string;
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

/** 현재 시각 기준 자동 시간대 감지 */
export function detectTimeSlot(now: Date = new Date()): TimeSlot {
  const hour = now.getHours();
  const matched = TIME_SLOTS.find((s) => hour >= s.startHour && hour < s.endHour);
  // 시간 외 (이른 아침 / 늦은 저녁)에는 가장 가까운 슬롯 반환
  if (matched) return matched;
  if (hour < 9) return TIME_SLOTS[0];
  return TIME_SLOTS[TIME_SLOTS.length - 1];
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
