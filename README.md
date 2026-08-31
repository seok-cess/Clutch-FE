# CLUTCH

> 대규모 트래픽에서도 재고와 사용자별 발급 정합성을 보장하는 LoL Esports 연계 선착순 쿠폰 시스템

![CLUTCH 로고](docs/assets/clutch-logo.png)

## Frontend

> LCK 실시간 경기 정보와 시청 포인트, 세트 승리 배팅, 쿠폰 참여를 하나의 흐름으로 제공하는 웹 애플리케이션입니다.

![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=20232A)
![Vite 5](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router 7](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=20232A)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![Fetch API](https://img.shields.io/badge/Fetch_API-000000?style=flat-square&logo=mdnwebdocs&logoColor=white)
![Riot Data Dragon](https://img.shields.io/badge/Riot_Data_Dragon-D32936?style=flat-square&logo=riotgames&logoColor=white)
![Node.js and npm](https://img.shields.io/badge/Node.js_%2F_npm-339933?style=flat-square&logo=nodedotjs&logoColor=white)

## 목차

1. [소개](#소개)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [화면과 경로](#화면과-경로)
5. [실행 방법](#실행-방법)
   - [사전 준비](#사전-준비)
   - [백엔드 실행](#1-백엔드-실행)
   - [프론트엔드 실행](#2-프론트엔드-실행)
   - [프로덕션 빌드 확인](#프로덕션-빌드-확인)
6. [디렉터리 구조](#디렉터리-구조)
7. [문제 해결](#문제-해결)
8. [스크립트](#스크립트)
9. [개발 규칙](#개발-규칙)

## 소개

CLUTCH는 LCK 경기의 라이브 현황, 일정, 순위와 세트별 기록을 보여 주고, 경기 맥락 안에서 포인트 적립·세트 승리 배팅·쿠폰 발급에 참여할 수 있게 합니다. 운영자는 별도의 관리자 화면에서 외부 경기 데이터 소스, 쿠폰 이벤트와 발급 이력을 관리합니다.

백엔드는 별도 저장소의 Spring Boot REST API를 사용합니다. 개발 환경에서는 Vite가 `/api` 요청을 `http://localhost:8080`으로 프록시하므로, 브라우저에서 별도의 CORS 설정 없이 연동할 수 있습니다.

## 주요 기능

- 라이브 경기, 일정·결과, 리그 순위와 세트별 경기 기록 조회
- 진행 중인 한 경기의 시청 시간 적립과 포인트 수령
- 현재 세트 승리 팀 선택 방식의 배팅
- 활성 쿠폰 이벤트 참여와 보유 쿠폰 조회
- 공개 진단 화면
- 관리자용 경기 데이터 소스 전환, 쿠폰 종류·이벤트·발급 이력 관리, 데이터 백필과 정합성 검증

## 기술 스택

| 구분 | 기술 | 사용 목적 |
| --- | --- | --- |
| UI | React 18, React DOM | 컴포넌트 기반 사용자·관리자 화면 구현 |
| 라우팅 | React Router 7 | 사용자 앱과 관리자 앱의 선언형 라우팅 |
| 개발·빌드 | Vite 5, `@vitejs/plugin-react` | 개발 서버, 빠른 모듈 갱신과 프로덕션 번들 생성 |
| 언어 | JavaScript, ES Modules | 프론트엔드 애플리케이션 구현 |
| 스타일 | CSS 변수, 일반 CSS, SUIT Variable | 공통 디자인 토큰과 반응형 사용자·관리자 레이아웃 |
| HTTP | Fetch API | 공통 API 클라이언트를 통한 Spring Boot REST API 호출 |
| 게임 정적 데이터 | Riot Data Dragon CDN | 아이템·룬·챔피언의 한글 이름과 아이콘 표시 | |

별도의 전역 상태 관리 라이브러리나 UI 컴포넌트 라이브러리는 사용하지 않습니다. 여러 사용자 페이지가 공유하는 조회 상태는 React Context 기반의 `AppDataProvider`에서 관리하며, 도메인별 API 호출은 `src/api`에 모아 둡니다.

## 화면과 경로

| 구분 | 경로 | 설명 |
| --- | --- | --- |
| 사용자 | `/` | 기존 메인 중계 화면 |
| 사용자 | `/live` | 라이브 경기 현황 |
| 사용자 | `/schedule` | 경기 일정과 결과 |
| 사용자 | `/matches/:matchId` | 세트별 경기 기록 |
| 사용자 | `/standings` | 리그 순위 |
| 사용자 | `/rewards` | 포인트, 배팅과 보유 쿠폰 |
| 사용자 | `/diagnostics` | 공개 진단 화면 |
| 관리자 | `/admin` | 운영 요약 대시보드 |
| 관리자 | `/admin/source-control` | 외부 경기 데이터 소스 전환 |
| 관리자 | `/admin/coupon-events` | 쿠폰 이벤트 관리 |
| 관리자 | `/admin/coupon-types` | 쿠폰 종류 관리 |
| 관리자 | `/admin/coupon-claims` | 쿠폰 발급 요청·결과 조회 |
| 관리자 | `/admin/backfill` | 경기 데이터 백필 |
| 관리자 | `/admin/integrity-checks` | 쿠폰 정합성 검증 |

## 실행 방법

### 사전 준비

- Node.js 18 이상과 npm
- 실행 중인 CLUTCH 백엔드 (`http://localhost:8080`)
- 백엔드를 로컬에서 실행하는 경우: JDK 21, Docker Desktop 또는 Docker Engine, Docker Compose v2

> 이 저장소는 Node.js 버전을 별도로 고정하지 않습니다. 현재 LTS 버전 사용을 권장합니다.

### 프론트엔드 실행

새 터미널에서 다음을 실행합니다.

```bash
cd Clutch-FE
npm ci
npm run dev
```

터미널에 출력된 주소(기본값: `http://localhost:5173`)를 브라우저에서 엽니다. Vite 개발 서버가 `/api` 요청을 자동으로 `http://localhost:8080`으로 전달합니다.

개발 서버는 `vite.config.js`에서 다음처럼 구성되어 있습니다.

```js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

### 프로덕션 빌드 확인

```bash
npm run build
npm run preview
```

`npm run build`는 정적 파일을 `dist/`에 생성합니다. `npm run preview`는 해당 빌드 결과를 로컬에서 확인할 때 사용합니다.

## 디렉터리 구조

```text
Clutch-FE/
├── public/                 # 정적 아이콘과 데모 리소스
├── src/
│   ├── api/                # 공통 HTTP 처리와 도메인별 API 함수
│   ├── app/                # 앱 진입, 라우팅, 공유 데이터 흐름
│   ├── assets/             # 로컬 폰트 등 애셋
│   ├── features/           # 라이브·배팅·쿠폰·관리자 도메인 UI
│   ├── layouts/            # 사용자·관리자 앱 셸
│   ├── pages/              # URL 단위 화면 조립
│   ├── shared/             # 공통 UI, 스타일 토큰과 유틸리티
│   ├── components/         # 보호되는 기존 메인·진단 화면 컴포넌트
│   └── main.jsx            # React 애플리케이션 진입점
├── docs/                   # 프론트엔드 구조 규칙
├── package.json
└── vite.config.js
```

`src/components`는 기존 메인 화면과 공개 진단 화면을 유지하기 위한 과도기 디렉터리입니다. 새 도메인 기능은 `pages`, `features`, `shared`, `api`의 역할에 맞춰 추가합니다. 자세한 기준은 [프론트엔드 구조 문서](docs/architecture/frontend-structure.md)를 참고하세요.

## 문제 해결

| 증상 | 확인 방법 |
| --- | --- |
| 화면에서 API 요청이 실패함 | `curl http://localhost:8080/actuator/health`로 백엔드 상태와 8080 포트 사용 여부를 확인합니다. |
| `npm ci`가 실패함 | Node.js 버전이 18 이상인지 확인한 후 `package-lock.json`을 유지한 상태로 다시 실행합니다. |
| 데이터가 비어 있음 | 백엔드의 외부 경기 데이터 상태를 확인합니다. 로컬 Replay STUB은 백엔드 Compose 실행 시 함께 기동됩니다. |
| 브라우저에서 CORS 오류가 발생함 | `npm run dev`로 실행한 개발 서버 주소로 접속했는지, API를 직접 호출하지 않고 `/api` 프록시를 사용하는지 확인합니다. |

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | 프로덕션 번들 생성 |
| `npm run preview` | 빌드한 결과를 로컬에서 미리 보기 |

## 개발 규칙

- API 호출은 컴포넌트에 직접 작성하지 않고 `src/api`의 도메인 파일에 둡니다.
- 페이지는 URL 해석과 화면 조립을, `features`는 도메인별 UI를 담당합니다.
- 공개 `/diagnostics`와 기존 메인 화면은 별도 요구 없이 변경하지 않습니다.
- 변경 후에는 `npm run build`로 빌드를 검증합니다.

세부 구조와 UI 기준은 [개발 가이드](AGENTS.md), [제품 정의](PRODUCT.md), [디자인 시스템](DESIGN.md)을 따릅니다.
