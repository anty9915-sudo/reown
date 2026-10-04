# CLAUDE.md

이 문서는 **REOWN** 프로젝트에서 Claude Code가 작업할 때 따라야 하는 개발 기준과 규칙이다.

프로젝트의 기존 구조, 기능, DB 설계, API 명세를 임의로 변경하지 않는다.

확정되지 않은 중요한 기술 선택이나 구조 변경이 필요한 경우 작업 전에 사용자에게 설명하고 확인을 받는다.

---

# 1. 프로젝트 기본 정보

## 프로젝트명

REOWN

## 프로젝트 목적

REOWN은 사용자가 중고 물품을 등록하고 다른 사용자가 상품을 검색하고 관심 등록, 채팅, 가격 제안, 거래 약속 등을 통해 거래할 수 있는 중고거래 웹 서비스이다.

학교 팀 프로젝트를 목적으로 개발하며, 무료 또는 무료 티어로 사용할 수 있는 기술을 우선적으로 사용한다.

---

# 2. 기술 스택

현재 기본 기술 스택은 다음과 같다.

### Frontend

- React
- Vite
- JavaScript

### Backend

- Node.js
- Express

### Database

- Supabase
- PostgreSQL

### Authentication

- JWT
- bcrypt

### Realtime

- Socket.IO

### Storage

- Supabase Storage

### External API

- 카카오 주소/지도 API 등 필요한 외부 API

### Version Control

- Git
- GitHub

단, 실제 개발 과정에서 기술 스택을 변경해야 하는 경우 임의로 변경하지 않는다.

변경이 필요하면 변경 이유와 영향을 먼저 설명한다.

---

# 3. 프로젝트 기본 구조

기본 프로젝트 구조는 다음을 기준으로 한다.

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

세부 폴더 구조는 실제 개발 과정에서 필요에 따라 정한다.

불필요하게 복잡한 폴더 구조를 만들지 않는다.

---

# 4. 핵심 기능

## 회원

- 회원가입
- 로그인
- 로그아웃
- JWT 인증
- 마이페이지
- 지역 설정

## 상품

- 상품 등록
- 상품 수정
- 상품 삭제
- 상품 상세 조회
- 상품 이미지 업로드
- 조회수
- 카테고리
- 거래 상태

거래 상태:

```text
판매중
예약중
거래완료
```

## 검색 및 탐색

- 상품명 검색
- 지역 필터
- 카테고리 필터
- 가격 필터
- 거래 상태 필터
- 최신순 정렬
- 오래된순 정렬
- 낮은 가격순 정렬
- 높은 가격순 정렬
- 조회수순 정렬

## 관심 기능

- 좋아요
- 좋아요 목록
- 장바구니

장바구니는 결제용 장바구니가 아니라 사용자가 관심 있는 상품을 모아두는 기능으로 정의한다.

## 거래

- 1:1 채팅
- 가격 제안
- 거래 약속
- 거래 상태 변경

## 신뢰

- 후기
- 평점
- 매너온도
- 신고
- 차단

## 알림

- 채팅 알림
- 가격 제안 알림
- 거래 상태 알림
- 거래 약속 알림

---

# 5. 현재 프로젝트에서 제외하는 기능

프로젝트 범위를 관리하기 위해 다음 기능은 현재 핵심 개발 범위에서 제외한다.

- 실제 결제 시스템
- 유료 AI API
- 복잡한 AI 추천 시스템
- 광고 시스템

향후 필요성이 확인되면 별도로 논의한다.

---

# 6. DB 개발 원칙

DB는 Supabase PostgreSQL을 사용한다.

확정된 테이블은 다음 16개다. 상세 설계는 `docs/DATABASE.md`(v1.1), 실제 SQL은 `db/migrations/001_initial_schema.sql`을 기준으로 한다.

```text
users
categories
regions
products
product_images
favorites
cart
chat_rooms
messages
price_offers
transactions
trade_appointments
reviews
reports
blocks
notifications
```

### 현재 DB 상태

| 항목 | 상태 |
|---|---|
| DB 설계 | 확정 (`docs/DATABASE.md` v1.1) |
| 초기 마이그레이션 | `db/migrations/001_initial_schema.sql` 작성 및 로컬 검증 완료 |
| Supabase 적용 | `001_initial_schema.sql` 적용 완료 |
| ERD | `db/erd/`에 생성, 실제 SQL 구조와 대조 완료 |
| 초기 데이터(seed) | **Supabase에 아직 적용하지 않음** (`002_categories.sql` 작성됨, `001_regions.sql` 생성 예정) |
| API | 아직 구현하지 않음 (`docs/API.md` 작성 전) |

DB 구조를 변경할 때는 요구사항과 ERD, 테이블 구조를 먼저 검토한다.

### DB 작업 원칙

1. 테이블을 임의로 추가하거나 삭제하지 않는다.
2. 기존 컬럼을 임의로 변경하지 않는다.
3. PK와 FK 관계를 명확하게 정의한다.
4. 사용자 데이터의 소유권을 명확하게 관리한다.
5. 상품, 채팅, 거래 등 주요 데이터의 관계를 명확하게 설계한다.
6. DB 구조를 변경할 경우 영향받는 API와 기능을 함께 확인한다.
7. 실제 Supabase에 적용하기 전에 설계안을 먼저 검토한다.

### DB 관리 권한

Supabase 프로젝트는 **DB 관리자 1명**이 단독으로 관리한다. 세부 규칙은 `db/README.md`의 "DB 관리 원칙"과 "DB 변경 요청 절차"를 따른다.

- 팀원에게 Supabase 관리자 권한을 공유하지 않는다. 팀원은 대시보드가 아니라 GitHub의 프로젝트 파일을 기준으로 개발한다.
- DB 스키마 변경은 DB 관리자가 검토하고 승인한 경우에만 진행한다. 팀원은 먼저 요청하고, 승인 후 migration으로 반영한다.
- migration은 `db/migrations/`, seed는 `db/seeds/`, ERD는 `db/erd/`에서 버전 관리한다.
- Claude Code는 DB 관리자의 명시적인 승인 없이 Supabase에 SQL을 실행하거나 Supabase 권한·설정을 변경하지 않는다.
- DBeaver 연결 설정은 `docs/DB_CONNECTION.md`로만 공유한다. 이 문서에 실제 비밀번호나 전체 `DATABASE_URL`을 적지 않는다.

---

# 7. Backend 개발 원칙

Backend는 Node.js + Express를 사용한다.

Backend의 주요 역할은 다음과 같다.

```text
Frontend
    ↓
Backend API
    ↓
Supabase PostgreSQL
```

프론트엔드에서 DB에 직접 접근하지 않는 것을 기본 원칙으로 한다.

### API 개발

API는 REST API를 기본으로 사용한다.

예:

```text
POST   /api/v1/auth/signup
POST   /api/v1/auth/login

GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/:id
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id
```

실제 API는 `docs/API.md`에 정의된 명세를 기준으로 구현한다.

API 명세가 없는 기능을 임의로 구현하지 않는다.

---

# 8. 인증 및 권한

인증은 JWT를 사용한다.

비밀번호는 반드시 bcrypt 등을 사용하여 해시한 후 저장한다.

비밀번호를 평문으로 저장하지 않는다.

인증이 필요한 API는 JWT를 검증한다.

또한 로그인 여부뿐만 아니라 **해당 사용자가 해당 데이터를 수정하거나 삭제할 권한이 있는지 확인한다.**

예:

```text
상품 수정
↓
JWT 확인
↓
현재 사용자 확인
↓
상품 소유자 확인
↓
수정 허용
```

사용자가 다른 사용자의 상품을 임의로 수정하거나 삭제할 수 없어야 한다.

---

# 9. 보안 원칙

웹 보안을 중요하게 고려한다.

### SQL Injection

SQL 쿼리에 사용자 입력값을 문자열로 직접 삽입하지 않는다.

가능한 경우 parameterized query / prepared statement를 사용한다.

### XSS

사용자 입력값을 그대로 HTML에 삽입하지 않는다.

### 인증

JWT를 안전하게 검증한다.

### 권한

ID만 알고 다른 사용자의 데이터를 수정하거나 삭제할 수 없도록 서버에서 소유권을 확인한다.

### 파일 업로드

상품 이미지 업로드 시 다음을 검증한다.

- 파일 형식
- 파일 크기
- 허용 확장자
- 업로드 경로

### 환경변수

API Key, JWT Secret, DB 접속 정보 등 민감한 정보를 코드에 직접 작성하지 않는다.

`.env`를 사용한다.

`.env` 파일은 Git에 커밋하지 않는다.

`.env.example`에는 실제 비밀번호나 Secret 값을 작성하지 않는다.

GitHub에는 `.env.example`만 관리하고, 실제 접속 정보는 `.env`에만 넣는다. `.env`는 `.gitignore`로 Git 추적에서 제외한다.

### Supabase

Supabase의 서버용 민감한 키를 프론트엔드 코드에 노출하지 않는다.

Supabase 비밀번호, `DATABASE_URL`, Service Role Key는 코드·문서·커밋·이슈·PR 어디에도 기록하지 않는다.

---

# 10. Frontend 개발 원칙

Frontend는 React + Vite를 사용한다.

컴포넌트는 역할에 따라 분리한다.

페이지에 모든 코드를 하나의 파일에 작성하지 않는다.

API 호출 로직과 UI 로직을 가능한 한 분리한다.

반복되는 UI는 재사용 가능한 컴포넌트로 만든다.

백엔드 API 명세와 다른 요청 형식을 임의로 만들지 않는다.

---

# 11. Realtime 채팅

실시간 채팅은 Socket.IO를 사용한다.

기본 구조는 다음과 같다.

```text
사용자 A
   ↓
Frontend
   ↓
Socket.IO
   ↓
Backend
   ↓
Chat Room
   ↓
사용자 B
```

채팅 메시지는 필요한 경우 DB에도 저장하여 채팅 기록을 유지할 수 있도록 한다.

채팅 기능을 구현할 때 인증된 사용자만 해당 채팅방에 접근할 수 있도록 권한을 확인한다.

---

# 12. 외부 API

카카오 주소/지도 API 등 외부 API를 사용할 수 있다.

외부 API 사용 시:

- API Key를 코드에 직접 작성하지 않는다.
- 환경변수를 사용한다.
- 무료 사용량 및 이용 정책을 확인한다.
- 외부 API가 실패했을 때 서비스가 완전히 중단되지 않도록 오류 처리를 고려한다.

외부 API를 새로 추가해야 하는 경우 필요성과 비용을 먼저 확인한다.

---

# 13. Git / GitHub 협업

팀 개발은 GitHub를 사용한다.

기본 브랜치는 다음 구조를 사용한다.

```text
main
└── develop
    ├── feature/...
    ├── fix/...
    └── refactor/...
```

기능 개발은 가능한 한 feature 브랜치에서 진행한다.

예:

```text
feature/auth
feature/product
feature/chat
feature/trade
feature/frontend
```

작업 완료 후 Pull Request를 통해 `develop`에 병합하는 것을 기본으로 한다.

`main`에는 검증되지 않은 코드를 직접 push하지 않는다.

---

# 14. 코드 수정 규칙

Claude Code는 작업을 시작하기 전에 관련 파일과 기존 코드를 먼저 확인한다.

작업할 때 다음 순서를 따른다.

```text
1. 관련 파일 확인
2. 기존 코드 분석
3. 변경이 필요한 파일 확인
4. 변경 내용 설명
5. 구현
6. 테스트
7. 결과 확인
8. 변경 사항 요약
```

기존 코드를 확인하지 않고 새로운 구조를 임의로 만들지 않는다.

---

# 15. 임의 변경 금지

다음 항목은 사용자의 확인 없이 임의로 변경하지 않는다.

- DB 구조
- API 구조
- 인증 방식
- 주요 기술 스택
- 프로젝트 폴더 구조
- 핵심 기능
- Git 브랜치 전략
- 환경 설정
- 외부 서비스

특히 DB나 API 구조를 변경해야 하는 경우 다음 내용을 먼저 설명한다.

```text
변경 이유
변경 대상
변경 내용
영향받는 기능
예상되는 문제
```

---

# 16. 작업 범위 준수

사용자가 요청한 범위 안에서 작업한다.

요청하지 않은 기능을 임의로 추가하지 않는다.

코드 개선이 필요하더라도 현재 작업과 직접적인 관련이 없다면 먼저 사용자에게 알린다.

대규모 리팩토링을 작은 기능 수정과 함께 임의로 진행하지 않는다.

---

# 17. 테스트 원칙

기능 구현 후 가능한 범위에서 테스트한다.

특히 다음 항목을 확인한다.

- 정상 요청
- 잘못된 입력
- 인증되지 않은 요청
- 권한이 없는 요청
- 존재하지 않는 데이터
- 중복 데이터
- 서버 오류
- 외부 API 오류

회원, 상품, 거래, 채팅 등 핵심 기능은 구현 후 실제 API 동작을 확인한다.

---

# 18. 개발 진행 순서

전체 개발은 기본적으로 다음 순서를 따른다.

```text
기능 요구사항 확정
        ↓
DB 설계
        ↓
ERD 검토
        ↓
Supabase DB 구축
        ↓
API 명세 작성
        ↓
Backend 기본 구조
        ↓
Frontend 기본 구조
        ↓
Backend ↔ Supabase 연결
        ↓
기능별 Backend 개발
        ↓
기능별 Frontend 개발
        ↓
Frontend ↔ Backend 연동
        ↓
통합 테스트
        ↓
보안 테스트
        ↓
버그 수정
        ↓
배포
```

DB와 API 명세가 확정된 이후에는 Backend와 Frontend를 병렬로 개발할 수 있다.

---

# 19. 문서 기준

프로젝트의 문서가 실제 코드보다 우선하여 구조를 강제하는 것은 아니다.

단, 다음 문서를 프로젝트의 기준 문서로 사용한다.

```text
CLAUDE.md
docs/DATABASE.md
docs/API.md
README.md
```

DB 관리 규칙은 `db/README.md`, DB 접속 안내는 `docs/DB_CONNECTION.md`를 참고한다.

문서와 실제 코드가 불일치하는 경우 차이를 확인하고 임의로 한쪽을 삭제하지 않는다.

---

# 20. Claude Code 응답 방식

작업을 시작할 때 필요한 경우 다음 형식으로 먼저 설명한다.

```text
[작업 내용]

변경 파일:
- 파일명
- 파일명

변경 내용:
- 변경 내용

영향 범위:
- 영향받는 기능

주의사항:
- 필요한 사항
```

구현이 끝난 후에는 다음 내용을 간단하게 정리한다.

```text
완료한 작업:
- ...

변경된 파일:
- ...

테스트:
- ...

추가 확인이 필요한 사항:
- ...
```

---

# 21. 가장 중요한 원칙

REOWN 프로젝트의 개발 과정에서 다음 원칙을 항상 우선한다.

> **기능을 임의로 추가하지 않는다.**
>
> **DB와 API 구조를 임의로 변경하지 않는다.**
>
> **기존 코드를 먼저 확인하고 수정한다.**
>
> **보안을 고려하여 구현한다.**
>
> **팀원 간 합의된 구조를 우선한다.**
>
> **확정되지 않은 사항은 추측하지 않고 확인한다.**
>
> **작은 단위로 구현하고 테스트한다.**