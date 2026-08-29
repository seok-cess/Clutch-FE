# 프론트엔드 폴더 구조

## 목적

사용자 화면과 관리자 화면을 분리하면서 기존 CLUTCH 컴포넌트를 단계적으로 정리한다. 기능을 한 번에 재작성하지 않고 이번 작업에서 수정하는 영역부터 새 구조를 적용한다.

## 목표 구조

```text
src/
├── app/
│   ├── App.jsx
│   ├── AppDataProvider.jsx
│   └── routes.jsx
├── layouts/
│   ├── UserLayout.jsx
│   └── AdminLayout.jsx
├── pages/
│   ├── user/
│   └── admin/
├── features/
│   ├── live/
│   ├── schedule/
│   ├── standings/
│   ├── betting/
│   ├── rewards/
│   ├── coupon/
│   └── admin/
├── shared/
│   ├── components/
│   ├── styles/
│   └── utils/
├── api/
├── components/
├── assets/
├── preview/
└── main.jsx
```

`src/components`는 기존 메인 화면, 공개 진단 화면과 이번 작업에서 이동하지 않는 기존 컴포넌트를 위한 과도기 디렉터리다. 새 컴포넌트를 이곳에 추가하지 않는다.

## 계층 책임

### `src/app`

- React 애플리케이션 진입과 라우팅을 구성한다.
- 일정, 순위와 라이브 데이터처럼 여러 페이지가 공유하는 조회 상태를 관리한다.
- 도메인별 화면 마크업을 직접 작성하지 않는다.

### `src/layouts`

- `UserLayout`은 상단 메뉴와 사용자 전환 영역을 제공한다.
- `AdminLayout`은 왼쪽 사이드바와 관리자 작업 영역을 제공한다.
- 레이아웃은 페이지의 세부 데이터를 해석하지 않는다.

### `src/pages`

- URL과 화면을 일대일로 연결한다.
- 페이지 제목, URL 파라미터와 기능 컴포넌트의 조립을 담당한다.
- 반복되는 세부 UI나 직접적인 HTTP 호출을 두지 않는다.

### `src/features`

- 라이브, 일정, 순위, 배팅, 리워드와 쿠폰 같은 도메인별 UI를 둔다.
- 해당 기능 안에서만 사용하는 상태, 상수와 표시 변환을 함께 둔다.
- 다른 기능에서 재사용되는 순수 UI는 `shared`로 올린다.

### `src/shared`

- 도메인에 의존하지 않는 버튼, 상태 배지, 빈 상태, 오류 상태와 유틸리티를 둔다.
- 공통 디자인 토큰과 사용자·관리자 앱 셸 스타일을 관리한다.
- API 응답 필드나 LCK 도메인 용어에 의존하지 않는다.

### `src/api`

- `client.js`는 JSON 처리, 사용자·관리자 헤더와 오류 변환을 담당한다.
- 일정, 경기, 배팅, 리워드, 쿠폰과 관리자 API를 도메인 파일로 나눈다.
- 기존 컴포넌트와의 호환이 필요한 동안 `src/api.js`는 재내보내기 파일로 유지한다.

## 라우팅

### 사용자

| URL | 화면 |
|---|---|
| `/` | 기존 메인 화면 |
| `/live` | 라이브 경기 |
| `/schedule` | 경기 일정과 결과 |
| `/matches/:matchId` | 세트별 경기 기록 |
| `/standings` | 리그 순위 |
| `/rewards` | 포인트, 배팅과 보유 쿠폰 |
| `/diagnostics` | 기존 공개 진단 화면 |

### 관리자

| URL | 화면 |
|---|---|
| `/admin` | 운영 요약 |
| `/admin/source-control` | 라이브 데이터 소스 전환 |
| `/admin/coupon-events` | 쿠폰 이벤트 목록 |
| `/admin/coupon-events/new` | 쿠폰 이벤트 생성 |
| `/admin/coupon-events/:couponEventId` | 쿠폰 이벤트 상세와 수정 |
| `/admin/coupon-events/:couponEventId/edit` | 쿠폰 이벤트 수정 |
| `/admin/coupons` | 발급 쿠폰 취소 |
| `/admin/coupon-types` | 쿠폰 종류 등록, 수정과 상태 관리 |
| `/admin/coupon-claims` | 쿠폰 발급 요청과 실제 발급 결과 조회 |
| `/admin/backfill` | 경기 데이터 백필 |

## 보호 범위

- `src/components/MainScreen.jsx`와 `src/mainScreen.css`의 메인 화면 표현을 이번 작업에서 재설계하지 않는다.
- `src/components/DebugPanel.jsx`의 마크업, 동작과 공개 메뉴 노출을 변경하지 않는다.
- 라우팅 적용으로 위 화면을 감싸는 앱 셸은 바뀔 수 있지만 화면 자체는 기존 컴포넌트를 그대로 사용한다.

## 이동 원칙

1. 이번 작업에서 직접 수정하는 기능부터 `pages`, `features`, `api`로 옮긴다.
2. 파일 이동만을 위한 대규모 변경을 만들지 않는다.
3. 기존 import 경로가 필요한 동안 호환 재내보내기를 둔다.
4. 새 기능은 과도기 `src/components`가 아니라 승인된 새 계층에 작성한다.
5. 구조 변경 시 이 문서와 `AGENTS.md`를 함께 확인한다.
