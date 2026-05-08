/**
 * 시트 초기화 - Apps Script 에디터에서 한 번 실행하세요
 *
 * 1. Google Sheets 새로 만들기
 * 2. 확장 → Apps Script 열기
 * 3. 본 파일들(Code.gs, Setup.gs, Notifications.gs) 붙여넣기
 * 4. 이 파일의 setupAll() 함수 실행
 * 5. 권한 승인
 */

function setupAll() {
  setupSheets();
  setupConfigSheets();
  setupProperties();
  Logger.log("✅ 초기화 완료");
  Logger.log("이제 다음을 진행하세요:");
  Logger.log("1. 스크립트 속성에서 ADMIN_KEY, SUBMIT_SECRET, NOTIFY_EMAIL, PHOTO_FOLDER_ID 값을 입력");
  Logger.log("2. 배포 → 새 배포 → 웹 앱으로 배포 (액세스: 모든 사용자)");
  Logger.log("3. 받은 URL을 Vercel의 APPS_SCRIPT_URL 환경변수에 입력");
  Logger.log("4. Config_시설 / Config_시간대 / Config_점검자 / Config_점검항목 시트에서 점검표 내용 편집 가능");
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Submissions 시트
  let sub = ss.getSheetByName("Submissions");
  if (!sub) sub = ss.insertSheet("Submissions");
  if (sub.getLastRow() === 0) {
    sub.appendRow([
      "점검일자",     // A: date
      "시간대",       // B: timeSlotLabel
      "점검자ID",     // C: workerId
      "점검자명",     // D: workerName
      "항목ID",       // E: itemId
      "항목명",       // F: itemName
      "등급",         // G: grade
      "비고",         // H: note
      "사진URL",      // I: photoUrl
      "제출시각",     // J: submittedAt
      "제출ID",       // K: submissionId
    ]);
    sub.setFrozenRows(1);

    // 헤더 스타일링
    const header = sub.getRange(1, 1, 1, 11);
    header.setBackground("#D9E2F3").setFontWeight("bold");

    // 열 너비
    sub.setColumnWidth(1, 90);   // 점검일자
    sub.setColumnWidth(2, 110);  // 시간대
    sub.setColumnWidth(3, 70);   // 점검자ID
    sub.setColumnWidth(4, 80);   // 점검자명
    sub.setColumnWidth(5, 100);  // 항목ID
    sub.setColumnWidth(6, 130);  // 항목명
    sub.setColumnWidth(7, 50);   // 등급
    sub.setColumnWidth(8, 200);  // 비고
    sub.setColumnWidth(9, 200);  // 사진URL
    sub.setColumnWidth(10, 160); // 제출시각
    sub.setColumnWidth(11, 220); // 제출ID

    // 등급 열 조건부 서식 (A=초록, B=노랑, C=빨강)
    const gradeRange = sub.getRange("G2:G");
    const rules = sub.getConditionalFormatRules();
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("A").setBackground("#E2EFDA").setFontColor("#173404")
        .setRanges([gradeRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("B").setBackground("#FFF2CC").setFontColor("#412402")
        .setRanges([gradeRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("C").setBackground("#FCE4D6").setFontColor("#501313").setBold(true)
        .setRanges([gradeRange]).build()
    );
    sub.setConditionalFormatRules(rules);
  }

  // Log 시트
  let log = ss.getSheetByName("Log");
  if (!log) log = ss.insertSheet("Log");
  if (log.getLastRow() === 0) {
    log.appendRow(["시각", "위치", "에러", "스택"]);
    log.setFrozenRows(1);
  }

  Logger.log("시트 초기화 완료");
}

function setupProperties() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperties();

  // 기본값 설정 (값이 없을 때만)
  const defaults = {
    ADMIN_KEY: existing.ADMIN_KEY || "REPLACE_WITH_STRONG_RANDOM_STRING",
    SUBMIT_SECRET: existing.SUBMIT_SECRET || "REPLACE_WITH_ANOTHER_STRONG_RANDOM_STRING",
    NOTIFY_EMAIL: existing.NOTIFY_EMAIL || "your-email@example.com",
    PHOTO_FOLDER_ID: existing.PHOTO_FOLDER_ID || "",
    SOLAPI_API_KEY: existing.SOLAPI_API_KEY || "",
    SOLAPI_API_SECRET: existing.SOLAPI_API_SECRET || "",
    SOLAPI_SENDER: existing.SOLAPI_SENDER || "",
    SOLAPI_RECEIVER: existing.SOLAPI_RECEIVER || "",
  };

  Object.keys(defaults).forEach((key) => {
    if (!existing[key]) {
      props.setProperty(key, defaults[key]);
    }
  });

  Logger.log("스크립트 속성 초기화 완료");
  Logger.log("프로젝트 설정 → 스크립트 속성에서 실제 값으로 수정하세요:");
  Logger.log("  - ADMIN_KEY: 관리자 키 (강한 랜덤 문자열)");
  Logger.log("  - SUBMIT_SECRET: 제출 API 공유 시크릿 (Vercel SUBMIT_SECRET 와 동일)");
  Logger.log("  - NOTIFY_EMAIL: 알림 받을 이메일");
  Logger.log("  - PHOTO_FOLDER_ID: Google Drive 사진 폴더 ID (선택)");
  Logger.log("  - SOLAPI_*: 알림톡 API 정보 (선택, 카톡 알림 사용 시)");
}

/**
 * Config 시트 초기화 — 운영자가 시트에서 직접 점검 항목/점검자/시간대를 편집할 수 있게.
 * 이미 시트가 있으면 건드리지 않음 (재실행 안전).
 */
function setupConfigSheets() {
  setupConfig_Org();
  setupConfig_TimeSlots();
  setupConfig_Workers();
  setupConfig_Items();
  Logger.log("Config 시트 초기화 완료");
}

function setupConfig_Org() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Config_시설");
  if (!sheet) sheet = ss.insertSheet("Config_시설");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["키", "값", "설명"]);
    sheet.appendRow(["name", "서초여성가족플라자 서초센터", "기관명 (헤더에 표시)"]);
    sheet.appendRow(["department", "사업경영팀", "부서명 (현재 사용 안 함)"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 3).setBackground("#D9E2F3").setFontWeight("bold");
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 270);
    sheet.setColumnWidth(3, 230);
  }
}

function setupConfig_TimeSlots() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Config_시간대");
  if (!sheet) sheet = ss.insertSheet("Config_시간대");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID (변경금지)", "라벨", "시작시각(0-23)", "종료시각(0-23)"]);
    sheet.appendRow(["morning", "09:00 ~ 12:00", 9, 12]);
    sheet.appendRow(["afternoon", "12:00 ~ 15:00", 12, 15]);
    sheet.appendRow(["evening", "15:00 ~ 18:00", 15, 18]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 4).setBackground("#D9E2F3").setFontWeight("bold");
    sheet.setColumnWidths(1, 4, 130);
  }
}

function setupConfig_Workers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Config_점검자");
  if (!sheet) sheet = ss.insertSheet("Config_점검자");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID (변경금지)", "이름", "담당시간대ID"]);
    sheet.appendRow(["w001", "김성만", "morning"]);
    sheet.appendRow(["w002", "배정열", "afternoon"]);
    sheet.appendRow(["w003", "조숙임", "evening"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 3).setBackground("#D9E2F3").setFontWeight("bold");
    sheet.setColumnWidths(1, 3, 140);
  }
}

function setupConfig_Items() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Config_점검항목");
  if (!sheet) sheet = ss.insertSheet("Config_점검항목");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "순서", "ID (변경금지)", "항목명", "질문 (Alt+Enter로 줄바꿈)", "층", "주기 (weekly|빈칸)", "시간대 (콤마 구분)"
    ]);
    const rows = [
      [1, "desk_chair", "강의용 책상/의자 배열 정리", "", "4·5·6층", "", ""],
      [2, "dust", "강의용 책상/의자 이물질 및 먼지 청소", "", "", "", ""],
      [3, "floor", "강의실 내 바닥 점검", "눈에 띄는 쓰레기 및 오염물 청소", "", "", ""],
      [4, "ac_light", "빈 강의실 내 전등 및 냉난방기 OFF상태", "", "", "", ""],
      [5, "healing_room", "힐링/마루강의실 거울 및 바닥 청소", "", "7층", "", ""],
      [6, "hallway", "복도 및 강의실 출입구 눈에 띄는 쓰레기 정리", "", "", "", ""],
      [7, "recycling", "각 층 분리수거함 위 눈에 띄는 쓰레기 정리", "", "", "", ""],
      [8, "water_cup", "각 층 정수기 물컵 점검 및 채우기", "", "", "", ""],
      [9, "plants", "화분 관수 및 상태", "화분 관수는 했는가?\n잎 먼지제거 및 화분 받침대를 정리 했는가?", "", "", "morning"],
      [10, "terrace", "테라스 주변 정리", "테라스 테이블 위 먼지나 이물질이 제거되었는가?", "6층", "", "morning"],
    ];
    rows.forEach(r => sheet.appendRow(r));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setBackground("#D9E2F3").setFontWeight("bold");
    sheet.setColumnWidth(1, 60);
    sheet.setColumnWidth(2, 110);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 340);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(6, 110);
    sheet.setColumnWidth(7, 140);
    sheet.getRange("D2:D").setWrap(true).setVerticalAlignment("top");
  }
}

/**
 * 알림 테스트 - 설정 확인용
 */
function testNotification() {
  const submission = {
    date: formatDateLocal(new Date()),
    timeSlotLabel: "12:00 ~ 15:00",
    workerName: "테스트 점검자",
  };
  const cResults = [
    { itemName: "강의용 책상", note: "테스트 알림입니다", photoUrl: "" },
  ];
  sendCAlertEmail(submission, cResults);
  Logger.log("✅ 테스트 이메일 발송 완료. 받은 메일함 확인하세요.");
}
