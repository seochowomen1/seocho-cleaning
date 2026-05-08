/**
 * 청소 점검 시스템 - 메인 백엔드
 * 서초여성가족플라자 서초센터
 *
 * 주요 엔드포인트:
 *  - POST { action: "submit", payload: Submission }  → 점검 데이터 저장
 *  - GET  ?action=stats&days=N&adminKey=...          → 대시보드용 통계
 */

// ===== 시트 이름 =====
const SHEET_SUBMISSIONS = "Submissions";
const SHEET_LOG = "Log";

// ===== POST 핸들러 =====
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // 공유 시크릿 검증 (Vercel API 라우트만 알고 있는 값)
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("SUBMIT_SECRET");
    if (!expectedSecret) {
      return jsonResponse({ success: false, error: "서버 설정 오류 (SUBMIT_SECRET 미설정)" });
    }
    if (body.secret !== expectedSecret) {
      return jsonResponse({ success: false, error: "권한 없음" });
    }

    if (body.action === "submit") {
      return jsonResponse(handleSubmit(body.payload));
    }

    return jsonResponse({ success: false, error: "지원하지 않는 action" });
  } catch (err) {
    logError("doPost", err);
    return jsonResponse({ success: false, error: String(err) });
  }
}

// ===== GET 핸들러 (관리자 대시보드용) =====
function doGet(e) {
  try {
    const action = e.parameter.action;

    // config 는 시니어 페이지·관리자 양식 등에서 모두 사용 → 인증 없이 공개
    if (action === "config") {
      return jsonResponse({ success: true, data: getConfig() });
    }

    // 그 외 (stats 등)은 관리자 인증 필요
    const adminKey = e.parameter.adminKey;
    const expectedKey = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
    if (!expectedKey || adminKey !== expectedKey) {
      return jsonResponse({ success: false, error: "권한 없음" });
    }

    if (action === "stats") {
      const days = parseInt(e.parameter.days || "7", 10);
      return jsonResponse(handleStats(days));
    }

    return jsonResponse({ success: false, error: "지원하지 않는 action" });
  } catch (err) {
    logError("doGet", err);
    return jsonResponse({ success: false, error: String(err) });
  }
}

// ============================================================
// Config 시트 읽기
// 운영자가 Sheets에서 편집한 점검 항목/점검자/시간대를 그대로 반환
// ============================================================
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 시설 정보
  const orgSheet = ss.getSheetByName("Config_시설");
  const org = { name: "", department: "" };
  if (orgSheet && orgSheet.getLastRow() >= 2) {
    const orgRows = orgSheet.getRange(2, 1, orgSheet.getLastRow() - 1, 2).getValues();
    orgRows.forEach(function (row) {
      const key = String(row[0] || "").trim();
      const value = String(row[1] || "").trim();
      if (key === "name") org.name = value;
      else if (key === "department") org.department = value;
    });
  }

  // 시간대
  const tsSheet = ss.getSheetByName("Config_시간대");
  let timeSlots = [];
  if (tsSheet && tsSheet.getLastRow() >= 2) {
    const rows = tsSheet.getRange(2, 1, tsSheet.getLastRow() - 1, 4).getValues();
    timeSlots = rows
      .filter(function (r) { return r[0]; })
      .map(function (r) {
        return {
          id: String(r[0]).trim(),
          label: String(r[1] || "").trim(),
          startHour: Number(r[2]) || 0,
          endHour: Number(r[3]) || 0,
        };
      });
  }

  // 점검자
  const wSheet = ss.getSheetByName("Config_점검자");
  let workers = [];
  if (wSheet && wSheet.getLastRow() >= 2) {
    const rows = wSheet.getRange(2, 1, wSheet.getLastRow() - 1, 3).getValues();
    workers = rows
      .filter(function (r) { return r[0]; })
      .map(function (r) {
        return {
          id: String(r[0]).trim(),
          name: String(r[1] || "").trim(),
          timeSlotId: String(r[2] || "").trim(),
        };
      });
  }

  // 점검 항목
  const iSheet = ss.getSheetByName("Config_점검항목");
  let items = [];
  if (iSheet && iSheet.getLastRow() >= 2) {
    const rows = iSheet.getRange(2, 1, iSheet.getLastRow() - 1, 7).getValues();
    items = rows
      .filter(function (r) { return r[1]; }) // ID 있는 행만
      .sort(function (a, b) { return (Number(a[0]) || 0) - (Number(b[0]) || 0); })
      .map(function (r) {
        const item = {
          id: String(r[1]).trim(),
          name: String(r[2] || "").trim(),
          questions: String(r[3] || "")
            .split(/\r?\n/)
            .map(function (s) { return s.trim(); })
            .filter(Boolean),
        };
        const floors = String(r[4] || "").trim();
        if (floors) item.floors = floors;
        const frequency = String(r[5] || "").trim();
        if (frequency) item.frequency = frequency;
        const slotsStr = String(r[6] || "").trim();
        if (slotsStr) {
          item.slots = slotsStr
            .split(",")
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
        }
        return item;
      });
  }

  return { org: org, timeSlots: timeSlots, workers: workers, items: items };
}

// ============================================================
// 제출 처리
// ============================================================
function handleSubmit(submission) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  if (!sheet) throw new Error("Submissions 시트가 없습니다. setupSheets()를 먼저 실행하세요.");

  if (!submission.results || submission.results.length === 0) {
    return { success: false, error: "results 가 비어 있습니다." };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    // 멱등성: 동일 submissionId 가 이미 저장돼 있으면 바로 성공 응답 (중복 제출/재시도 방지)
    const submissionId = String(submission.submissionId || "");
    if (submissionId && isSubmissionIdRecorded(sheet, submissionId)) {
      return { success: true, duplicated: true, rowsAdded: 0, xCount: 0 };
    }

    const now = new Date();
    const submittedAt = submission.submittedAt || now.toISOString();

    // 사진 업로드 (있는 경우만)
    const photoFolderId = PropertiesService.getScriptProperties().getProperty("PHOTO_FOLDER_ID");

    // 결과별로 행 추가
    const rows = [];
    const xResults = []; // 알림용

    submission.results.forEach((r) => {
      const itemName = r.itemName || getItemName(r.itemId);
      let photoUrl = "";

      if (r.grade === "X" && r.photoBase64 && photoFolderId) {
        try {
          photoUrl = uploadPhoto(
            r.photoBase64,
            photoFolderId,
            `${submission.date}_${submission.workerName}_${r.itemId}`
          );
        } catch (err) {
          logError("uploadPhoto", err);
        }
      }

      rows.push([
        submission.date,
        submission.timeSlotLabel,
        submission.workerId,
        submission.workerName,
        r.itemId,
        itemName,
        r.grade,
        r.note || "",
        photoUrl,
        submittedAt,
        submissionId,
      ]);

      if (r.grade === "X") {
        xResults.push({
          itemName,
          note: r.note || "",
          photoUrl,
        });
      }
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

    // X 등급(불량) 발생 시 알림
    if (xResults.length > 0) {
      try {
        sendXAlertEmail(submission, xResults);
      } catch (err) {
        logError("sendXAlertEmail", err);
      }
      // 알림톡 (선택, 솔라피 등 외부 API 연동)
      try {
        sendXAlertKakao(submission, xResults);
      } catch (err) {
        logError("sendXAlertKakao", err);
      }
    }

    return { success: true, rowsAdded: rows.length, xCount: xResults.length };
  } finally {
    lock.releaseLock();
  }
}

// 동일 submissionId 가 이미 시트에 저장되어 있는지 확인 (K열 = 제출ID)
function isSubmissionIdRecorded(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const ids = sheet.getRange(2, 11, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === submissionId) return true;
  }
  return false;
}

// ============================================================
// 사진 업로드 (base64 → Drive)
// ============================================================
function uploadPhoto(base64DataUrl, folderId, baseName) {
  // "data:image/jpeg;base64,..." 형식 파싱
  const match = base64DataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) throw new Error("잘못된 base64 형식");

  const mime = match[1];
  const ext = mime.split("/")[1] || "jpg";
  const data = Utilities.base64Decode(match[2]);
  const blob = Utilities.newBlob(data, mime, `${baseName}_${Date.now()}.${ext}`);

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  // 링크가 있는 사람 누구나 볼 수 있게 (관리자만 알 수 있는 URL)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// ============================================================
// 통계 조회 (대시보드용)
// ============================================================
function handleStats(days) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUBMISSIONS);
  if (!sheet) return { success: true, data: emptyStats() };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, data: emptyStats() };

  const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  // 기간 필터링
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDateLocal(cutoff);

  const filtered = values.filter((row) => row[0] && String(row[0]) >= cutoffStr);

  // submissionId 로 묶기 (없는 옛날 행은 date|timeSlot|workerId 로 fallback)
  const grouped = {};
  filtered.forEach((row) => {
    const [date, timeSlotLabel, workerId, workerName, itemId, itemName, grade, note, photoUrl, submittedAt, submissionId] = row;
    const key = submissionId
      ? String(submissionId)
      : `${date}|${timeSlotLabel}|${workerId}`;
    if (!grouped[key]) {
      grouped[key] = {
        date,
        timeSlotLabel,
        workerId,
        workerName,
        submittedAt,
        results: [],
        hasX: false,
      };
    }
    grouped[key].results.push({ itemId, itemName, grade, note, photoUrl });
    if (grade === "X") grouped[key].hasX = true;
  });

  const submissions = Object.values(grouped).sort((a, b) => {
    return String(b.submittedAt).localeCompare(String(a.submittedAt));
  });

  // 통계 계산
  const totalSubmissions = submissions.length;
  const xCount = filtered.filter((row) => row[6] === "X").length;
  const expectedSubmissions = days * 3; // 하루 3타임 가정 (필요 시 조정)
  const completionRate =
    expectedSubmissions > 0
      ? Math.round((totalSubmissions / expectedSubmissions) * 100)
      : 0;

  return {
    success: true,
    data: {
      totalSubmissions,
      completionRate: Math.min(completionRate, 100),
      xCount,
      submissions,
    },
  };
}

function emptyStats() {
  return {
    totalSubmissions: 0,
    completionRate: 0,
    xCount: 0,
    submissions: [],
  };
}

// ============================================================
// 헬퍼
// ============================================================
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// 항상 한국 표준시(KST) 기준 날짜 문자열을 반환 (GAS 프로젝트 타임존 영향 제거)
function formatDateLocal(d) {
  return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd");
}

function logError(where, err) {
  console.error(`[${where}]`, err);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
    if (sheet) {
      sheet.appendRow([new Date(), where, String(err), err.stack || ""]);
    }
  } catch (_) {
    // 로그 시트 자체가 없으면 무시
  }
}

// 클라이언트가 itemName 을 함께 보내지 않은 경우의 fallback (구버전 호환)
function getItemName(itemId) {
  const map = {
    desk_chair: "강의용 책상/의자 배열 정리",
    dust: "강의용 책상/의자 이물질 및 먼지 청소",
    floor: "강의실 내 바닥 점검",
    ac_light: "빈 강의실 내 전등 및 냉난방기 OFF상태",
    healing_room: "힐링/마루강의실 거울 및 바닥 청소",
    hallway: "복도 및 강의실 출입구 눈에 띄는 쓰레기 정리",
    recycling: "각 층 분리수거함 위 눈에 띄는 쓰레기 정리",
    water_cup: "각 층 정수기 물컵 점검 및 채우기",
    plants: "화분 관수 및 상태",
    terrace: "테라스 주변 정리",
  };
  return map[itemId] || itemId;
}
