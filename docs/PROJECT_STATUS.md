# REOWN 프로젝트 진행 상황 요약 (2026-10-05 기준)

> 이 문서는 다른 AI(ChatGPT 등)에게 현재 프로젝트 상황을 설명하기 위한 요약이다.
> 실제 비밀번호, `DATABASE_URL`, API 키 등 민감정보는 포함하지 않는다.
> 상세 기준 문서는 `CLAUDE.md`, `docs/DATABASE.md`, `db/README.md`, `docs/DB_CONNECTION.md`, `docs/API_DRAFT.md`(API 설계안 초안)다.

---

## 1. 프로젝트 개요

- **이름**: REOWN
- **내용**: 웹 기반 중고거래 플랫폼 (학교 팀 프로젝트, 5명)
- **핵심 기능**: 회원/지역 설정, 상품 등록·검색·필터·정렬, 좋아요·장바구니(결제 아님, 관심 상품 모음), 1:1 채팅, 가격 제안, 거래 약속, 거래 상태(판매중/예약중/거래완료), 후기·평점·매너온도, 신고·차단, 알림
- **제외 기능**: 실제 결제, 유료 AI API, 복잡한 추천, 광고
- **비용 원칙**: 무료 또는 무료 티어만 사용

## 2. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React + Vite + JavaScript |
| Backend | Node.js + Express 5, `pg`(node-postgres) |
| Database | Supabase PostgreSQL |
| 인증 | JWT(Access Token만 사용, Refresh Token 없음) + bcrypt |
| 실시간 | Socket.IO |
| 이미지 | Supabase Storage (백엔드에서 service role 키로만 업로드) |
| 외부 API | 카카오 주소/지도 |
| 협업 | Git + GitHub |

**아키텍처 원칙**: 프론트엔드는 DB에 직접 접근하지 않는다. `Frontend → REST/Socket.IO → Backend(Express) → pg → Supabase PostgreSQL`. 프론트엔드에는 어떤 Supabase 키도 넣지 않는다.

## 3. 폴더 구조 (GitHub에 올라간 상태)

```text
REOWN/
├── frontend/          # React + Vite (현재 Vite 기본 템플릿, 기능 미구현)
├── backend/           # Express 기본 구조만 (routes/controllers/services/repositories/middleware/utils 폴더는 비어 있음)
├── db/
│   ├── migrations/001_initial_schema.sql   # 초기 스키마 (Supabase 적용 완료)
│   ├── seeds/002_categories.sql            # 카테고리 16개 (미적용)
│   ├── seeds/build_regions_seed.mjs        # 법정동 원본 → 001_regions.sql 생성기
│   ├── erd/REOWN-ERD.mmd / .png / mermaid.config.json
│   └── README.md                            # DB 관리 원칙, 변경 요청 절차, 작업 규칙
├── docs/
│   ├── DATABASE.md        # DB 설계 확정본 v1.1 (정책 D1~D28)
│   ├── DB_CONNECTION.md   # DBeaver 접속 안내 (비밀번호 미기재)
│   ├── API_DRAFT.md       # API 설계안 초안 (61개, 검토 중)
│   ├── PROJECT_STATUS.md  # 이 문서 (진행 상황 요약)
│   └── API.md             # 확정 전 ("작성 전" 상태)
├── .env.example  .gitignore  .gitattributes
├── CLAUDE.md      # AI 코딩 도구용 개발 규칙
└── README.md
```

## 4. 진행 단계

```text
기능 요구사항            완료
DB 설계 · ERD 검토       완료 (docs/DATABASE.md v1.1)
Supabase 구축            완료 (001_initial_schema.sql 적용)
DB 관리 원칙 문서화      완료
Git/GitHub 초기 설정     완료 (main, develop)
초기 데이터(seed)        진행 중  (카테고리 검증 완료·미적용, 지역 원본 대기)
API 명세                 진행 중  ← 현재 (docs/API_DRAFT.md 초안 작성, 결정 사항 확인 대기)
Backend/Frontend 개발    그 이후
```

## 5. DB 현황

### 5.1 테이블 16개 (확정)

`users`, `categories`, `regions`, `products`, `product_images`, `favorites`, `cart`, `chat_rooms`, `messages`, `price_offers`, `transactions`, `trade_appointments`, `reviews`, `reports`, `blocks`, `notifications`

- 컬럼 104개, 인덱스 27개, FK 관계 31개
- View `user_trust_stats`: 후기 수, 평균 평점, 매너온도(36.5℃ 기준, 평점 1점당 ±0.2℃, 0~99.9 범위)를 계산한다. 매너온도는 저장하지 않는다.
- 공통 트리거 `set_updated_at()` (users, products, transactions)
- **RLS**: 16개 테이블 모두 ON, 정책 0개. anon/authenticated 키로는 아무 데이터도 접근 불가. 백엔드 연결 계정(테이블 소유자)만 접근.

### 5.2 주요 설계 규칙

- PK는 `bigint GENERATED ALWAYS AS IDENTITY`
- 시간은 모두 `timestamptz`(UTC 저장, KST 표시)
- 상태값은 ENUM 대신 `varchar + CHECK`
  - products: `ON_SALE / RESERVED / SOLD`
  - price_offers: `PENDING / ACCEPTED / REJECTED / CANCELED / EXPIRED`
  - trade_appointments: `SCHEDULED / CANCELED / EXPIRED`
  - transactions: `RESERVED / COMPLETED / CANCELED`
  - reports: `PENDING / RESOLVED / REJECTED`
- 판매자는 `products.seller_id`에만 저장. 채팅방·거래는 `(product_id, buyer_id)` 기준
- 상품은 소프트 삭제(`deleted_at`). 채팅·제안·약속·거래·후기·신고는 삭제하지 않음
- 좋아요 수, 대표 이미지, 평균 평점, 마지막 메시지, 매너온도는 저장하지 않고 쿼리로 계산
- 관리자 기능은 없음. 신고 처리는 DB 관리자가 Supabase 대시보드에서 직접 처리(D4)
- 채팅 알림은 `notifications`에 저장하지 않고 Socket.IO + `messages.read_at` 사용(D12)

### 5.3 주요 서비스 정책 (D9~D28 중 일부)

- 거래완료는 되돌릴 수 없음 / 예약중 상품은 삭제 불가
- 거래완료·상품 삭제·예약 취소·차단 시 관련 대기 제안과 약속 자동 정리
- 가격 제안: 판매중 상품에만, 상품 가격 미만만, 채팅방당 24시간에 최대 3회
- 거래 약속: 즉시 확정, 변경 시 기존 약속을 CANCELED 처리 후 새로 생성
- 후기: 거래완료 후 7일 이내, 수정·삭제 불가
- 알림: 90일 보관 / 회원 탈퇴는 범위 제외 / 자기 상품에는 좋아요·장바구니 불가
- 권한이 없는 요청은 404로 응답해 데이터 존재 여부를 숨김

### 5.4 Seed 상태

| 파일 | 상태 |
|---|---|
| `002_categories.sql` | 작성 완료, **Supabase 미적용**. 카테고리 16개: 디지털기기, 생활가전, 가구/인테리어, 생활/주방, 유아동, 여성의류, 여성잡화, 남성패션/잡화, 뷰티/미용, 스포츠/레저, 취미/게임/음반, 도서, 티켓/교환권, 반려동물용품, 식물, 기타중고물품 |
| `001_regions.sql` | **아직 없음**. 행정안전부 법정동 코드 원본(CSV/TXT)을 받아 `build_regions_seed.mjs`로 생성 예정. 읍·면·동 단위 현존 코드만 사용 |

### 5.5 DB 접속 방식

- Supabase **Session pooler** 사용 (`aws-0-ap-northeast-2.pooler.supabase.com:5432`, DB `postgres`, 사용자 `postgres.<project-ref>`, SSL require)
- 직접 연결 주소는 IPv6 전용이라 사용하지 않음. Transaction pooler(6543)도 사용하지 않음
- 모든 쿼리는 `$1, $2` 파라미터 바인딩

## 6. DB 관리 원칙 (확정)

- Supabase 프로젝트 관리자는 **1명(DB 관리자)**. 팀원에게 Supabase 관리자 권한을 공유하지 않는다.
- 팀원은 Supabase 대시보드에 접근하지 않고 **GitHub의 파일을 기준으로** 개발한다.
- DB 스키마 변경은 DB 관리자가 검토·승인한 경우에만 진행한다.
- 변경 절차: 팀원 요청(GitHub Issue 등) → DB 관리자 검토·승인 → 새 번호 migration 파일 작성(PR) → DB 관리자가 로컬(PGlite) 검증 후 Supabase 적용 → `docs/DATABASE.md`, ERD 갱신
- 이미 적용한 migration 파일은 수정하지 않는다. 변경은 `002_….sql`처럼 새 파일로 추가한다.
- migration/seed는 `BEGIN … COMMIT` 하나의 트랜잭션으로 작성하고, seed는 `ON CONFLICT … DO NOTHING`으로 중복 실행에 안전하게 만든다.
- 팀원은 DBeaver로 **조회만** 한다(Read-only connection 권장). 연결 방법은 `docs/DB_CONNECTION.md`.

## 7. 환경변수와 보안

- GitHub에는 값이 비어 있는 `.env.example`만 올린다. 실제 값은 `.env`에만 넣고 `.gitignore`로 제외한다.
- 변수: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `KAKAO_API_KEY` (모두 백엔드 전용, `VITE_` 접두사 금지)
- 실제 값은 DB 관리자가 비공개로 전달한다. 문서·이슈·PR·채팅에 올리지 않는다.
- `.gitignore`: `.env`, `.env.*`(단 `.env.example` 포함), `node_modules`, `dist`, `.dbeaver/` 등
- `.gitattributes`: `*.sql`, `*.md`, `*.json`, `*.mmd`는 항상 LF. Windows에서 받아도 migration 파일의 SHA-256 해시(`0c85efc4…`)가 유지되도록 하기 위함

## 8. Git / GitHub 상태

- 저장소: https://github.com/anty9915-sudo/reown
- 브랜치 전략: `main` ← `develop` ← `feature/*`, `fix/*`, `refactor/*`. 작업 후 PR로 `develop`에 병합. `main`에는 검증되지 않은 코드를 직접 push하지 않음
- 현재: 초기 commit `0a5c7f2` (`chore: initialize REOWN project`), 파일 44개
  - `main` = `develop` = `origin/main` = `origin/develop` = `0a5c7f2`
- push 전 점검 완료: `.env`·실제 비밀값 미포함, frontend lint/build 성공, backend 서버 기동 확인, migration과 문서·ERD 일치 확인

## 9. 남은 일 / 다음 단계

1. **지역 seed**: 법정동 원본 파일 확보 → `001_regions.sql` 생성 → DB 관리자 승인 후 적용
2. **카테고리 seed** `002_categories.sql` Supabase 적용 (DB 관리자 승인 후)
3. **API 명세 확정**: `docs/API_DRAFT.md`의 `[결정 필요]` 항목(응답 형식, ID 타입, JWT 만료, 이미지 규칙, 메시지 전송 방식 등)을 정한 뒤 `docs/API.md`로 확정
4. 백엔드에서 `.env` 읽기 방식 결정 (예: `node --env-file=../.env`)과 DB 연결 모듈 작성
5. 이후 기능별 Backend/Frontend 개발 (`develop`에서 feature 브랜치)

**검토 중인 선택 사항**

- 팀원용 조회 전용 DB 역할(role) 생성: 현재 `postgres` 계정은 수정 권한이 있어 DBeaver Read-only 옵션에만 의존한다. 만들려면 별도 migration이 필요
- GitHub 브랜치 보호 규칙(`main`, `develop`) 설정
- Supabase Data API(PostgREST) 비활성화 여부 확인 (RLS와 이중 방어)
- 프로젝트 폴더가 OneDrive 안에 있어 `.git` 동기화 충돌 가능성 있음

## 10. AI에게 요청할 때 지켜야 할 규칙

- DB 구조(테이블·컬럼·제약)와 API 구조를 임의로 바꾸지 않는다. 바꿔야 하면 변경 이유, 대상, 내용, 영향받는 기능, 예상 문제를 먼저 설명한다.
- 요청하지 않은 기능을 추가하지 않는다.
- 이미 적용된 `001_initial_schema.sql`은 수정하지 않는다.
- SQL은 반드시 파라미터 바인딩을 사용한다.
- 모든 수정·삭제 API는 JWT 확인과 함께 소유권을 서버에서 확인한다.
- 민감정보를 코드나 문서에 쓰지 않는다.
