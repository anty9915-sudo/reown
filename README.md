# REOWN

> 중고 물품을 쉽고 안전하게 거래할 수 있는 웹 기반 중고거래 플랫폼

---

## 📌 프로젝트 소개

**REOWN**은 사용자가 사용하지 않는 물품을 등록하고, 다른 사용자가 원하는 상품을 검색하여 거래할 수 있도록 만든 중고거래 웹 서비스이다.

상품 등록부터 검색, 관심 상품 관리, 1:1 채팅, 가격 제안, 거래 약속, 거래 완료 후 후기까지 중고거래에 필요한 주요 기능을 하나의 서비스에서 제공하는 것을 목표로 한다.

학교 팀 프로젝트로 진행하며, 실제 웹 서비스의 구조를 참고하여 **Frontend / Backend / Database를 분리한 구조**로 개발한다.

---

## 🎯 프로젝트 목표

- 중고거래 서비스의 전체적인 웹 구조 이해
- React 기반 Frontend 개발 경험
- Node.js + Express 기반 Backend API 개발
- PostgreSQL 기반 Database 설계 및 구축
- 사용자 인증 및 권한 관리 구현
- 실시간 채팅 기능 구현
- REST API 설계 및 Frontend ↔ Backend 연동
- GitHub를 활용한 팀 협업 경험
- 웹 보안을 고려한 서비스 개발

---

## 👥 팀

총 **5명**으로 구성된 팀 프로젝트이다.

역할은 기능 및 개발 상황에 따라 조정할 수 있으며, 특정 페이지 하나를 담당하는 방식보다는 기능 영역을 기준으로 협업한다.

예상 역할:

```text
Database / 공통
Backend
Backend
Frontend
Frontend
```

실제 팀원 및 세부 역할은 프로젝트 진행 과정에서 확정한다.

---

# 🛠️ 기술 스택

## Frontend

- React
- Vite
- JavaScript

## Backend

- Node.js
- Express

## Database

- Supabase
- PostgreSQL

## Authentication

- JWT
- bcrypt

## Realtime

- Socket.IO

## Storage

- Supabase Storage

## External API

- 카카오 주소 / 지도 API 등

## Version Control

- Git
- GitHub

---

# 🏗️ 시스템 구조

기본적인 서비스 구조는 다음과 같다.

```text
┌──────────────────┐
│     Frontend     │
│  React + Vite    │
└────────┬─────────┘
         │
         │ REST API
         ↓
┌──────────────────┐
│     Backend      │
│ Node.js + Express│
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│    Supabase      │
│ PostgreSQL / DB  │
└──────────────────┘
```

실시간 채팅은 Socket.IO를 사용하여 별도의 실시간 통신 구조를 구성한다.

```text
Frontend
    ↕
Socket.IO
    ↕
Backend
    ↕
Database
```

---

# 📂 프로젝트 구조

현재 기본 구조는 다음과 같다.

```text
REOWN/
├── frontend/                 # React + Vite
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── db/                       # 실제 DB 작업 파일 (db/README.md 참고)
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seeds/
│   │   ├── 002_categories.sql
│   │   └── build_regions_seed.mjs
│   ├── erd/
│   │   ├── REOWN-ERD.png
│   │   ├── REOWN-ERD.mmd
│   │   └── mermaid.config.json
│   └── README.md
│
├── docs/                     # 설계 문서
│   ├── DATABASE.md
│   ├── DB_CONNECTION.md      # DBeaver 접속 안내 (비밀번호 미기재)
│   └── API.md
│
├── .env.example
├── .gitignore
├── CLAUDE.md
└── README.md
```

`db/seeds/001_regions.sql`(법정동 지역 seed)은 아직 없다. 공식 법정동 원본 데이터를 확보한 뒤 `db/seeds/build_regions_seed.mjs`로 생성할 예정이다.

세부 구조는 개발 과정에서 실제 요구사항에 맞춰 확정한다.

---

# ✨ 주요 기능

## 👤 회원

- 회원가입
- 로그인
- 로그아웃
- JWT 인증
- 마이페이지
- 지역 설정

---

## 📦 상품

- 상품 등록
- 상품 수정
- 상품 삭제
- 상품 상세 조회
- 상품 이미지 업로드
- 조회수
- 카테고리
- 거래 상태

### 거래 상태

```text
판매중
  ↓
예약중
  ↓
거래완료
```

---

## 🔎 검색 및 탐색

상품을 다양한 조건으로 검색할 수 있다.

- 상품명 검색
- 지역 필터
- 카테고리 필터
- 가격 필터
- 거래 상태 필터

### 정렬

- 최신순
- 오래된순
- 낮은 가격순
- 높은 가격순
- 조회수순

---

## ❤️ 관심 상품

- 좋아요
- 좋아요 목록
- 장바구니

> 장바구니는 실제 결제를 위한 기능이 아니라 관심 있는 상품을 모아두는 용도로 사용한다.

---

## 💬 거래

### 1:1 채팅

판매자와 구매자가 상품을 기준으로 대화할 수 있다.

### 가격 제안

구매자가 판매자에게 원하는 가격을 제안할 수 있다.

### 거래 약속

거래 날짜, 시간, 장소 등을 정할 수 있다.

### 거래 상태

거래 진행 상황에 따라 상품의 상태를 변경한다.

---

## ⭐ 신뢰 기능

거래가 완료된 이후 사용자는 상대방에 대한 후기를 작성할 수 있다.

- 후기
- 평점
- 매너온도
- 신고
- 차단

매너온도는 프로젝트에서 정의한 후기 및 평가 데이터를 기반으로 계산한다.

---

## 🔔 알림

다음과 같은 상황에서 사용자에게 알림을 제공한다.

- 새로운 채팅 메시지
- 가격 제안
- 가격 제안 결과
- 거래 상태 변경
- 거래 약속 변경

---

# 🗄️ Database

Database는 **Supabase PostgreSQL**을 사용한다.

주요 데이터 영역은 다음과 같다.

```text
사용자
상품
카테고리
지역
상품 이미지
좋아요
장바구니
채팅방
메시지
가격 제안
거래
거래 약속
후기
신고
차단
알림
```

구체적인 테이블 구조와 관계는 다음 문서에서 관리한다.

> `docs/DATABASE.md`

실제 마이그레이션 SQL, seed, ERD는 `db/` 폴더에서 관리한다 (`db/README.md`).

DB 구조는 팀원 검토를 거쳐 확정되었고(`docs/DATABASE.md` v1.1), 초기 마이그레이션(`001_initial_schema.sql`)이 Supabase에 적용되었다. 초기 데이터(seed)는 아직 Supabase에 적용하지 않았다.

### DB 관리

- Supabase 프로젝트는 **DB 관리자 1명**이 관리한다. 팀원에게 Supabase 관리자 권한을 공유하지 않는다.
- 팀원은 Supabase 대시보드에 접근하거나 DB 구조를 임의로 변경하지 않고, GitHub의 프로젝트 파일을 기준으로 개발한다.
- DB 구조 변경이 필요하면 DB 관리자에게 먼저 요청하고, 승인 후 migration으로 반영한다 (`db/README.md` "DB 변경 요청 절차").
- migration은 `db/migrations/`, seed는 `db/seeds/`, ERD는 `db/erd/`에서 관리한다.
- DBeaver 연결 방법은 `docs/DB_CONNECTION.md`를 참고한다. 조회 전용으로 사용한다.

---

# 🔌 API

Backend는 REST API를 기본으로 사용한다.

예상 API:

```text
POST   /api/v1/auth/signup
POST   /api/v1/auth/login

GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/:id
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id
```

전체 API 명세는 다음 문서에서 관리한다.

> `docs/API.md`

---

# 🔐 보안

서비스 개발 과정에서 다음과 같은 웹 보안을 고려한다.

- JWT 인증
- bcrypt 비밀번호 해시
- API 인증 및 권한 검사
- 사용자 데이터 소유권 검증
- SQL Injection 방지
- XSS 방지
- 파일 업로드 검증
- 환경변수 및 Secret 관리
- API 요청에 대한 입력값 검증

특히 사용자가 자신의 데이터가 아닌 다른 사용자의 상품이나 거래 정보를 임의로 수정하거나 삭제하지 못하도록 서버에서 권한을 검증한다.

---

# 🌐 외부 API

서비스에서 필요한 경우 외부 API를 사용한다.

현재 검토 대상:

### 카카오 주소 / 지도 API

사용자가 거래 지역을 설정하거나 거래 장소를 지정하는 기능 등에 활용할 수 있다.

외부 API 사용 시 무료 이용량 및 정책을 확인한 후 적용한다.

---

# 💰 비용 정책

학교 프로젝트이므로 가능한 한 **무료 또는 무료 티어 서비스**를 사용한다.

현재 계획:

- Supabase Free Tier
- GitHub
- 무료 오픈소스 라이브러리
- 무료 API 사용량 범위 내 외부 API

실제 결제 시스템이나 유료 AI API는 현재 프로젝트의 핵심 범위에서 제외한다.

단, 각 서비스의 무료 이용 정책과 사용량 제한은 변경될 수 있으므로 실제 적용 시 확인한다.

---

# 🚀 개발 진행 순서

프로젝트는 다음 순서로 진행한다.

```text
1. 기능 요구사항 확정
        ↓
2. DB 설계
        ↓
3. ERD 작성 및 팀 검토
        ↓
4. Supabase DB 구축
        ↓
5. API 명세 작성
        ↓
6. Backend 기본 구조 구축
        ↓
7. Frontend 기본 구조 구축
        ↓
8. Backend ↔ Supabase 연결
        ↓
9. 기능별 Backend / Frontend 개발
        ↓
10. Frontend ↔ Backend 연동
        ↓
11. 통합 테스트
        ↓
12. 보안 테스트
        ↓
13. 버그 수정
        ↓
14. 배포
```

DB와 API 명세가 확정된 이후에는 Backend와 Frontend를 병렬로 개발한다.

---

# 🌿 Git 협업

GitHub를 이용하여 협업한다.

기본 브랜치 구조:

```text
main
└── develop
    ├── feature/auth
    ├── feature/product
    ├── feature/chat
    ├── feature/trade
    └── ...
```

### 기본 원칙

- `main`에 직접 작업하지 않는다.
- 기능 개발은 feature 브랜치에서 진행한다.
- 작업 완료 후 Pull Request를 생성한다.
- 코드 확인 후 `develop`에 병합한다.
- 다른 팀원의 작업 내용을 임의로 덮어쓰지 않는다.
- 충돌이 발생하면 작업자 간 확인 후 해결한다.

---

# ⚙️ 개발 환경

## 요구사항

- Node.js
- npm
- Git
- GitHub 계정
- Supabase 프로젝트

각 폴더의 의존성 설치 후 개발 서버를 실행한다.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

실제 실행 명령은 프로젝트 구현 과정에서 `package.json`에 정의된 명령을 기준으로 한다.

---

# 🔑 환경변수

환경변수는 `.env` 파일에서 관리한다.

예시:

```env
DATABASE_URL=
JWT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KAKAO_API_KEY=
```

실제 Secret 값은 GitHub에 업로드하지 않는다.

팀원이 프로젝트를 실행할 수 있도록 필요한 환경변수 이름은 `.env.example`에 기록한다.

```bash
cp .env.example .env
```

- GitHub에는 값이 비어 있는 `.env.example`만 관리한다.
- `.env`에 실제 접속 정보를 넣는다. `.env`는 `.gitignore`로 Git 추적에서 제외되어 있다.
- `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 등의 실제 값은 DB 관리자에게 비공개로 전달받는다. 문서·이슈·PR·채팅에 올리지 않는다.

---

# 📚 프로젝트 문서

주요 문서는 다음과 같이 관리한다.

| 문서 | 내용 |
|---|---|
| `README.md` | 프로젝트 전체 소개 및 사용 방법 |
| `CLAUDE.md` | Claude Code 개발 규칙 |
| `docs/DATABASE.md` | DB 설계 및 ERD |
| `docs/DB_CONNECTION.md` | DBeaver 접속 안내 (비밀번호 미기재) |
| `docs/API.md` | API 명세 |
| `db/README.md` | DB 관리 원칙, 변경 요청 절차, migration / seed / ERD 작업 규칙 |

향후 필요한 문서는 `docs/`에 추가한다.

---

# 🧪 테스트

기능 구현 후 다음 항목을 확인한다.

- 정상적인 요청
- 잘못된 입력
- 로그인하지 않은 사용자의 접근
- 권한이 없는 사용자의 접근
- 존재하지 않는 데이터
- 중복 데이터
- 서버 오류
- 외부 API 오류

핵심 기능은 Backend API와 Frontend 연동까지 확인한다.

---

# 📌 현재 프로젝트 상태

현재는 **프로젝트 구조 구성과 DB 설계·구축까지 완료**된 상태이며, 초기 데이터(seed)와 API·서비스 구현은 진행 중이다.

| 구분 | 항목 |
|---|---|
| 완료 | 프로젝트 구조 구성 (`frontend/`, `backend/`, `db/`, `docs/`) |
| 완료 | DB 설계 확정 (`docs/DATABASE.md` v1.1) |
| 완료 | 초기 마이그레이션 작성·로컬 검증 및 Supabase 적용 (`db/migrations/001_initial_schema.sql`) |
| 완료 | ERD 생성 및 실제 SQL과 대조 (`db/erd/`) |
| 진행 중 | 초기 데이터(seed): 카테고리 SQL 작성됨, 지역 SQL 생성 예정, Supabase 미적용 |
| 예정 | API 명세 (`docs/API.md`) |
| 예정 | Backend / Frontend 기능 구현 (현재는 기본 구조만 있음) |

진행 순서:

```text
기능 요구사항                     완료
    ↓
DB 설계 · ERD 검토                완료
    ↓
Supabase 구축 (마이그레이션)      완료
    ↓
초기 데이터(seed)                 [현재] 진행 중
    ↓
API 명세
    ↓
개발 시작
```

아직 확정되지 않은 기능이나 기술 선택은 팀원과 협의 후 결정한다.

---

# 📄 License

학교 팀 프로젝트 용도로 개발한다.