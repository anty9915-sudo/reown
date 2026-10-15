# REOWN API 명세

> 상태: **v1.2 (2026-10-14)**. 백엔드·프론트엔드 구현의 기준 문서다.
> 기준: `docs/DATABASE.md` v1.1 (D1~D28, 9장 권한 매트릭스, 10~12장), `db/migrations/001_initial_schema.sql`, `docs/API_DRAFT.md` 18장(결정 1~25)
> 전제: **DB 구조를 바꾸지 않는다.** 모든 API는 기존 16개 테이블과 View `user_trust_stats`만 사용한다.
> v1.2는 확정본 v1.1(`develop`)과 팀원 문서 v0.3(`main`)을 `docs/API_DRAFT.md` 18.2(결정 20·21)에 따라 합친 문서다. v1.1의 기능 범위·권한·업무 규칙은 그대로 두고, 응답 형식과 일부 경로만 바꿨다.
> 아직 정하지 않은 항목은 **18장 미결정 항목(U1~U12)**에 모았고, 본문에는 `미결정 (U번호)`로 표시했다. 구현이 이 명세와 다른 곳은 **19장 구현 수정 사항(I번호)**에 모았다.

---

## 0. 공통 규칙

### 0.1 기본

| 항목 | 규칙 |
|---|---|
| Base URL | `/api/v1` (CLAUDE.md 7장). 개발 서버: `http://localhost:4000` (예: `GET http://localhost:4000/api/v1/products`) |
| HTTP 메서드 | `GET` 조회, `POST` 생성·동작, `PUT` 멱등 설정(좋아요·장바구니·차단·약속 변경 등), `PATCH` 일부 수정, `DELETE` 삭제·해제 |
| 형식 | JSON (`Content-Type: application/json`). 이미지 업로드만 `multipart/form-data` |
| 인증 | `Authorization: Bearer <accessToken>` (JWT, D2: Access Token만 사용, Refresh Token 없음). **만료 1시간** (결정 3). 만료되면 401 `INVALID_TOKEN` → 프론트엔드는 로그인 화면으로 보낸다 |
| 로그아웃 | API 없음. 클라이언트가 토큰을 삭제한다 (D2) |
| 사용자 ID | **JWT에서만** 가져온다. body·query의 사용자 ID로 "나"를 판단하지 않는다 (9.2 #4) |
| 상태 코드 값 | DB 코드 그대로 전달 (`ON_SALE` 등). 화면 문구는 프론트엔드가 매핑 (DATABASE.md 4.1) |
| 토큰 보관 위치 | **미결정 (U10)** |

**인증 표기**: `필수` = 토큰 없으면 401 / `선택` = 토큰이 있으면 개인화(내 좋아요 여부, 차단 사용자 상품 제외 등) / `없음`

**구현 상태 표기** (각 API의 `구현 상태` 줄)

| 표기 | 뜻 |
|---|---|
| `구현됨` | 현재 백엔드에 같은 경로·형식으로 구현되어 있다 |
| `구현 수정 필요` | 구현은 있지만 이 명세와 다르다. 업무 규칙은 명세를 따르고 **구현을 고친다** (API_DRAFT 18.2.4). 해당 I번호를 함께 적는다 |
| `미구현` | 아직 구현하지 않았다 |

### 0.2 표현 규칙 (결정 20)

| 항목 | 규칙 |
|---|---|
| 필드 이름 | API는 **camelCase**(요청 body·query·응답 모두). DB 컬럼은 snake_case |
| ID | **문자열** (`"15"`). 응답, 요청 body(`categoryId`, `chatRoomId`, `regionId` 등), query 모두 문자열. 경로 파라미터는 `^[1-9]\d*$` 형식만 허용 (아니면 400 `VALIDATION_ERROR`) |
| 숫자 값 | 금액, 개수(`favoriteCount`, `viewCount`, `reviewCount`), `avgRating`, `mannerTemperature`, `latitude`, `longitude`는 **숫자**. `pg`가 문자열로 돌려주는 `numeric`·`bigint` 집계는 서버가 숫자로 변환한다 (결정 2 중 유지되는 부분) |
| 시간 | UTC ISO 8601 문자열 (`"2026-10-13T03:00:00.000Z"`). 화면에서 KST로 표시 |
| 값 없음 | `null`. 빈 목록은 `[]` |
| 상태 값 | 대문자 코드 (`"ON_SALE"` 등) |

### 0.3 응답 종류 (결정 20)

모든 API는 다음 다섯 가지 중 하나만 사용한다. 각 API의 `응답` 줄에 ①~⑤로 표시한다.

| 종류 | 형식 | 대상 |
|---|---|---|
| ① 단건 리소스 | `{ "data": { "<리소스>": { ... } } }` | 상세 조회, 생성(201), 수정(200). 예: `data.product`, `data.transaction`, `data.user`, `data.appointment` |
| ② 목록 (커서) | `{ "data": { "items": [ ... ], "pageInfo": { "nextCursor": string\|null, "hasNext": boolean } } }` | 상품·좋아요·거래·메시지·알림 등 페이지가 있는 목록 |
| ③ 목록 (전체) | `{ "data": { "items": [ ... ] } }` | 페이지 없는 기준 데이터 목록. 예: 카테고리, 시·도, 시·군·구 |
| ④ 동작 결과 | `{ "data": { "<결과 이름>": { ... } } }`. 인증 결과만 `{ "data": { "accessToken", "expiresIn", "user" } }` | 좋아요·장바구니 → `data.favorite`, `data.cartItem`. 읽음 처리 → `data.read: { readCount }`. 개수 → `data.unreadCount: { count }`. 회원가입·로그인 → 인증 결과 |
| ⑤ 본문 없음 | `204 No Content` (JSON 본문 없음) | 상품 삭제, 차단 해제, 알림 읽음 등 반환할 데이터가 없는 경우 |

- ①의 `<리소스>` 이름은 위 예시처럼 리소스 이름을 단수 camelCase로 적는다 (예: `data.chatRoom`, `data.priceOffer`, `data.review`).
- 페이지 여부나 결과 이름이 결정되지 않은 응답은 `미결정 (U7)`, `미결정 (U9)`로 표시했다.

```json
// ① 단건
{ "data": { "product": { "id": "1", "title": "상품명" } } }

// ② 목록 (커서)
{ "data": { "items": [], "pageInfo": { "nextCursor": null, "hasNext": false } } }

// ③ 목록 (전체)
{ "data": { "items": [] } }
```

### 0.4 페이지네이션 (결정 20)

| query | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `limit` | 선택 | `20` | 조회할 개수, **1~100** (결정 1의 "최대 50"을 대체) |
| `cursor` | 선택 | 없음 | 이전 응답의 `pageInfo.nextCursor`. 서버가 만든 불투명 문자열이며 클라이언트는 받은 값을 그대로 다시 보낸다 |

- 키셋(커서) 페이지네이션을 쓴다 (DATABASE.md 8.2 `idx_products_latest` 등).
- 첫 요청에는 `cursor`를 보내지 않는다. 다음 페이지가 없으면 `nextCursor`는 `null`, `hasNext`는 `false`.
- 검색·필터·정렬 값은 각 목록 API에 따로 적는다. 정렬 방식이 바뀐 커서, 형식이 잘못된 커서는 400 `VALIDATION_ERROR`.

### 0.5 오류 응답 (결정 20)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다.",
    "details": { "title": "상품명은 1자 이상 100자 이하의 문자열이어야 합니다." }
  }
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `error.code` | 필수 | 아래 공통 code 중 하나 (`UPPER_SNAKE_CASE`) |
| `error.message` | 필수 | 상황 설명. 409는 `message`로 상황을 구분해 설명한다 |
| `error.details` | 선택 | 입력값 오류일 때 `{ [필드]: 메시지 }` |

| HTTP | code | 상황 |
|---|---|---|
| 400 | `INVALID_JSON` | JSON 문법 오류 |
| 400 | `VALIDATION_ERROR` | 형식·길이·범위 오류, 정의되지 않은 필드, 없는 카테고리·지역 (`details`에 필드 표시) |
| 401 | `AUTHENTICATION_REQUIRED` | 토큰 없음 |
| 401 | `INVALID_TOKEN` | 토큰이 잘못됐거나 만료됨 (Socket 이벤트 포함) |
| 401 | `INVALID_CREDENTIALS` | 로그인 실패 (이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않음) |
| 404 | `RESOURCE_NOT_FOUND` | 데이터가 없거나 **권한이 없음**. 당사자지만 그 행위의 주체가 아닌 경우(예: 판매자가 가격 제안 생성, 구매자가 예약 생성)도 404 (9.2 #3). 없는 API 경로도 404 |
| 409 | `RESOURCE_CONFLICT` | 중복, 상태 조건 불일치, 차단으로 막힘 (차단 사실을 드러내지 않는 일반 문구) |
| 429 | `RATE_LIMIT_EXCEEDED` | 메시지 전송 제한, 가격 제안 24시간 3회 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 오류, Storage 오류. 내부 메시지·SQL·스택 트레이스·환경변수를 노출하지 않는다 |

- **403은 쓰지 않는다** (결정 9). 권한·존재 여부를 숨겨야 하면 404, 요청 자체가 잘못되면 400 (DATABASE.md 9.2 원칙 유지).
- DB 에러 매핑: `23505`(UNIQUE) → 409 `RESOURCE_CONFLICT`, `23503`(FK) → 400 `VALIDATION_ERROR` 또는 404 `RESOURCE_NOT_FOUND`, `23514`(CHECK) → 400 `VALIDATION_ERROR`.
- **차단 관련 오류는 차단 사실을 드러내지 않는 일반 문구**로 응답한다 (D15, 10.9, 결정 7).
- 409 안에서 상황별로 다른 code를 둘지는 **미결정 (U3)**. 정해지기 전까지 409는 모두 `RESOURCE_CONFLICT`이고, 각 API의 오류 목록에는 v1.1의 기능별 상황 이름을 괄호로 남겨 둔다 (예: `409 RESOURCE_CONFLICT (OWN_PRODUCT)`). 괄호 안은 상황 설명이며 응답 code가 아니다.

**v1.1 기능별 code와의 대응** (API_DRAFT 18.2.2)

| v1.1 code | v1.2 |
|---|---|
| `UNAUTHORIZED` | `AUTHENTICATION_REQUIRED` / `INVALID_TOKEN` |
| `NOT_FOUND`, `REGION_NOT_FOUND` | `RESOURCE_NOT_FOUND` |
| `EMAIL_TAKEN`, `NICKNAME_TAKEN` | `RESOURCE_CONFLICT` + `details.email` / `details.nickname` |
| `INVALID_REGION`, `INVALID_CATEGORY`, `INVALID_PASSWORD`, `IMAGE_COUNT_INVALID`, `INVALID_IMAGE`, `INVALID_REPORT_CONTEXT` | `VALIDATION_ERROR` + `details` |
| `OFFER_PRICE_TOO_HIGH` (v1.1에서 400) | `VALIDATION_ERROR` + `details.offeredPrice` (18.2.2 표에는 없지만 HTTP 400의 공통 code는 이것뿐이다) |
| `OWN_PRODUCT`, `PRODUCT_NOT_EDITABLE`, `PRODUCT_NOT_ON_SALE`, `PRODUCT_NOT_AVAILABLE`, `PRODUCT_RESERVED`, `REGION_REQUIRED`, `CHAT_NOT_ALLOWED`, `CHAT_READ_ONLY`, `CHAT_UNAVAILABLE`, `OFFER_ALREADY_PENDING`, `OFFER_NOT_PENDING`, `APPOINTMENT_EXISTS`, `APPOINTMENT_NOT_ALLOWED`, `APPOINTMENT_NOT_CHANGEABLE`, `TRANSACTION_EXISTS`, `TRANSACTION_NOT_RESERVED`, `REVIEW_NOT_ALLOWED`, `REVIEW_PERIOD_EXPIRED`, `REVIEW_EXISTS`, `REPORT_ALREADY_PENDING`, `IMAGE_LIMIT_EXCEEDED`, `LAST_IMAGE` | `RESOURCE_CONFLICT` (상황은 `message`로 설명) |
| `RATE_LIMITED`, `OFFER_LIMIT_EXCEEDED` | `RATE_LIMIT_EXCEEDED` |
| `STORAGE_ERROR` | `INTERNAL_SERVER_ERROR` |
| `INTERNAL_ERROR` | `INTERNAL_SERVER_ERROR` |

### 0.6 입력값 검증

- 필수값, 타입(문자열·숫자·불리언), 문자열 길이와 허용 문자, 숫자 범위를 확인한다.
- **정의되지 않은 필드는 허용하지 않는다** (400 `VALIDATION_ERROR`, `details`에 해당 필드).
- 문자열을 숫자나 불리언으로 자동 변환하지 않는다. body의 금액은 JSON 숫자, ID는 문자열이다. query는 모두 문자열로 오므로 서버가 형식을 확인한다.
- 입력 오류가 여러 개면 `details`에 함께 담는다.

### 0.7 공통 응답 객체

```text
UserSummary     { id, nickname }
PublicProfile   { id, nickname, region: RegionName, mannerTemperature, avgRating, reviewCount, createdAt }   // 지역이 NULL인 회원의 region: 미결정 (U12)
RegionName      { id, sido, sigungu: string | null, eupmyeondong }
ProductSummary  { id, title, price, status, thumbnailUrl, region: RegionName, favoriteCount, createdAt, isDeleted }   // 미결정 (U6)
ImageItem       { id, url, sortOrder }        // url = {SUPABASE_URL}/storage/v1/object/public/reown-product-images/{storage_path}
```

- `mannerTemperature`, `avgRating`, `reviewCount`는 View `user_trust_stats`에서 계산한다 (D3). 후기가 없으면 36.5 / null / 0.
- `RegionName.sigungu`는 `string | null`이다. 세종특별자치시처럼 시·군·구가 없는 지역은 `null`이다 (`regions.sigungu` NULL 허용). 지역 API 응답의 `sigungu`도 같다.
- `email`은 본인 정보(`GET /users/me` 등)와 인증 결과에서만 반환한다. `password_hash`는 어떤 응답에도 넣지 않는다.
- `ProductSummary`는 v1.1의 필드를 camelCase로 옮긴 것이다. 현재 구현의 목록 항목은 `viewCount`, `category: { id, name }`를 더 담고 `isDeleted`가 없다. 어느 쪽으로 맞출지는 **미결정 (U6)**.
- Storage 연결 전까지 구현은 `thumbnailUrl`을 `null`, `images`를 `[]`로 반환한다 (이미지 기능 미구현).

### 0.8 CORS

- 등록된 프론트엔드 주소에서만 백엔드 API를 호출할 수 있다. 허용 주소는 백엔드 환경변수 `FRONTEND_URL`로 관리하고, 여러 개면 쉼표로 구분한다. 설정하지 않으면 개발 주소 `http://localhost:5173`을 허용한다.
- 모든 주소를 허용하는 `*`는 사용하지 않는다. 배포 환경에서는 실제 프론트엔드 주소만 허용한다.
- JWT를 쿠키가 아닌 `Authorization` 헤더로 보내므로 `credentials` 옵션은 사용하지 않는다.
- 허용 메서드는 이 명세가 쓰는 `GET`, `POST`, `PUT`, `PATCH`, `DELETE`(+ `OPTIONS`)다. 허용 헤더는 `Content-Type`, `Authorization`.
- 구현 상태: `구현됨` — 허용 메서드에 `PUT` 포함 (I1, 2026-10-14 수정 완료).

### 0.9 보안과 DB 처리

- 비밀번호는 bcrypt(cost 10 이상)로 해시하여 저장한다.
- 모든 SQL 값은 `pg`의 `$1`, `$2`와 같은 파라미터로 전달한다. 사용자 입력을 SQL 문자열에 직접 붙이지 않는다.
- JWT, DB 비밀번호, Service Role Key를 응답이나 로그에 기록하지 않는다.
- 공개 상품 조회에서는 소프트 삭제된 상품을 제외한다.
- 여러 테이블을 함께 변경할 때는 DB 트랜잭션을 사용한다.
- Socket.IO 전송은 DB **COMMIT 후**에 한다 (12.3).

---

## 1. 인증 / 회원

관련 테이블: `users`, `regions`, `user_trust_stats`(View), `reviews`, `products`

### POST /auth/signup — 회원가입
- 인증: 없음
- 요청: `{ email, password, nickname, regionId }`
  - email: trim + 소문자 정규화, 최대 255자
  - password: **8~72자**. bcrypt는 **72바이트**까지만 사용하므로 UTF-8 기준 72바이트를 넘으면 400 (한글 등 다중 바이트 문자를 포함한 경우) (결정 3)
  - nickname: `^[가-힣a-zA-Z0-9]{2,20}$` (D17)
  - regionId: **필수** (결정 18). 존재하는 `regions.id`인지 서버가 확인한다. 누락·`null`·ID 형식이 아님·존재하지 않는 지역 → 400 `VALIDATION_ERROR` + `details.regionId`
  - 따라서 이 API로 가입한 회원은 가입 시점부터 지역이 설정되어 있다. 가입 후에는 다른 지역으로 변경할 수 있지만 NULL로 해제할 수는 없다 (`PATCH /users/me`, 결정 11). 결정 18 이전 데이터 등 예외는 로그인의 결정 24를 참고한다
- 응답: ④ `201 { data: { accessToken, expiresIn, user: { id, email, nickname, region: RegionName } } }`
  - `user.region`: 회원가입은 지역이 필수(결정 18)이므로 항상 `RegionName` 객체다 (`null`이 아니다)
  - `expiresIn`: 발급한 Access Token의 `exp − iat`(초). 기본 설정에서 `3600` (결정 25)
- 권한: 없음
- 에러: 400 `VALIDATION_ERROR`, 409 `RESOURCE_CONFLICT` + `details.email` (EMAIL_TAKEN), 409 `RESOURCE_CONFLICT` + `details.nickname` (NICKNAME_TAKEN)
- 처리: bcrypt(cost 10 이상) 해시만 저장 (10.1)
- 비고: 지역 목록은 `regions` 기준 데이터(D7)에서 고른다. 지역 seed가 적용되기 전에는 회원가입을 할 수 없다
- 구현 상태: `구현됨` — `regionId` 필수·존재 확인·저장, 응답 `user.region` 객체와 `expiresIn` (I4, 2026-10-15). 비밀번호 검증은 I2, JWT 기본 만료는 I3에서 수정

### POST /auth/login — 로그인
- 인증: 없음
- 요청: `{ email, password }`
- 응답: ④ `200 { data: { accessToken, expiresIn, user: { id, email, nickname, region: RegionName | null } } }`
  - `user.region` (결정 24, 예외 처리 규칙): `users.region_id`가 NULL인 회원도 로그인을 거부하지 않고 `region: null`로 응답한다. 회원가입에서 지역이 필수(결정 18)이므로 정상 흐름에서는 발생하지 않는다. 이런 회원이 실제로 있는지는 확인하지 않았다 (API_DRAFT 19.1 #5)
  - `expiresIn`: 발급한 Access Token의 `exp − iat`(초). 기본 설정에서 `3600` (결정 25)
- 에러: 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` (이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않음)
- 토큰 만료: 기본 1시간 (결정 3). Refresh Token 없음
- 비고: 회원가입 규칙(8~72자)으로 만든 비밀번호는 모두 로그인할 수 있어야 한다
- 구현 상태: `구현됨` — 응답 `user.region`(지역이 없으면 `null`, 결정 24)과 `expiresIn` (I4, 2026-10-15). 비밀번호 검증은 I2, JWT 기본 만료는 I3에서 수정

### GET /users/me — 내 정보
- 인증: 필수
- 응답: ① `data.user: { id, email, nickname, region: RegionName, mannerTemperature, avgRating, reviewCount, createdAt }`
  - 지역이 NULL인 회원의 `region` 처리는 **미결정 (U12)**
- 에러: 401
- 구현 상태: `미구현`

### PATCH /users/me — 닉네임·지역 변경
- 인증: 필수
- 요청: `{ nickname?, regionId? }`
  - regionId: 보내면 다른 지역으로 **변경**한다. 존재하는 `regions.id`인지 서버가 확인한다 (없으면 400 `VALIDATION_ERROR` + `details.regionId`). `null`(지역 해제)도 400 `VALIDATION_ERROR`. 보내지 않으면 지역은 그대로다
  - 사용자는 가입부터 항상 하나의 지역을 설정한 상태를 유지한다 (결정 11)
- 응답: ① `data.user` (내 정보와 같은 형식)
- 권한: 본인
- 에러: 400 `VALIDATION_ERROR`, 409 `RESOURCE_CONFLICT` + `details.nickname` (NICKNAME_TAKEN)
- 비고: 닉네임 변경 제한 없음 (D28). 지역을 바꿔도 이미 등록한 상품의 지역은 바뀌지 않음 (D20)
- 구현 상태: `미구현`

### PATCH /users/me/email — 이메일 변경
- 인증: 필수
- 요청: `{ email, currentPassword }`
- 응답: ① `data.user` (내 정보)
- 권한: 본인 + 현재 비밀번호 확인
- 에러: 400 `VALIDATION_ERROR` (+ `details.currentPassword`: 현재 비밀번호 불일치, v1.1 INVALID_PASSWORD), 409 `RESOURCE_CONFLICT` + `details.email` (EMAIL_TAKEN)
- 구현 상태: `미구현`

### PATCH /users/me/password — 비밀번호 변경
- 인증: 필수
- 요청: `{ currentPassword, newPassword }` (newPassword 규칙은 회원가입과 같음)
- 응답: ⑤ `204`
- 권한: 본인 + 현재 비밀번호 확인 (9.1)
- 에러: 400 `VALIDATION_ERROR` (+ `details.currentPassword`: 현재 비밀번호 불일치, v1.1 INVALID_PASSWORD)
- 구현 상태: `미구현`

### GET /users/:userId — 공개 프로필
- 인증: 없음
- 응답: ① `data.user: PublicProfile` (email 제외)
- 에러: 404
- 구현 상태: `미구현`

### GET /users/:userId/products — 사용자의 판매 상품
- 인증: 선택
- 요청(query): `status?`, `cursor?`, `limit?`
- 응답: ② `items: ProductSummary[]` (삭제된 상품 제외, 최신순). 항목 필드는 **미결정 (U6)**
- 에러: 404
- 차단: 내가 차단한 사용자의 프로필에 직접 들어온 경우는 상품 상세와 같이 허용한다 (17장 #7). 차단당한 사람에게 차단 사실은 드러내지 않는다
- 구현 상태: `미구현`

### GET /users/:userId/reviews — 받은 후기
- 인증: 없음
- 요청(query): `cursor?`, `limit?`
- 응답: ② `items: [{ id, rating, content, createdAt, reviewer: UserSummary, reviewerRole: "SELLER"|"BUYER", product: { id, title, isDeleted } }]`
- 비고: 후기는 누구나 조회 (9.1). 삭제된 상품도 제목을 표시 (7장)
- 구현 상태: `미구현`

### GET /users/me/products — 내 판매 상품
- 인증: 필수
- 요청(query): `status?` (`ON_SALE`·`RESERVED`·`SOLD`), `cursor?`, `limit?`
- 응답: ② `items: ProductSummary[]` (삭제 제외). 항목 필드는 **미결정 (U6)**
- 테이블: `products` (`idx_products_seller`)
- 구현 상태: `미구현`

---

## 2. 지역

관련 테이블: `regions` (D7). **`001_regions.sql`이 적용되기 전에는 빈 결과를 반환한다.**

### GET /regions/sido — 시·도 목록
- 인증: 없음
- 응답: ③ `data.items` (예: `"서울특별시"`, `"부산광역시"` …). 항목을 문자열로 둘지 객체로 둘지는 **미결정 (U8)**
- 구현 상태: `미구현`

### GET /regions/sigungu — 시·군·구 목록
- 인증: 없음
- 요청(query): `sido` (필수)
- 응답: ③ `data.items` (예: `"강남구"` …). 세종특별자치시는 시·군·구가 없으므로 빈 배열. 항목 형식은 **미결정 (U8)**
- 에러: 400 `VALIDATION_ERROR`
- 구현 상태: `미구현`

### GET /regions — 읍·면·동 목록·검색
- 인증: 없음
- 요청(query): `keyword?`(읍·면·동 이름 일부, 1~50자), `sido?`, `sigungu?`, `limit?` (결정 21)
  - `keyword` 또는 `sido`(+`sigungu`) 중 **하나 이상 필수**. 조건이 하나도 없으면 400 `VALIDATION_ERROR`
  - `sigungu`만 보내고 `sido`가 없으면 400 `VALIDATION_ERROR`
- 응답: `items: [{ id, code, sido, sigungu, eupmyeondong }]`. 커서 페이지(②)를 둘지, `limit`만 두는 전체 목록(③)으로 둘지는 **미결정 (U7)**. 현재 구현은 `limit`(기본 20, 1~100)만 받고 `data.items`로 응답한다
- 에러: 400 `VALIDATION_ERROR`
- 테이블: `regions` (`idx_regions_sido_sigungu`)
- 구현 상태: `구현 수정 필요` — `keyword` 검색만 구현, `keyword`가 항상 필수, `sido`·`sigungu` 조건 없음 (I10)

### GET /regions/by-code/:code — 법정동 코드로 조회
- 인증: 없음
- 용도: 카카오 주소 검색 결과의 `b_code`(10자리)를 `regions`와 매칭. 리 단위 코드면 서버가 마지막 2자리를 `00`으로 바꿔 조회 (5.2)
- 응답: ① `data.region: { id, code, sido, sigungu, eupmyeondong }`
- 에러: 400 `VALIDATION_ERROR` (10자리 숫자가 아님), 404 `RESOURCE_NOT_FOUND` (v1.1 REGION_NOT_FOUND)
- 구현 상태: `미구현`

---

## 3. 카테고리

### GET /categories — 카테고리 목록
- 인증: 없음
- 응답: ③ `data.items: [{ id, name }]` (`sort_order`, `id` 순)
  - v1.1은 항목에 `sort_order`를 포함했고 현재 구현은 `{ id, name }`만 응답한다. `sortOrder`를 넣을지는 **미결정 (U8)**
- 테이블: `categories`. 사용자 API로는 수정하지 않는다 (5.3)
- 구현 상태: `구현됨` (`{ id, name }`)

---

## 4. 상품

관련 테이블: `products`, `product_images`, `categories`, `regions`, `users`, `favorites`, `cart`, `chat_rooms`, `blocks`, `user_trust_stats`, Supabase Storage

### GET /products — 상품 목록·검색
- 인증: 선택
- 요청(query) (결정 21: 구현의 query 이름 유지 + v1.1 기능 추가)
  - `keyword?`: 상품명 검색, 1~100자 (`%`, `_` 이스케이프 후 ILIKE, `idx_products_title_trgm`)
  - `categoryId?`
  - 지역: `regionId?` 또는 `sido?` + `sigungu?` (시·군·구 단위 필터)
  - `minPrice?`, `maxPrice?`: 1~1,000,000,000. `minPrice`가 `maxPrice`보다 크면 400
  - `status?`: `ON_SALE`, `RESERVED`, `SOLD` (콤마로 여러 개)
  - `sort?`: `latest`(기본) / `oldest` / `priceAsc` / `priceDesc` / `views` (허용 목록 매핑, 15.1 #4)
  - `cursor?`, `limit?`
- 응답: ② `items: [ProductSummary + { seller: { id, nickname, mannerTemperature } }]`. `seller` 외의 항목 필드는 **미결정 (U6)**
- 조건: `deleted_at IS NULL`. 로그인했으면 **내가 차단한 사용자의 상품 제외** (D15)
- 에러: 400 `VALIDATION_ERROR` (잘못된 sort·가격 범위·커서 등)
- 구현 상태: `구현 수정 필요` — `sido`·`sigungu` 필터 없음, `status` 하나만 허용, 항목에 `seller` 없음 (I9)

### GET /products/:productId — 상품 상세
- 인증: 선택
- 응답: ① `data.product`
  ```text
  { id, title, description, price, status, viewCount, createdAt, updatedAt,
    category: { id, name }, region: RegionName, images: ImageItem[],
    seller, favoriteCount,
    isMine, isFavorited, isInCart, myChatRoomId }   // 개인화 필드는 로그인 시에만
  ```
  - `seller`: v1.1은 `PublicProfile`, 현재 구현은 `{ id, nickname, reviewCount, avgRating, mannerTemperature }`. **미결정 (U5)**
- 조건: 삭제된 상품은 404. 차단한 사용자의 상품도 **직접 접근은 허용** (17장 #7)
- 부수 효과: 조회수 +1 (D25). 본인 조회 제외, 같은 사용자(비로그인은 IP)·상품은 10분에 1회. 서버 메모리로 처리. `updated_at`은 바뀌지 않음 (트리거 조건)
- 에러: 400 `VALIDATION_ERROR` (ID 형식), 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `구현 수정 필요` — `isMine`, `isInCart`, `myChatRoomId` 없음 (결정 21, I8). `images`는 Storage 연결 전까지 `[]`

### POST /products — 상품 등록
- 인증: 필수
- 요청: `multipart/form-data`
  - `categoryId`, `title`(1~100자), `description`(1~2000자), `price`(1~1,000,000,000)
  - `images`: 파일 1~10개. 보낸 순서가 `sort_order` 0~9 (0번이 대표 이미지)
- 응답: ① `201 data.product` (상품 상세와 같은 형식)
- 권한·조건
  - 상품 `region_id`는 등록 시점의 내 지역(`users.region_id`)을 서버가 자동 저장한다 (D20)
  - 지역이 없는 사용자는 등록할 수 없다는 D20 조건은 유지한다. 회원가입에서 지역이 필수이고 해제할 수 없으므로 API로 가입한 사용자는 항상 이 조건을 충족한다. 다만 DB 컬럼은 NULL을 허용하므로 서버는 방어적으로 확인하고, NULL이면 409 `RESOURCE_CONFLICT` (REGION_REQUIRED, 정상 흐름에서는 발생하지 않음)
  - `seller_id` = 나, `status` = `ON_SALE`
- 처리: 한 트랜잭션에서 `products` INSERT → Storage 업로드(`products/{product_id}/{uuid}.{ext}`, 경로는 서버가 생성) → `product_images` INSERT. 실패하면 롤백하고 올린 파일 삭제
- 에러: 400 `VALIDATION_ERROR` (+ `details`: 형식, 없는 카테고리(INVALID_CATEGORY), 이미지 개수(IMAGE_COUNT_INVALID), 이미지 형식·크기·확장자·MIME(INVALID_IMAGE)), 409 `RESOURCE_CONFLICT` (REGION_REQUIRED), 500 `INTERNAL_SERVER_ERROR` (STORAGE_ERROR)
- 이미지 규칙 (결정 4): **JPG / PNG / WebP**, 장당 **최대 10MB**, 상품당 **1~10장**. WebP 자동 변환 없음(원본 형식 그대로 저장). 확장자와 MIME을 함께 검증
- 구현 시점: 이미지 업로드는 **상품 등록 기능 구현 단계**에서 개발한다
- Storage 버킷 (결정 12): **`reown-product-images`** (공개 읽기, 업로드·삭제는 백엔드 service role 키로만). 파일 경로는 버킷 안의 `products/{product_id}/{uuid}.{ext}`이고 이 경로를 `product_images.storage_path`에 저장한다
- 구현 상태: `미구현`

### PATCH /products/:productId — 상품 수정
- 인증: 필수
- 요청: `{ categoryId?, title?, description?, price? }` (하나 이상. 이 4개 외의 필드는 400)
  - `categoryId`: 존재하는 카테고리 ID (없으면 400 `VALIDATION_ERROR` + `details.categoryId`)
  - `title`: 1~100자, `description`: 1~2000자 (앞뒤 공백 제거 후 저장), `price`: 1~1,000,000,000 정수
- 응답: ① `200 data.product` (**상품 상세와 같은 형식**, 결정 20)
- 권한·조건: `seller_id = 나` + `status = 'ON_SALE'` + 삭제 안 됨 (D21)
- 가격 인하 처리 (결정 8·14): 새 가격이 대기 중(`PENDING`) 제안 금액 **이하**가 되면, 같은 트랜잭션에서 그 제안을 **`REJECTED`로 자동 처리**한다 (`responded_at = now()`). 해당 구매자에게 **`PRICE_OFFER_REJECTED` 알림을 보낸다** (기존 type 사용). 알림 행은 같은 트랜잭션에서 INSERT하고, 소켓 전송은 COMMIT 후
- 에러: 400 `VALIDATION_ERROR`, 404 `RESOURCE_NOT_FOUND` (없거나 내 상품 아님), 409 `RESOURCE_CONFLICT` (PRODUCT_NOT_EDITABLE: 내 상품이지만 판매중 아님)
- 구현 상태: `구현 수정 필요` — 수정된 DB 행을 그대로 반환, 가격 인하 시 대기 제안 자동 거절과 알림 없음 (I6, I7)

### DELETE /products/:productId — 상품 삭제 (소프트 삭제)
- 인증: 필수
- 응답: ⑤ `204`
- 권한·조건: `seller_id = 나` + `status IN ('ON_SALE','SOLD')`. 예약중이면 불가 (D10)
- 처리 (결정 13·17)
  1. **DB 트랜잭션**: `deleted_at = now()` + **자동 정리**(11.3 "상품 삭제": 모든 방의 대기·수락 제안 → EXPIRED, 미래 약속 → CANCELED, 지난 약속 → EXPIRED) + 각 구매자에게 `PRICE_OFFER_EXPIRED` / `APPOINTMENT_CANCELED` 알림 + 그 상품의 **`product_images` 행 삭제** → COMMIT
  2. **COMMIT 후** 소켓 알림 전송
  3. 이어서 Storage에서 그 상품의 이미지 파일을 삭제한다 (삭제할 경로는 1단계에서 행을 지우기 전에 읽어 둔다)
- Storage 삭제 실패 처리
  - DB 트랜잭션과 Storage는 하나로 묶을 수 없다. 그래서 **DB를 먼저 확정하고, 파일 삭제는 COMMIT 후에** 한다. COMMIT 전에 파일을 지우면 DB가 롤백됐을 때 판매중 상품의 이미지가 사라지기 때문이다
  - 파일 삭제가 실패해도 **DB의 상품 삭제 결과를 되돌리지 않는다**. API는 `204`로 응답하고, 실패한 상품 id와 경로를 서버 로그에 남겨 추후 정리한다
  - 남은 파일은 경로가 `products/{product_id}/`로 시작하므로, 삭제된 상품(`deleted_at IS NOT NULL`)의 폴더를 나중에 다시 지우면 정리된다 (재시도·정리 방법은 구현 단계에서 정한다)
- 삭제 후 표시: 채팅·거래·후기 내역에서 삭제된 상품은 제목 등은 그대로 보여주고, 이미지는 없으므로 `thumbnailUrl: null`(프론트엔드는 기본 이미지 표시)
- 에러: 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (PRODUCT_RESERVED)
- 구현 상태: `구현 수정 필요` — 자동 정리와 알림 행 생성은 구현됨. `product_images` 행 삭제와 COMMIT 후 Storage 파일 삭제, COMMIT 후 소켓 전송이 없음 (I11, I12)

---

## 5. 상품 이미지

관련 테이블: `product_images`, `products`(updated_at), Supabase Storage

공통 조건: `seller_id = 나` + `ON_SALE` + 삭제 안 됨 (이미지 변경도 상품 수정, D21). **변경할 때마다 같은 트랜잭션에서 `products.updated_at = now()`** (5.5)

이미지 규칙은 4장과 같다 (JPG/PNG/WebP, 장당 10MB, 최대 10장, 변환 없음). 구현은 상품 등록 기능 구현 단계에서 한다.

**더미(개발·시연용) 상품 이미지** (결정 15): 더미 이미지도 `reown-product-images` 버킷에 업로드하고, `product_images.storage_path`에는 **Storage 경로**만 저장한다. 외부 이미지 URL을 `storage_path`에 직접 저장하지 않는다.

**응답 형식**: 아래 세 API는 v1.1에서 `ImageItem[]`(전체 이미지, 순서대로)를 반환했다. v1.2 응답 종류(①~⑤) 중 무엇으로 감쌀지는 **미결정 (U9)**.

### POST /products/:productId/images — 이미지 추가
- 인증: 필수
- 요청: `multipart/form-data` `images` (추가 후 총 10장 이하)
- 응답: 전체 이미지 `ImageItem[]` — 형식 **미결정 (U9)**
- 에러: 400 `VALIDATION_ERROR` (INVALID_IMAGE), 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (PRODUCT_NOT_EDITABLE, IMAGE_LIMIT_EXCEEDED)
- 구현 상태: `미구현`

### DELETE /products/:productId/images/:imageId — 이미지 삭제
- 인증: 필수
- 응답: 남은 이미지 `ImageItem[]` — 형식 **미결정 (U9)**. 남은 이미지의 `sort_order`를 0부터 다시 채운다
- 처리: DB 트랜잭션(행 삭제, 순서 재정렬, `products.updated_at` 갱신) COMMIT 후 Storage 파일 삭제. 파일 삭제 실패 시 처리는 상품 삭제와 같다 (로그 기록, 응답은 성공)
- 에러: 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (PRODUCT_NOT_EDITABLE, LAST_IMAGE: 최소 1장, D17)
- 구현 상태: `미구현`

### PUT 또는 PATCH /products/:productId/images/order — 이미지 순서 변경
- 메서드: v1.1은 `PUT`, v0.3은 `PATCH`. **미결정 (U2)**
- 인증: 필수
- 요청: `{ imageIds: [..] }`. 현재 이미지 전체를 새 순서로 (`UNIQUE (product_id, sort_order) DEFERRABLE` 덕분에 한 트랜잭션에서 교체 가능)
- 응답: 전체 이미지 `ImageItem[]` — 형식 **미결정 (U9)**
- 에러: 400 `VALIDATION_ERROR` (목록이 현재 이미지 집합과 다름), 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (PRODUCT_NOT_EDITABLE)
- 구현 상태: `미구현`

---

## 6. 좋아요

관련 테이블: `favorites`, `products`, `blocks`. 좋아요 수는 공개, 목록은 본인만 (D5)

좋아요는 결정 21에 따라 `PUT` / `DELETE`로 통일한다. 같은 요청을 반복해도 결과가 같다. `POST` 한 번으로 추가·취소를 전환하는 방식은 쓰지 않는다.

### PUT /products/:productId/favorite — 좋아요
- 인증: 필수
- 응답: ④ `200 data.favorite: { productId, isFavorited: true, favoriteCount }` (이미 눌렀어도 200, `ON CONFLICT DO NOTHING`)
- 조건: 자기 상품 불가 (D26), 삭제된 상품 불가
- 에러: 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (OWN_PRODUCT)
- 구현 상태: `구현 수정 필요` — 현재 `POST /products/:productId/favorite` 한 번으로 추가·취소를 전환하고, 응답이 `data.favorite` 없이 `data`에 바로 담김 (I5). CORS `PUT` 허용은 I1에서 수정 완료

### DELETE /products/:productId/favorite — 좋아요 취소
- 인증: 필수
- 응답: ④ `200 data.favorite: { productId, isFavorited: false, favoriteCount }` (없어도 200)
- 에러: 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `구현 수정 필요` — 현재 `POST` 전환 방식에 포함됨 (I5)

### 좋아요 목록 — `GET /favorites` 또는 `GET /users/me/favorites`
- 경로: 현재 구현은 `GET /favorites`, v1.1은 `GET /users/me/favorites`. 장바구니 목록과 같은 방식으로 맞춘다. **미결정 (U1)**
- 인증: 필수
- 요청(query): `cursor?`, `limit?`
- 응답: ② `items: [ProductSummary + { favoritedAt }]` (최근순, `idx_favorites_user_created`). 항목 필드는 **미결정 (U6)** — 현재 구현은 `{ id, title, price, status, favoriteCount, thumbnailUrl, category, region, favoritedAt }`
- 조건: 삭제된 상품 제외 (7장). 차단한 사용자의 상품 제외 (D15 "내 목록")
- 구현 상태: `구현됨` (`GET /favorites` 경로로)

---

## 7. 장바구니

관련 테이블: `cart`, `products`, `blocks`. **개수와 목록 모두 본인만** (D5). 결제 없음

### PUT /products/:productId/cart — 장바구니 담기
- 인증: 필수
- 응답: ④ `200 data.cartItem` (v1.1: `{ in_cart: true }`). `cartItem` 안의 필드는 **미결정 (U9)**
- 조건: 자기 상품·삭제된 상품 불가 (D26)
- 에러: 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (OWN_PRODUCT)
- 구현 상태: `미구현`

### DELETE /products/:productId/cart — 장바구니 빼기
- 인증: 필수
- 응답: ④ `200 data.cartItem` (v1.1: `{ in_cart: false }`). 필드는 **미결정 (U9)**
- 구현 상태: `미구현`

### 장바구니 목록 — `GET /cart` 또는 `GET /users/me/cart`
- 경로: 좋아요 목록과 같은 방식으로 맞춘다. **미결정 (U1)**
- 인증: 필수
- 요청(query): `cursor?`, `limit?`
- 응답: ② `items: [ProductSummary + { addedAt }]`. 항목 필드는 **미결정 (U6)**
- 조건: 좋아요 목록과 같음
- 구현 상태: `미구현`

---

## 8. 채팅방 / 메시지

관련 테이블: `chat_rooms`, `messages`, `products`, `blocks`, `price_offers`, `trade_appointments`, `transactions`

**참여자** = `chat_rooms.buyer_id` 또는 `products.seller_id`. 참여자가 아니면 모든 채팅 API에서 404 (9.2 #2)

### POST /products/:productId/chat-rooms — 채팅 시작
- 인증: 필수
- 요청: 없음 (구매자 = 나)
- 응답: ① 기존 방이 있으면 `200`, 새로 만들면 `201` + `data.chatRoom` (채팅방 상세와 같은 형식)
- 조건 (D23, D15)
  - 기존 방이 있으면 상품 상태와 관계없이 그 방을 반환 (`ON CONFLICT DO NOTHING` 후 조회)
  - 새 방: 자기 상품 아님, 상품이 `ON_SALE`/`RESERVED`이고 삭제 안 됨, 어느 방향으로도 차단 없음
- 에러: 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (OWN_PRODUCT / CHAT_NOT_ALLOWED: 거래완료 / CHAT_UNAVAILABLE: 차단, 일반 문구)
- 구현 상태: `미구현`

### GET /chat-rooms — 내 채팅방 목록
- 인증: 필수
- 요청(query): `role?` (`all`·`buying`·`selling`), `cursor?`, `limit?`
- 응답: ② `items: [{ id, myRole: "BUYER"|"SELLER", counterpart: UserSummary, product: ProductSummary, lastMessage: { content, senderId, createdAt }|null, unreadCount, canSend }]` (마지막 메시지 최신순)
- 비고: `canSend=false`의 이유(차단·삭제)는 구분해서 내려주지 않는다 (차단 사실 미노출)
- 구현 상태: `미구현`

### GET /chat-rooms/unread-count — 안 읽은 메시지 수 (전체)
- 인증: 필수
- 응답: ④ `data.unreadCount: { count }` (`idx_messages_unread`). 재접속·로그인 시 호출 (12.3 #4)
- 구현 상태: `미구현`

### GET /chat-rooms/:roomId — 채팅방 상세
- 인증: 필수
- 응답: ① `data.chatRoom: { id, myRole, counterpart, product, canSend, pendingOffer, currentAppointment, transaction }`
  - `pendingOffer`: 이 방의 PENDING 제안 또는 null
  - `currentAppointment`: 이 방의 SCHEDULED 약속 또는 null (`isPast` 포함)
  - `transaction`: 이 방 구매자와의 RESERVED/COMPLETED 거래 또는 null. 거래 객체 필드는 **미결정 (U4)**
- 권한: 참여자. 에러: 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `미구현`

### GET /chat-rooms/:roomId/messages — 메시지 내역
- 인증: 필수
- 요청(query): `cursor?`, `limit?` (최신순 역방향, `idx_messages_room`)
  - v1.1의 `before_id`는 결정 20의 커서 방식(②)으로 바꾼다
- 응답: ② `items: [{ id, senderId, content, readAt, createdAt }]`
- 권한: 참여자 (삭제된 상품의 방도 읽기 가능, D23). 에러: 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `미구현`

### 메시지 전송 — Socket.IO `chat:send`
- 메시지 **전송은 Socket.IO**, 기존 메시지 **조회는 REST**(`GET /chat-rooms/:roomId/messages`)로 한다. REST 전송 API는 두지 않는다 (결정 5)
- 인증: 연결할 때 JWT 검증 (16장). 이벤트를 처리할 때도 토큰 만료를 확인하고, 만료되었으면 `INVALID_TOKEN` 오류를 돌려준 뒤 연결을 끊는다
- 요청: `socket.emit("chat:send", { roomId, content, clientMessageId? }, ack)`
  - content: trim 후 1자 이상, 1000자 이하. 원문 저장, HTML 저장 안 함
  - clientMessageId: 선택. 프론트엔드가 보낸 메시지와 ack를 맞추기 위한 임시 ID (DB에 저장하지 않음)
- 응답(ack): 성공 `{ data: { message: { id, chatRoomId, senderId, content, readAt: null, createdAt } } }` / 실패 `{ error: { code, message, details? } }` (REST와 같은 형식)
- 조건: 참여자, 차단 없음, 상품이 삭제되지 않음. 거래완료 상품의 기존 방은 전송 가능 (D23)
- 처리: `messages` INSERT → COMMIT 후 `chat:message`(`chat:{roomId}` 방), `chat:new-message`(상대 `user:` 방) 전송. 알림 테이블에는 저장하지 않음 (D12)
- 속도 제한: 사용자별 기본 rate limit을 서버 메모리로 적용한다 (D23). 기본값 예: **10초에 10개**, 구현 시 조정
- 에러 code: `VALIDATION_ERROR`, `INVALID_TOKEN`, `RESOURCE_NOT_FOUND`(참여자 아님), `RESOURCE_CONFLICT`(CHAT_READ_ONLY: 삭제된 상품 / CHAT_UNAVAILABLE: 차단, 일반 문구), `RATE_LIMIT_EXCEEDED`
- 구현 상태: `미구현` (Socket 서버 미구현)

### POST /chat-rooms/:roomId/read — 읽음 처리
- 인증: 필수
- 응답: ④ `data.read: { readCount }`. 상대가 보낸 안 읽은 메시지의 `read_at`을 일괄 갱신 (12.3 #5)
- 처리: Socket.IO `chat:read`(방) 전송
- 권한: 참여자. 에러: 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `미구현`

---

## 9. 가격 제안

관련 테이블: `price_offers`, `chat_rooms`, `products`, `blocks`, `notifications`

### POST /chat-rooms/:roomId/price-offers — 가격 제안
- 인증: 필수
- 요청: `{ offeredPrice }`
- 응답: ① `201 data.priceOffer: { id, offeredPrice, status: "PENDING", createdAt }`
- 권한: 이 방의 **구매자** (판매자·비참여자 → 404)
- 조건 (D22): 상품 `ON_SALE` + 삭제 안 됨, `offeredPrice < products.price`, 이 방에서 최근 24시간 제안 3회 미만, 대기 중 제안 없음, 차단 없음
- 알림: 판매자 ← `PRICE_OFFER_RECEIVED`
- 에러: 400 `VALIDATION_ERROR` (+ `details.offeredPrice`: 상품 가격 이상, v1.1 OFFER_PRICE_TOO_HIGH), 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (PRODUCT_NOT_ON_SALE / OFFER_ALREADY_PENDING: `uq_price_offers_pending` / CHAT_UNAVAILABLE), 429 `RATE_LIMIT_EXCEEDED` (OFFER_LIMIT_EXCEEDED)
- 구현 상태: `미구현`

### GET /chat-rooms/:roomId/price-offers — 제안 내역
- 인증: 필수
- 응답: 제안 목록 `[{ id, offeredPrice, status, respondedAt, createdAt }]`과 남은 제안 횟수 `remainingOffers24h`(구매자에게만). 목록과 추가 값을 함께 담는 형식은 **미결정 (U9)**
- 권한: 참여자
- 구현 상태: `미구현`

### POST /price-offers/:offerId/accept — 수락
### POST /price-offers/:offerId/reject — 거절
- 인증: 필수
- 응답: ① `data.priceOffer: { id, offeredPrice, status, respondedAt }`
- 권한: 그 방 상품의 **판매자**
- 조건: `status = 'PENDING'` (조건부 UPDATE, 15.3), 상품 `ON_SALE` 또는 `RESERVED` + 삭제 안 됨 (17장 #5)
- 알림: 구매자 ← `PRICE_OFFER_ACCEPTED` / `PRICE_OFFER_REJECTED`
- 에러: 404 `RESOURCE_NOT_FOUND` (판매자가 아닌 경우 포함), 409 `RESOURCE_CONFLICT` (OFFER_NOT_PENDING / PRODUCT_NOT_AVAILABLE)
- 구현 상태: `미구현`

### POST /price-offers/:offerId/cancel — 제안 취소
- 인증: 필수
- 응답: ① `data.priceOffer: { id, status: "CANCELED", respondedAt }`
- 권한: 그 방의 **구매자**. 조건: `PENDING`
- 알림: 없음 (알림 type에 없음)
- 에러: 404 `RESOURCE_NOT_FOUND` (구매자가 아닌 경우 포함), 409 `RESOURCE_CONFLICT` (OFFER_NOT_PENDING)
- 구현 상태: `미구현`

---

## 10. 거래 약속

관련 테이블: `trade_appointments`, `chat_rooms`, `products`, `transactions`, `blocks`, `notifications`
위치(장소·좌표)는 **채팅방 참여자에게만** 반환 (5.11, 15.2)

약속 객체: `{ id, proposerId, scheduledAt, placeName, placeAddress, latitude, longitude, status, closedAt, closedBy, createdAt, isPast }`

### POST /chat-rooms/:roomId/appointments — 약속 만들기
- 인증: 필수
- 요청: `{ scheduledAt, placeName, placeAddress?, latitude?, longitude? }` (좌표는 둘 다 있거나 둘 다 없음)
  - 장소는 프론트엔드가 **카카오 지도 JavaScript SDK**로 고른 값을 보낸다 (결정 10). 백엔드는 카카오 API를 호출하지 않고 값의 형식·범위만 검증한다
- 응답: ① `201 data.appointment`
- 권한: 참여자 (판매자·구매자 모두)
- 조건 (D14, 17장 #6): 차단 없음, `scheduledAt > now()`, 상품이 `ON_SALE`이거나 `RESERVED`이면서 이 방이 예약된 구매자의 방. 거래완료·삭제 상품 불가
- 처리: 이 방에 **지난** SCHEDULED 약속이 있으면 먼저 `EXPIRED`로 종료. **미래** SCHEDULED 약속이 있으면 409 (변경 API 사용)
- 알림: 상대방 ← `APPOINTMENT_CREATED`
- 에러: 400 `VALIDATION_ERROR`, 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (APPOINTMENT_EXISTS / APPOINTMENT_NOT_ALLOWED / CHAT_UNAVAILABLE)
- 구현 상태: `미구현`

### GET /chat-rooms/:roomId/appointments — 약속 내역 (변경 이력 포함)
- 인증: 필수
- 응답: `items: 약속 객체[]` (최신순, `idx_trade_appointments_room`). 커서 페이지 여부는 **미결정 (U7)**
- 권한: 참여자
- 구현 상태: `미구현`

### PUT /appointments/:appointmentId — 약속 변경
- 인증: 필수
- 요청: 약속 만들기와 같음
- 응답: ① `200 data.appointment` (**새** 약속 객체)
- 권한: 참여자
- 조건: 기존 약속이 `SCHEDULED`이고 `scheduled_at > now()` (지난 약속은 변경 불가), 새 약속은 생성 조건을 만족
- 처리(한 트랜잭션): 기존 → `CANCELED`(`closed_by` = 나, `closed_at` = now) + 새 행 INSERT(`proposer_id` = 나)
- 알림: 상대방 ← `APPOINTMENT_UPDATED` (새 약속 id)
- 에러: 400 `VALIDATION_ERROR`, 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (APPOINTMENT_NOT_CHANGEABLE / APPOINTMENT_NOT_ALLOWED / CHAT_UNAVAILABLE)
- 구현 상태: `미구현`

### POST /appointments/:appointmentId/cancel — 약속 취소
- 인증: 필수
- 응답: ① `data.appointment` (`CANCELED`)
- 권한: 참여자. 조건: `SCHEDULED` + 미래 약속
- 알림: 상대방 ← `APPOINTMENT_CANCELED`
- 에러: 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (APPOINTMENT_NOT_CHANGEABLE)
- 구현 상태: `미구현`

---

## 11. 거래

관련 테이블: `transactions`, `products`, `chat_rooms`, `price_offers`, `trade_appointments`, `blocks`, `notifications`
**생성·상태 변경은 판매자만** (5.12). `products.status`와 같은 트랜잭션에서 변경 (11.4). 상품 상태를 직접 바꾸는 API는 없다 (D21)

**거래 객체** — 필드 구성 **미결정 (U4)**

| 출처 | 필드 |
|---|---|
| v1.1 | `{ id, product, buyer, seller, finalPrice, status, createdAt, completedAt, canceledAt }` (`product`·`buyer`·`seller`는 객체) |
| 현재 구현 | `{ id, productId, buyerId, finalPrice, status, createdAt, completedAt, canceledAt }` (ID 문자열) |

거래 생성·변경 경로는 결정 21에 따라 구현 방식을 유지한다. v1.1의 `POST /chat-rooms/:roomId/transactions`, `POST /transactions/:transactionId/complete`, `POST /transactions/:transactionId/cancel`은 아래 두 API로 대체한다.

### POST /products/:productId/transactions — 예약 또는 바로 거래완료
- 인증: 필수
- 요청: `{ chatRoomId, status: "RESERVED" | "COMPLETED" }`
  - 구매자는 `chatRoomId` 방의 구매자로 정해진다. 서버는 그 채팅방이 **이 상품의 방인지 확인**한다 (D8: 채팅한 사람만 구매자). body로 구매자 ID를 받지 않는다
- 응답: ① `201 data.transaction` (필드 **미결정 (U4)**)
- 권한: 상품의 **판매자** (구매자·비참여자 → 404). 채팅방이 이 상품의 방이 아니어도 404
- `finalPrice` (결정 6): **거래 생성 시점에 확정**한다. 값은 이 방에서 가장 최근 ACCEPTED 제안 금액, 없으면 그 시점의 상품 가격 (5.12). 이후 상품 가격이 바뀌거나 새 제안이 수락되어도 **이미 생성된 거래의 `finalPrice`는 바꾸지 않는다**
- `RESERVED`(예약): 상품 `ON_SALE` + 삭제 안 됨, 차단 없음 → 상품 `RESERVED`. 알림: 구매자 ← `TRADE_RESERVED`
- `COMPLETED`(바로 완료): 상품 `ON_SALE`일 때만. 예약중이면 예약된 거래의 완료(`PATCH /transactions/:transactionId`)를 써야 함 (D21) → 상품 `SOLD` + 자동 정리(11.3 "거래완료"). 알림: 구매자 ← `TRADE_COMPLETED`, 다른 구매자들 ← `PRICE_OFFER_EXPIRED` / `APPOINTMENT_CANCELED`
- 에러: 400 `VALIDATION_ERROR`, 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (PRODUCT_NOT_ON_SALE / PRODUCT_RESERVED / TRANSACTION_EXISTS: `uq_transactions_active_product` / CHAT_UNAVAILABLE: 차단, 일반 문구)
- 구현 상태: `구현됨` (거래 객체는 구현 필드로 응답, U4)

### PATCH /transactions/:transactionId — 예약 → 거래완료 / 예약 취소
- 인증: 필수
- 요청: `{ status: "COMPLETED" | "CANCELED" }`
- 응답: ① `200 data.transaction` (필드 **미결정 (U4)**)
- 권한: 판매자. 조건: 거래 `status = 'RESERVED'`이고 상품이 `RESERVED` (예약된 구매자로만 완료, D21)
- `COMPLETED`: 거래 `COMPLETED` + 상품 `SOLD` + 자동 정리(11.3 "거래완료") + 알림 (생성 API의 바로 완료와 같음). `finalPrice`는 예약할 때 확정한 값을 그대로 쓴다. 완료 시점에 다시 계산하지 않는다
- `CANCELED`: 거래 `CANCELED` + 상품 `ON_SALE` + 자동 정리(11.3 "예약 취소": 그 방의 미래 약속 CANCELED, 지난 약속 EXPIRED, 제안 유지). 알림: 구매자 ← `TRADE_CANCELED` (약속 취소 알림은 중복이라 보내지 않음, 11.3)
- 에러: 400 `VALIDATION_ERROR`, 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (TRANSACTION_NOT_RESERVED). 거래완료는 되돌릴 수 없음 (D9)
- 구현 상태: `구현됨` (거래 객체는 구현 필드로 응답, U4)

### GET /transactions — 내 거래 내역 (구매·판매)
- 인증: 필수
- 요청(query): `role` (`buying` | `selling`), `status?`, `cursor?`, `limit?`
- 응답: ② `items: [거래 객체 + { review: { canWrite, deadline, written } }]` (삭제된 상품도 제목 표시)
- 테이블: `transactions` (`idx_transactions_buyer`), `products` (`idx_products_seller`), `reviews`
- 구현 상태: `미구현`

### GET /transactions/:transactionId — 거래 상세
- 인증: 필수
- 응답: ① `data.transaction` (거래 객체 + 후기 작성 상태 `review: { canWrite, deadline, written }`)
- 권한: 판매자 또는 구매자. 에러: 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `미구현`

---

## 12. 후기

관련 테이블: `reviews`, `transactions`, `products`, `user_trust_stats`

### POST /transactions/:transactionId/reviews — 후기 작성
- 인증: 필수
- 요청: `{ rating (1~5), content? (최대 500자) }`
- 응답: ① `201 data.review: { id, rating, content, reviewee: UserSummary, createdAt }`
- 권한: 그 거래의 판매자 또는 구매자. 대상자(`reviewee_id`)는 서버가 상대방으로 정함
- 조건 (D24): 거래 `COMPLETED`, `now() <= completed_at + 7일`. 차단 관계여도 작성 가능 (D15)
- 에러: 400 `VALIDATION_ERROR`, 404 `RESOURCE_NOT_FOUND`, 409 `RESOURCE_CONFLICT` (REVIEW_NOT_ALLOWED: 완료 전 / REVIEW_PERIOD_EXPIRED / REVIEW_EXISTS)
- 수정·삭제 API 없음 (D24)
- 구현 상태: `미구현`

### GET /transactions/:transactionId/reviews — 거래의 후기 (최대 2개)
- 인증: 필수
- 응답: `items: 후기[]` (최대 2개). 응답 종류(③ 여부)는 **미결정 (U7)**
- 권한: 거래 당사자. 에러: 404 `RESOURCE_NOT_FOUND`
- (사용자별 받은 후기는 `GET /users/:userId/reviews`, 누구나 조회)
- 구현 상태: `미구현`

---

## 13. 신고

관련 테이블: `reports`, `users`, `products`, `chat_rooms`. 처리는 DB 관리자가 대시보드에서 한다 (D4). 자동 제재·결과 알림 없음 (D16)

### POST /reports — 신고
- 인증: 필수
- 요청: `{ reportedUserId, productId?, chatRoomId?, reason, content? }`
  - reason: `FRAUD` / `ABUSE` / `PROHIBITED_ITEM` / `SPAM` / `ETC`
  - content: 최대 1000자
- 응답: ① `201 data.report: { id, reason, status: "PENDING", createdAt }`
- 조건 (5.14): 자신 신고 불가, `productId`가 있으면 피신고자의 상품, `chatRoomId`가 있으면 신고자·피신고자가 그 방의 두 참여자, 둘 다 있으면 방의 상품과 일치
- 에러: 400 `VALIDATION_ERROR` (INVALID_REPORT_CONTEXT 포함), 404 `RESOURCE_NOT_FOUND` (사용자 없음), 409 `RESOURCE_CONFLICT` (REPORT_ALREADY_PENDING: `uq_reports_pending`)
- 구현 상태: `미구현`

### GET /reports/me — 내가 한 신고 목록
- 인증: 필수
- 응답: `items: [{ id, reportedUser: UserSummary, productId, chatRoomId, reason, status, createdAt }]`. 커서 페이지 여부는 **미결정 (U7)**
- 피신고자에게 신고 사실이나 `reporter_id`를 보여주는 API는 없다 (15.2)
- 구현 상태: `미구현`

---

## 14. 차단

관련 테이블: `blocks` + 자동 정리 대상(`price_offers`, `trade_appointments`, `transactions`, `products`, `notifications`)

### PUT /blocks/:userId — 차단
- 효과: 차단한 상대와의 상품·채팅·제안·약속·거래 상호작용을 제한한다 (D15, 결정 7). 차단당한 사람에게는 차단 사실을 직접 드러내지 않는다 (막힌 동작은 일반 문구의 409 `RESOURCE_CONFLICT`로 응답)
- 인증: 필수
- 응답: 새로 차단하면 `201`, 이미 차단했으면 `200`. 응답 본문의 결과 이름과 필드는 **미결정 (U9)**
- 조건: 자신 차단 불가
- 처리(새로 차단한 경우 한 트랜잭션, 11.3 "차단"): 두 사람 사이의 모든 방(양쪽이 판매하는 상품 모두)에서 대기·수락 제안 → EXPIRED, 미래 약속 → CANCELED, 지난 약속 → EXPIRED, 예약 → CANCELED + 상품 `ON_SALE`
- 알림: **차단당한 사람에게만**, 그 type의 정해진 수신자일 때만 (예약 취소는 차단당한 사람이 구매자일 때만 `TRADE_CANCELED`). 차단한 사람에게는 보내지 않음
- 에러: 400 `VALIDATION_ERROR` (자기 자신), 404 `RESOURCE_NOT_FOUND` (사용자 없음)
- 구현 상태: `미구현`

### DELETE /blocks/:userId — 차단 해제
- 인증: 필수
- 응답: ⑤ `204` (차단이 없어도 204). 자동 정리된 데이터는 되돌리지 않음
- 구현 상태: `미구현`

### GET /blocks — 내 차단 목록
- 인증: 필수
- 응답: `items: [{ user: UserSummary, createdAt }]`. 커서 페이지 여부는 **미결정 (U7)**
- 권한: 차단한 쪽만. 차단당한 사람이 알 수 있는 API는 없다
- 구현 상태: `미구현`

---

## 15. 알림

관련 테이블: `notifications` (+ 대상: `price_offers`, `transactions`, `trade_appointments`, `chat_rooms`, `products`). 채팅 알림은 저장하지 않음 (D12). 생성은 서버만 (9.1). 90일 정리는 정기 작업 (D27, API 아님)

### GET /notifications — 알림 목록
- 인증: 필수
- 요청(query): `unreadOnly?`, `cursor?`, `limit?`
- 응답: ② `items: [{ id, type, readAt, createdAt, target }]`
  - `PRICE_OFFER_*`: `{ priceOfferId, offeredPrice, chatRoomId, product: { id, title } }`
  - `TRADE_*`: `{ transactionId, finalPrice, product: { id, title } }`
  - `APPOINTMENT_*`: `{ tradeAppointmentId, chatRoomId, scheduledAt, placeName, product: { id, title } }`
- 비고: 알림 문구는 저장하지 않고 프론트엔드가 `type` + `target`으로 만든다 (5.16)
- 구현 상태: `미구현` (알림 행 생성은 상품 삭제·거래 API에서 구현됨)

### GET /notifications/unread-count — 안 읽은 알림 수
- 인증: 필수
- 응답: ④ `data.unreadCount: { count }` (`idx_notifications_unread`)
- 구현 상태: `미구현`

### POST /notifications/:notificationId/read — 읽음 처리
- 인증: 필수
- 응답: ⑤ `204`
- 권한: 받는 사람. 에러: 404 `RESOURCE_NOT_FOUND`
- 구현 상태: `미구현`

### POST /notifications/read-all — 모두 읽음
- 인증: 필수
- 응답: 갱신한 개수 (v1.1: `{ updated }`). 결과 이름과 형식은 **미결정 (U9)**
- 구현 상태: `미구현`

---

## 16. Socket.IO 이벤트 (DATABASE.md 12장)

| 방향 | 이벤트 | 방 | 내용 |
|---|---|---|---|
| 연결 | `handshake.auth.token` | — | JWT 검증 실패 시 연결 거부. 성공하면 서버가 `user:{userId}`에 입장시킴. 토큰이 만료되면(1시간) 이벤트 처리 때 `INVALID_TOKEN` 후 연결 종료 → 프론트엔드는 재로그인 후 다시 연결 |
| C → S | `chat:join` `{ roomId }` | `chat:{roomId}` | 참여자 확인 후 입장 (아니면 에러 응답) |
| C → S | `chat:leave` `{ roomId }` | | |
| C → S | `chat:send` `{ roomId, content, clientMessageId? }` + ack | `chat:{roomId}` | 메시지 전송 (8장). ack로 `{ data: { message } }` 또는 `{ error }` |
| S → C | `chat:message` | `chat:{roomId}` | 새 메시지 (`{ id, chatRoomId, senderId, content, readAt, createdAt }`) |
| S → C | `chat:read` | `chat:{roomId}` | `{ readerId, readAt }` |
| S → C | `chat:new-message` | `user:{상대 id}` | 채팅 목록 배지 갱신용 `{ chatRoomId, message }` |
| S → C | `notification:new` | `user:{받는 사람 id}` | 알림 객체 (15장 목록 항목 형식) |

- 모든 소켓 전송은 DB **COMMIT 후**에 한다 (12.3)
- 놓친 이벤트는 재연결 시 REST(`unread-count`, 목록 API)로 복구한다
- 구현 상태: `미구현` (`backend/src/sockets/`는 파일만 있음)

---

## 17. 정책 ↔ API 대응표

| 정책 | 반영 API |
|---|---|
| D2 Access Token만 | 1장 (로그아웃 API 없음) |
| D3 매너온도 계산 | 프로필·상품 상세·목록의 `mannerTemperature` (View) |
| D4 관리자 기능 없음 | 신고 상태 변경 API 없음 |
| D5 좋아요 공개 / 장바구니 비공개 | 6장 `favoriteCount` 공개, 7장 개수 노출 없음 |
| D7 지역 사전 입력 | 2장 (카카오는 `by-code` 매칭 보조) |
| D8 채팅한 사람만 구매자 | 거래 생성(`POST /products/:productId/transactions`)에서 body의 `chatRoomId`가 그 상품의 채팅방인지 서버가 확인하고, 그 방의 구매자를 거래 구매자로 정함 (결정 21) |
| D9 거래완료 되돌리기 불가 | 완료 거래 취소 API 없음 (`PATCH /transactions/:id`는 `RESERVED`만 변경) |
| D10 예약중 삭제 불가 | `DELETE /products/:id` 409 |
| D11 자동 정리 | 상품 삭제, 거래완료, 예약 취소, 차단 처리 |
| D12 채팅 알림 비저장 | 메시지는 Socket만, `notifications`에 없음 |
| D13 거래 알림은 구매자에게만 | 11장 알림 |
| D14 약속 즉시 확정 / 변경 = 취소 + 생성 | 10장 |
| D15 차단 | 14장 + 목록 제외 + 채팅·제안·약속·예약 차단 |
| D16 신고 맥락, 자동 제재 없음 | 13장 |
| D17 제한값 | 각 요청 검증 |
| D19 회원 탈퇴 없음 | 탈퇴 API 없음 |
| D20 상품 지역 자동 | `POST /products` (지역은 회원가입 필수, 방어적 검증 409) |
| D21 상태는 거래 API로만, 수정은 판매중만 | 4장, 5장, 11장 |
| D22 가격 제안 규칙 | 9장. 상품 가격 인하 시 대기 제안 자동 거절은 4장 |
| D23 채팅 가능 상태, 속도 제한 | 8장 (Socket 전송 rate limit) |
| D24 후기 7일, 수정·삭제 불가 | 12장 |
| D25 조회수 | 상품 상세 |
| D26 자기 상품 관심 불가 | 6·7장 409 `RESOURCE_CONFLICT` (OWN_PRODUCT) |
| D27 알림 90일 | 정기 작업 (API 아님) |
| D28 닉네임 변경 제한 없음 | `PATCH /users/me` |

---

## 18. 미결정 항목

아래 항목은 기존 결정(`docs/API_DRAFT.md` 18장)이나 현재 구현만으로 정할 수 없다. 이 문서에서 임의로 정하지 않았으며, 결정되면 해당 위치와 이 표를 함께 갱신한다.

| # | 항목 | 미결정 이유 | 결정 담당 | 본문 위치 |
|---|---|---|---|---|
| U1 | 좋아요·장바구니 목록 경로: `GET /favorites`·`GET /cart`(구현 방식) / `GET /users/me/favorites`·`GET /users/me/cart`(v1.1). 두 목록은 같은 방식으로 맞춘다 | API_DRAFT 19.1 #1에 미정으로 남아 있음 | 팀 | 6장, 7장 |
| U2 | 이미지 순서 변경 메서드: `PUT`(v1.1) / `PATCH`(v0.3) | API_DRAFT 19.1 #2에 미정으로 남아 있음 | 팀 | 5장 |
| U3 | 409 안에서 화면 분기가 필요한 상황(예: 자기 상품, 제안 횟수 초과)에 기능별 code를 추가할지 | API_DRAFT 19.1 #3에 미정으로 남아 있음 | 프론트엔드 담당 | 0.5 |
| U4 | 거래 객체 필드: 구현(`productId`·`buyerId` 문자열) / v1.1(`product`·`buyer`·`seller` 객체) | 결정 20은 겉 형식(`data.transaction`)만 "그대로"로 정했고 안쪽 필드는 정하지 않음 | 팀 | 8장 채팅방 상세, 11장 |
| U5 | 상품 상세 `seller` 필드: 구현(`id, nickname, reviewCount, avgRating, mannerTemperature`) / v1.1(`PublicProfile`: + `region`, `createdAt`) | 결정 21은 상세에 `isMine`·`isInCart`·`myChatRoomId` 추가만 정함 | 팀 | 4장 상품 상세 |
| U6 | 상품 목록 항목(`ProductSummary`)과 좋아요·장바구니 목록 항목 필드: 구현(`viewCount`, `category` 포함, `isDeleted`·`createdAt`(좋아요 목록) 없음) / v1.1(`isDeleted` 포함) | 결정 21은 목록 항목에 `seller` 추가만 정함 | 팀 | 0.7, 1장, 4장, 6장, 7장 |
| U7 | 페이지 여부가 정해지지 않은 목록의 응답 종류(② 커서 / ③ 전체): `GET /regions`(구현은 `limit`만, v1.1은 커서), 약속 내역, 거래의 후기(최대 2개), 내 신고 목록, 내 차단 목록 | 결정 20의 ③ 예시는 기준 데이터(카테고리·시·도·시·군·구)뿐이고, 위 목록은 v1.1에서도 페이지 규칙이 일정하지 않음 | 팀 | 2장, 10장, 12장, 13장, 14장 |
| U8 | 기준 데이터 목록의 항목 형식: 시·도·시·군·구 항목을 문자열(v1.1)로 둘지 객체로 둘지, 카테고리 항목에 `sortOrder`(v1.1)를 넣을지(구현은 `{ id, name }`) | 결정 20의 ③은 겉 형식(`data.items`)만 정함 | 팀 | 2장, 3장 |
| U9 | 응답 종류 5가지에 바로 맞지 않는 응답: 이미지 추가·삭제·순서 변경 결과(`ImageItem[]`), 제안 내역의 `remainingOffers24h`, 장바구니 `data.cartItem`의 필드, 차단 결과 본문, 알림 모두 읽음의 `updated` | 결정 20은 결과 이름이나 필드를 지정하지 않음 | 팀 | 5장, 7장, 9장, 14장, 15장 |
| U10 | 프론트엔드 토큰 보관 위치와 키 이름 (v0.3: `sessionStorage`의 `accessToken`) | v0.3에만 있고 결정에도 구현에도 없음 | 프론트엔드 담당 | 0.1 |
| U11 | v0.3의 "기능별 API 작성 양식"(8장)과 "공통 테스트 항목"(9장)을 이 문서에 넣을지 | 문서 구성 선택의 문제이며 결정 기록이 없음. v1.2에는 넣지 않았다 | 팀 | — |
| U12 | 지역이 NULL인 회원의 `GET /users/me`·공개 프로필(`PublicProfile`)에서 `region`을 `null`로 응답할지 | 결정 24는 로그인 응답만 정함 | 팀 | 0.7, 1장 |

---

## 19. 구현 수정 사항

현재 백엔드 구현이 이 명세와 다른 곳이다. 업무 규칙은 바꾸지 않고 **구현을 고친다** (API_DRAFT 18.2.4). 수정은 별도 작업(기능별 PR)으로 진행하며 이 문서 작성 단계에서는 코드를 바꾸지 않았다. 수정을 마친 항목은 "현재 구현" 칸에 **수정 완료**와 날짜를 적는다.

| # | 대상 | 현재 구현 | 명세 | 근거 |
|---|---|---|---|---|
| I1 | CORS 허용 메서드 (`backend/src/app.ts`) | **수정 완료 (2026-10-14)**: 허용 메서드에 `PUT` 추가 (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`). 수정 전에는 `PUT`이 없어 브라우저의 사전 요청에서 `PUT` API가 막혔다 | `PUT` 포함 (좋아요·장바구니·차단·약속 변경·이미지 순서(U2)) | 결정 21, 0.8 |
| I2 | 비밀번호 검증 범위 (`backend/src/validators/auth.validator.ts`) | **수정 완료 (2026-10-14)**: 회원가입·로그인 모두 8~72자, UTF-8 72바이트 초과 시 400. 수정 전에는 회원가입·로그인 모두 8~20자였다 | 8~72자, UTF-8 72바이트 초과 시 400. 회원가입 규칙으로 만든 비밀번호는 로그인할 수 있어야 함 | 결정 3, 18.2.4 |
| I3 | JWT 만료 기본값 (`backend/src/config/env.ts`, `.env.example`) | **수정 완료 (2026-10-15)**: `JWT_EXPIRES_IN` 기본 `1h`, `.env.example`도 `1h` (2026-10-14). 회원가입·로그인 응답의 `expiresIn`은 발급 토큰의 `exp − iat` (I4 구현, 2026-10-15). 수정 전에는 기본 `2h`, 응답에 `expiresIn` 없음 | 1시간, 응답 `expiresIn` = 발급 토큰의 `exp − iat` (기본 `3600`) | 결정 3·25, API_DRAFT 20.4 |
| I4 | 회원가입·로그인 | **수정 완료 (2026-10-15)**: 회원가입 `regionId` 필수·존재 확인·`users.region_id` 저장, 응답 `{ accessToken, expiresIn, user: { id, email, nickname, region } }`, 로그인은 지역이 없으면 `region: null`. 수정 전에는 `regionId` 미지원, 응답 `user.regionId` 문자열 | 회원가입 `regionId` 필수·서버 검증. 응답 `{ accessToken, expiresIn, user: { id, email, nickname, region } }`. 로그인은 `region: RegionName \| null` (결정 24) | 결정 18, 20, 24, 25 |
| I5 | 좋아요 | `POST /products/:productId/favorite`로 추가·취소 전환. 응답 `data: { productId, isFavorited, favoriteCount }` | `PUT` / `DELETE`, 응답 `data.favorite` | 결정 21, 20 |
| I6 | 상품 수정 응답 | 수정된 DB 행(`id, categoryId, title, description, price, status, updatedAt`)을 반환 | `data.product`를 상품 상세와 같은 형식으로 | 결정 20 |
| I7 | 상품 수정 시 가격 인하 처리 | 없음 | 대기 제안 자동 `REJECTED` + 구매자에게 `PRICE_OFFER_REJECTED` 알림 | 결정 8, 14 |
| I8 | 상품 상세 개인화 필드 | `isFavorited`만 있음 | `isMine`, `isInCart`, `myChatRoomId` 추가 | 결정 21 |
| I9 | 상품 목록 | `sido`·`sigungu` 필터 없음, `status` 하나만, 항목에 `seller` 없음 | 지역 시·군·구 필터, `status` 여러 개(콤마), `seller: { id, nickname, mannerTemperature }` | 결정 21 |
| I10 | 지역 조회 | `GET /regions?keyword`만 (`keyword` 항상 필수) | `keyword` 또는 `sido`(+`sigungu`) 조건, `GET /regions/sido`, `GET /regions/sigungu`, `GET /regions/by-code/:code` 추가 | 결정 21 |
| I11 | 상품 삭제 시 이미지 정리 | `deleted_at`만 기록. `product_images` 행 삭제와 COMMIT 후 Storage 파일 삭제 없음 | 같은 트랜잭션에서 `product_images` 행 삭제, COMMIT 후 Storage 파일 삭제 | 결정 13, 17 |
| I12 | COMMIT 후 소켓 전송 | Socket 서버 미구현. 상품 삭제·거래 API는 알림 행만 만들고 `notification:new`를 보내지 않음 | COMMIT 후 `notification:new` 전송 | 12.3, 16장 |

- 위 표와 별도로 `미구현`으로 표시된 API(회원 정보, 지역 단계 조회, 상품 등록·이미지, 장바구니, 채팅, 가격 제안, 약속, 거래 조회, 후기, 신고, 차단, 알림, Socket)는 기능별 구현 단계에서 이 명세를 기준으로 만든다.
- 자동 정리(11.3)의 세부 동작이 DATABASE.md와 일치하는지는 이 문서 작성 단계에서 대조하지 않았다.

---

## 20. 변경 이력

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-10-05 | v1.0 | 최초 확정. API 60개 + Socket.IO 이벤트. 결정 사항 1~17번 반영 (`docs/API_DRAFT.md` 18장). DB 구조 변경 없음 |
| 2026-10-05 | v1.1 | 회원가입 시 지역 필수로 변경 (결정 18). `POST /auth/signup`의 `region_id` 필수·서버 검증, `PATCH /users/me` 설명, `POST /products` 지역 조건 정리. DB 구조 변경 없음 |
| 2026-10-08 | v0.1~v0.3 (`main`, 팀원 문서) | 공통 API 규칙 초안(v0.1), 공통 규칙 간소화(v0.2), 카테고리·지역·상품 조회/수정/삭제·거래 상태 API 추가(v0.3). v1.1과 별도로 작성됨 |
| 2026-10-14 | v1.2 | v1.1과 v0.3을 합침 (`docs/API_DRAFT.md` 18.2, 결정 20·21). 응답 형식 5종·camelCase·문자열 ID·`limit` 최대 100·공통 오류 code로 변경. 거래 생성·변경 경로를 `POST /products/:productId/transactions`, `PATCH /transactions/:transactionId`로 변경(v1.1의 거래 API 3개를 2개로 대체). 좋아요를 `PUT`/`DELETE`로 통일. 상품 목록 query 이름을 구현 기준으로 변경하고 `sido`·`sigungu` 필터, `status` 여러 개, `seller` 추가. 상품 상세에 `isMine`·`isInCart`·`myChatRoomId` 추가. 메시지 내역을 커서 방식으로 변경. v0.3의 CORS·서버 주소·입력값 검증 규칙 반영. JWT 1시간·비밀번호 8~72자 등 v1.1 업무 규칙 유지. 미결정 항목(18장)과 구현 수정 사항(19장) 추가. DB 구조 변경 없음 |
| 2026-10-14 | v1.2 | 구현 상태 갱신: I1(CORS `PUT` 허용)·I2(비밀번호 8~72자·UTF-8 72바이트 검증) 수정 완료 반영. 명세 내용 변경 없음 |
| 2026-10-14 | v1.2 | 구현 상태 갱신: I3(JWT 기본 만료 `1h`) 기본값 수정 완료 반영. 응답 `expiresIn`은 I4에서 처리. 명세 내용 변경 없음 |
| 2026-10-14 | v1.2 | 결정 24·25 초안 반영 (`docs/API_DRAFT.md` 18.3): 지역이 NULL인 회원의 로그인 응답 `region: null` 예외 처리(결정 24), `expiresIn` = 발급 토큰의 `exp − iat`(결정 25), `RegionName.sigungu` null 명시, 미결정 U12 추가. 회원가입 `regionId` 필수와 400 `VALIDATION_ERROR`는 변경 없음 |
| 2026-10-15 | v1.2 | 구현 상태 갱신: I3 응답 `expiresIn`·I4 수정 완료 반영, 회원가입·로그인 `구현됨`. 결정 24·25 확정 (PR #6). 명세 내용 변경 없음 |
