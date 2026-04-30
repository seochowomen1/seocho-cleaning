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
  setupProperties();
  Logger.log("✅ 초기화 완료");
  Logger.log("이제 다음을 진행하세요:");
  Logger.log("1. 스크립트 속성에서 ADMIN_KEY, NOTIFY_EMAIL, PHOTO_FOLDER_ID 값을 입력");
  Logger.log("2. 배포 → 새 배포 → 웹 앱으로 배포 (액세스: 모든 사용자)");
  Logger.log("3. 받은 URL을 Vercel의 APPS_SCRIPT_URL 환경변수에 입력");
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
