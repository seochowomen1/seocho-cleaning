/**
 * 알림 발송 - X 등급(불량) 발생 시
 * 이메일은 즉시 사용 가능, 알림톡은 솔라피 API 키 등록 시 동작
 */

// ============================================================
// 이메일 알림 (Apps Script 기본 기능, 무료)
// ============================================================
function sendXAlertEmail(submission, xResults) {
  const recipient = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (!recipient || recipient === "your-email@example.com") {
    Logger.log("⚠ NOTIFY_EMAIL 미설정");
    return;
  }

  const subject = `[청소점검] 불량 발생 - ${submission.date} ${submission.timeSlotLabel}`;

  let body = `청소 점검에서 조치가 필요한 항목이 발견되었습니다.\n\n`;
  body += `▣ 점검 정보\n`;
  body += `  · 일자: ${submission.date}\n`;
  body += `  · 시간대: ${submission.timeSlotLabel}\n`;
  body += `  · 점검자: ${submission.workerName}\n\n`;
  body += `▣ 불량 항목 (${xResults.length}건)\n`;

  xResults.forEach((c, i) => {
    body += `\n  ${i + 1}. ${c.itemName}\n`;
    if (c.note) body += `     특이사항: ${c.note}\n`;
    if (c.photoUrl) body += `     사진: ${c.photoUrl}\n`;
  });

  body += `\n────────────────────────\n`;
  body += `서초여성가족플라자 서초센터\n`;
  body += `청소 점검 시스템 자동 발송\n`;

  // HTML 버전
  let htmlBody = `<div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px;">`;
  htmlBody += `<h2 style="color: #c92a2a; border-bottom: 2px solid #c92a2a; padding-bottom: 8px;">청소 점검 - 불량 항목</h2>`;
  htmlBody += `<table style="border-collapse: collapse; margin: 16px 0;">`;
  htmlBody += `<tr><td style="padding: 6px 12px; color: #666;">일자</td><td style="padding: 6px 12px;"><b>${submission.date}</b></td></tr>`;
  htmlBody += `<tr><td style="padding: 6px 12px; color: #666;">시간대</td><td style="padding: 6px 12px;"><b>${submission.timeSlotLabel}</b></td></tr>`;
  htmlBody += `<tr><td style="padding: 6px 12px; color: #666;">점검자</td><td style="padding: 6px 12px;"><b>${submission.workerName}</b></td></tr>`;
  htmlBody += `</table>`;
  htmlBody += `<h3 style="margin-top: 24px;">불량 항목 (${xResults.length}건)</h3>`;

  xResults.forEach((c, i) => {
    htmlBody += `<div style="background: #fff5f5; border-left: 4px solid #e24b4a; padding: 12px 16px; margin-bottom: 8px;">`;
    htmlBody += `<div style="font-weight: bold; margin-bottom: 4px;">${i + 1}. ${escapeHtml(c.itemName)}</div>`;
    if (c.note) htmlBody += `<div style="color: #555; margin-bottom: 4px;">📝 ${escapeHtml(c.note)}</div>`;
    if (c.photoUrl) htmlBody += `<div><a href="${c.photoUrl}" style="color: #1971c2;">📷 첨부 사진 보기</a></div>`;
    htmlBody += `</div>`;
  });

  htmlBody += `<hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">`;
  htmlBody += `<p style="font-size: 12px; color: #999;">서초여성가족플라자 서초센터 · 청소 점검 시스템 자동 발송</p>`;
  htmlBody += `</div>`;

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
  });

  Logger.log(`이메일 발송 완료: ${recipient}`);
}

// ============================================================
// 알림톡 (선택, 솔라피 API)
// ============================================================
function sendXAlertKakao(submission, xResults) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("SOLAPI_API_KEY");
  const apiSecret = props.getProperty("SOLAPI_API_SECRET");
  const sender = props.getProperty("SOLAPI_SENDER");
  const receiver = props.getProperty("SOLAPI_RECEIVER");

  // 미설정 시 조용히 스킵 (이메일 알림으로 대체됨)
  if (!apiKey || !apiSecret || !sender || !receiver) {
    return;
  }

  // 솔라피 SMS 발송 예시 (알림톡은 별도 템플릿 등록 필요)
  // 여기서는 가장 간단한 SMS 형태로 구현
  try {
    const text = `[청소점검 불량]\n${submission.date} ${submission.timeSlotLabel}\n점검자: ${submission.workerName}\n\n${xResults.map(c => `· ${c.itemName}${c.note ? ` - ${c.note}` : ""}`).join("\n")}`;

    const date = new Date().toISOString();
    const salt = Utilities.getUuid().replace(/-/g, "").substring(0, 16);
    const signatureSrc = date + salt;

    const sigBytes = Utilities.computeHmacSha256Signature(signatureSrc, apiSecret);
    const signature = sigBytes.map(b => {
      const v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    }).join("");

    const auth = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

    const payload = {
      message: {
        to: receiver,
        from: sender,
        text: text.substring(0, 90), // SMS 최대 90바이트 (한글 기준)
      },
    };

    UrlFetchApp.fetch("https://api.solapi.com/messages/v4/send", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: auth },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    Logger.log("알림톡(SMS) 발송 시도 완료");
  } catch (err) {
    logError("sendXAlertKakao", err);
  }
}

// ============================================================
// 헬퍼
// ============================================================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
