# 청소 점검 시스템

서초여성가족플라자 서초센터 · 시니어 근로자용 청소 점검 디지털 시스템

## 시스템 구성

```
[시니어 근로자 핸드폰]
       ↓ QR 스캔
[Vercel (Next.js)]   ← 사무실에 부착된 QR 1개로 접속
       ↓ POST
[Google Apps Script Web App]
       ↓
[Google Sheets]   ← 점검 기록 저장
[Google Drive]    ← C 등급 사진 저장
[Email/알림톡]    ← C 등급 발생 시 자동 발송
```

## 디렉토리 구조

```
seocho-cleaning/
├── app/                       Next.js App Router
│   ├── page.tsx               시니어 근로자용 점검 페이지
│   ├── admin/page.tsx         관리자 대시보드
│   ├── api/submit/route.ts    제출 API
│   └── api/stats/route.ts     통계 API
├── components/
│   └── CheckItem.tsx          점검 항목 컴포넌트
├── lib/
│   └── config.ts              ★ 근로자 명단/점검 항목 설정
├── apps-script/               Google Apps Script 백엔드
│   ├── Code.gs                메인 로직
│   ├── Setup.gs               시트 초기화
│   └── Notifications.gs       이메일/알림톡 발송
├── package.json
└── .env.example
```

---

## 배포 가이드

### 1단계 · Google Sheets + Apps Script 백엔드

**1-1. Sheets 만들기**
1. https://sheets.google.com 에서 새 스프레드시트 생성
2. 이름: `청소점검_데이터` (자유)

**1-2. Apps Script 코드 입력**
1. Sheets 메뉴: `확장` → `Apps Script` 클릭
2. 기본 `Code.gs` 내용을 비우고, `apps-script/Code.gs` 내용 복사 → 붙여넣기
3. `+` 버튼으로 새 파일 2개 추가:
   - `Setup.gs` (이름 그대로)
   - `Notifications.gs`
4. 각각 본 폴더의 동명 파일 내용을 복사 → 붙여넣기
5. 저장 (Ctrl+S)

**1-3. 사진 폴더 생성 (선택)**
1. Google Drive에서 새 폴더 생성 (예: `청소점검_사진`)
2. 폴더 URL에서 ID 추출
   - URL: `https://drive.google.com/drive/folders/`**`1ABC...XYZ`**
   - 굵은 부분이 폴더 ID

**1-4. 초기화 실행**
1. Apps Script 에디터에서 함수 선택 드롭다운 → `setupAll` 선택
2. ▶ 실행 버튼 클릭
3. 권한 승인 안내 → 본인 Google 계정으로 승인 (Sheets, Drive, Mail 권한)
4. 콘솔(`보기` → `로그`)에서 "✅ 초기화 완료" 확인

**1-5. 스크립트 속성 설정**
1. Apps Script 좌측 메뉴: `프로젝트 설정` (톱니바퀴 아이콘) 클릭
2. 하단 `스크립트 속성` 섹션에서 다음 값 입력:

| 속성 이름 | 값 | 비고 |
|---|---|---|
| `ADMIN_KEY` | 강한 랜덤 문자열 | 관리자 대시보드 접근용 (예: `mySecretKey_2026!@#`) |
| `NOTIFY_EMAIL` | 알림 받을 이메일 | C 등급 발생 시 이 주소로 발송 |
| `PHOTO_FOLDER_ID` | 위에서 만든 폴더 ID | 사진 첨부 사용 시 |
| `SOLAPI_API_KEY` | (비워두기) | 알림톡 사용 시에만 |
| `SOLAPI_API_SECRET` | (비워두기) | 알림톡 사용 시에만 |
| `SOLAPI_SENDER` | (비워두기) | 알림톡 발신번호 |
| `SOLAPI_RECEIVER` | (비워두기) | 알림톡 수신번호 |

**1-6. 알림 테스트**
1. 함수 드롭다운 → `testNotification` 선택 → ▶ 실행
2. `NOTIFY_EMAIL`로 설정한 메일함 확인 → 테스트 메일 도착 확인

**1-7. 웹 앱으로 배포**
1. 우측 상단 `배포` → `새 배포`
2. 톱니바퀴 → `웹 앱` 선택
3. 설정:
   - 설명: `청소점검 v1`
   - 다음 사용자로 실행: `나`
   - 액세스 권한: **`모든 사용자`** (인증 없이 제출 가능해야 함)
4. `배포` 버튼 → 권한 재승인
5. **웹 앱 URL을 복사** (예: `https://script.google.com/macros/s/AKfy.../exec`)

---

### 2단계 · 프론트엔드 설정

**2-1. 근로자 명단 입력**

`lib/config.ts` 파일을 열어서 `WORKERS` 배열을 실제 명단으로 교체:

```typescript
export const WORKERS: Worker[] = [
  { id: "w001", name: "홍길동" },
  { id: "w002", name: "김영희" },
  // 실제 시니어 근로자 분들 이름으로
];
```

> ⚠ `id`는 절대 변경하지 마세요. 데이터 추적용 식별자입니다.

**2-2. 점검 항목 수정 (필요 시)**

같은 파일의 `CHECKLIST_ITEMS`에서 항목 추가/수정 가능.

> ⚠ 항목 ID 변경 시 `apps-script/Code.gs`의 `getItemName()` 함수도 같이 수정해야 합니다.

**2-3. 환경 변수 작성**

프로젝트 루트에 `.env.local` 파일 생성:

```bash
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfy.../exec
ADMIN_KEY=mySecretKey_2026!@#
```

> `APPS_SCRIPT_URL`: 1-7단계에서 복사한 URL
> `ADMIN_KEY`: 1-5단계의 ADMIN_KEY와 **반드시 동일하게**

**2-4. 로컬 테스트 (선택)**

```bash
npm install
npm run dev
```

http://localhost:3000 에서 입력 페이지 테스트
http://localhost:3000/admin 에서 대시보드 테스트

---

### 3단계 · Vercel 배포

**3-1. GitHub에 푸시**

```bash
git init
git add .
git commit -m "초기 커밋"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/seocho-cleaning.git
git push -u origin main
```

**3-2. Vercel에서 import**

1. https://vercel.com 접속 → `Add New` → `Project`
2. GitHub 저장소 선택 → `Import`
3. **환경 변수** 섹션에 추가:
   - `APPS_SCRIPT_URL`: (위에서 복사한 Apps Script URL)
   - `ADMIN_KEY`: (위에서 정한 관리자 키)
4. `Deploy` 클릭

**3-3. 도메인 확인**

배포 완료 후 받은 URL (예: `https://seocho-cleaning.vercel.app`)이 점검 페이지 주소입니다.

---

### 4단계 · QR 코드 부착

1. https://qr-code-generator.com 등에서 QR 생성
2. 입력할 URL: `https://seocho-cleaning.vercel.app`
3. 다운로드 → A4에 크게 출력 (가로 10cm 이상 권장)
4. 코팅 또는 아크릴 액자에 넣어 **사무실 잘 보이는 곳**에 부착
5. QR 옆에 안내문 붙이기:
   ```
   📋 청소 점검
   QR 스캔 → 본인 시간대 칸 자동 표시
   소요시간 1~2분
   ```

---

## 운영 가이드

### 시니어 근로자 사용법
1. 사무실 게시된 QR을 핸드폰 카메라로 스캔
2. 자동 감지된 시간대 확인 (다르면 펼침 메뉴에서 변경 가능)
3. 본인 이름 선택
4. 8개 항목 각각 A·B·C 선택
5. C 선택 시: 특이사항 입력 + (선택) 사진 첨부
6. `제출하기` 버튼

### 관리자 사용법
- **빠른 확인**: Google Sheets `Submissions` 시트 직접 열람
- **대시보드**: `https://[배포URL]/admin` → 관리자 키 입력
- **C 등급 발생 시**: 자동으로 이메일 도착 (즉시 확인 가능)

### 자주 묻는 것

**Q. 시니어 근로자 명단이 바뀌면?**
- `lib/config.ts`의 `WORKERS` 수정 → GitHub에 push → Vercel 자동 재배포
- 추가는 안전, 삭제 시 기존 데이터의 workerId는 그대로 시트에 남음

**Q. 점검 시간대를 바꾸려면?**
- `lib/config.ts`의 `TIME_SLOTS` 수정 후 push
- 자동 감지 로직도 같이 동작함

**Q. 알림톡(카톡)을 추가하고 싶다면?**
1. https://solapi.com 가입 → 발신번호 등록
2. API 키 발급
3. Apps Script 스크립트 속성에 `SOLAPI_*` 4개 입력
4. 자동으로 동작 시작 (코드 수정 불필요)

**Q. 사진은 어디에 저장되나요?**
- 1-3단계에서 만든 Google Drive 폴더에 저장
- 시트 `사진URL` 열에 링크 기록
- 관리자 대시보드에서도 사진 링크 클릭 가능

---

## 비용

- **Vercel**: Hobby 플랜 무료 (개인/소규모 비상업적 사용)
- **Google Apps Script**: 무료 (일일 이메일 100건/Drive 사용량 제한 내)
- **Google Sheets/Drive**: 무료 (15GB 한도 내)
- **알림톡(솔라피)**: 선택, 사용 시 건당 약 8~12원

총 운영비: **0원** (이메일 알림 기준)

---

## 라이선스

서초여성가족플라자 서초센터 내부 사용 목적
