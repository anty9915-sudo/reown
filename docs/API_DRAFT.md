# REOWN API 설계안 (초안, 검토용)

> 상태: **설계 기록 (2026-10-05 결정 완료)**. 확정본은 [`docs/API.md`](API.md) v1.0이며 **구현 기준은 API.md**다. 이 문서는 결정 과정(18장), 확인 항목(19장), 후속 문서 수정 목록(20장)의 기록으로 남긴다.
> 기준: `docs/DATABASE.md` v1.1 (D1~D28, 9장 권한 매트릭스, 10~12장), `db/migrations/001_initial_schema.sql`
> 전제: **DB 구조를 바꾸지 않는다.** 모든 API는 기존 16개 테이블과 View `user_trust_stats`만 사용한다.
> 표기: `[확정 n]` = 18장 결정 사항 n번
> 범위: **API 설계 문서만** 다룬다. DB 스키마 변경, 백엔드·프론트엔드 구현은 이 문서 작업에 포함하지 않는다.
> 2026-10-13: 2차 결정 19~23 추가 (18.2절). 응답 형식은 결정 20으로 바뀌었다(결정 1·2 대체). 이 기준을 반영한 확정본 `docs/API.md` v1.2는 아직 작성 전이다.

---

## 0. 공통 규칙

### 0.1 기본

| 항목 | 규칙 |
|---|---|
| Base URL | `/api/v1` (CLAUDE.md 7장) |
| 형식 | JSON (`Content-Type: application/json`). 이미지 업로드만 `multipart/form-data` |
| 인증 | `Authorization: Bearer <access_token>` (JWT, D2: Access Token만 사용, Refresh Token 없음). **만료 1시간** `[확정 3]`. 만료되면 401 → 프론트엔드는 로그인 화면으로 보낸다 |
| 로그아웃 | API 없음. 클라이언트가 토큰을 삭제한다 (D2) |
| 사용자 ID | **JWT에서만** 가져온다. body·query의 사용자 ID로 "나"를 판단하지 않는다 (9.2 #4) |
| 시간 | ISO 8601 UTC 문자열 (`2026-10-04T12:00:00Z`). 화면에서 KST로 표시 |
| 상태 코드 값 | DB 코드 그대로 전달 (`ON_SALE` 등). 화면 문구는 프론트엔드가 매핑 (DATABASE.md 4.1) |

**인증 표기**: `필수` = 토큰 없으면 401 / `선택` = 토큰이 있으면 개인화(내 좋아요 여부, 차단 사용자 상품 제외 등) / `없음`

### 0.2 응답 형식 `[확정 1]`

> 2026-10-13: 이 절의 형식(결정 1·2)은 **결정 20으로 대체**되었다. 새 형식은 18.2.1·18.2.2절을 따른다. 아래 내용은 설계 기록으로 남긴다.

```json
// 단건
{ "data": { ... } }

// 목록 (커서 페이지네이션)
{ "data": [ ... ], "next_cursor": "eyJpZCI6MTIzfQ" }   // 마지막 페이지면 null

// 에러
{ "error": { "code": "PRODUCT_NOT_ON_SALE", "message": "판매중인 상품만 가능합니다." } }
```

- 목록은 **키셋(커서) 페이지네이션**을 쓴다 (DATABASE.md 8.2 `idx_products_latest` 등). `limit` 기본 20, 최대 50.
- `cursor`는 서버가 만든 불투명 문자열이다. 클라이언트는 받은 값을 그대로 다시 보낸다.
- **ID와 numeric 값은 숫자로 응답** `[확정 2]`: `pg`는 `bigint`(ID, `count()`)와 `numeric`(`avg_rating`, `manner_temperature`, `latitude`, `longitude`)을 문자열로 돌려주므로 백엔드에서 숫자로 변환해 응답한다. 요청의 ID도 숫자로 받는다.

### 0.3 공통 에러

| HTTP | code | 상황 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 필수값 누락, 형식·길이·범위 오류, 허용되지 않은 필드 |
| 401 | `UNAUTHORIZED` | 토큰 없음·만료·위조 |
| 404 | `NOT_FOUND` | 데이터가 없거나 **접근 권한이 없음**. 당사자지만 그 행위의 주체가 아닌 경우(예: 판매자가 가격 제안 생성, 구매자가 예약 생성)도 404 (존재·권한 여부를 숨긴다, 9.2 #3) |
| 409 | 기능별 code | 상태 조건 불일치, 중복 (UNIQUE 위반 23505 포함) |
| 429 | `RATE_LIMITED` 등 | 메시지 전송 속도 제한(D23), 제안 24시간 3회(D22) |
| 500 | `INTERNAL_ERROR` | 서버 오류. 내부 메시지·SQL을 노출하지 않는다 |

- **403은 쓰지 않는다** `[확정 9]`. 권한·존재 여부를 숨겨야 하면 404, 요청 자체가 잘못되면 400 (DATABASE.md 9.2 원칙 유지).
- DB 에러 매핑: `23505`(UNIQUE) → 409, `23503`(FK) → 400 또는 404, `23514`(CHECK) → 400.
- **차단 관련 에러는 차단 사실을 드러내지 않는 일반 code**(`CHAT_UNAVAILABLE`)를 쓴다 (D15, 10.9).

### 0.4 공통 응답 객체

```text
UserSummary     { id, nickname }
PublicProfile   { id, nickname, region: RegionName|null, manner_temperature, avg_rating, review_count, created_at }
RegionName      { id, sido, sigungu, eupmyeondong }
ProductSummary  { id, title, price, status, thumbnail_url, region: RegionName, favorite_count, created_at, is_deleted }
ImageItem       { id, url, sort_order }        // url = {SUPABASE_URL}/storage/v1/object/public/reown-product-images/{storage_path}
```

- `manner_temperature`, `avg_rating`, `review_count`는 View `user_trust_stats`에서 계산한다 (D3). 후기가 없으면 36.5 / null / 0.
- `email`은 본인 조회 API(`GET /users/me`)에서만 반환한다. `password_hash`는 어떤 응답에도 넣지 않는다.

---

## 1. 인증 / 회원

관련 테이블: `users`, `regions`, `user_trust_stats`(View), `reviews`, `products`

### POST /auth/signup — 회원가입
- 인증: 없음
- 요청: `{ email, password, nickname, region_id? }`
  - email: trim + 소문자 정규화, 최대 255자
  - password: **8~72자** `[확정 3]`. bcrypt는 **72바이트**까지만 사용하므로 UTF-8 기준 72바이트를 넘으면 400 (한글 등 다중 바이트 문자를 포함한 경우)
  - nickname: `^[가-힣a-zA-Z0-9]{2,20}$` (D17)
  - region_id: **필수** `[확정 18]` (결정 16을 대체). 존재하는 `regions.id`인지 서버가 확인한다. 가입 후 다른 지역으로 변경 가능, NULL 해제 불가 `[확정 11]`. 최신 내용은 `docs/API.md` v1.1
- 응답: `201 { access_token, expires_in, user: { id, email, nickname, region } }`
- 권한: 없음
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_REGION`, 409 `EMAIL_TAKEN`, 409 `NICKNAME_TAKEN`
- 처리: bcrypt(cost 10 이상) 해시만 저장 (10.1)

### POST /auth/login — 로그인
- 인증: 없음
- 요청: `{ email, password }`
- 응답: `200 { access_token, expires_in, user: { id, email, nickname, region } }`
- 에러: 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` (이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않음)
- 토큰 만료: 1시간 (`expires_in: 3600`). Refresh Token 없음 `[확정 3]`

### GET /users/me — 내 정보
- 인증: 필수
- 응답: `{ id, email, nickname, region, manner_temperature, avg_rating, review_count, created_at }`
- 에러: 401

### PATCH /users/me — 닉네임·지역 변경
- 인증: 필수
- 요청: `{ nickname?, region_id? }`
  - region_id는 존재하는 `regions.id`로만 **변경**할 수 있다. `null`(지역 해제)은 400 `VALIDATION_ERROR` `[확정 11]`. 사용자는 항상 하나의 지역을 설정한 상태를 유지한다
- 응답: 내 정보
- 권한: 본인
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_REGION`, 409 `NICKNAME_TAKEN`
- 비고: 닉네임 변경 제한 없음 (D28). 지역을 바꿔도 이미 등록한 상품의 지역은 바뀌지 않음 (D20)

### PATCH /users/me/email — 이메일 변경
- 인증: 필수
- 요청: `{ email, current_password }`
- 응답: 내 정보
- 권한: 본인 + 현재 비밀번호 확인
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_PASSWORD`, 409 `EMAIL_TAKEN`

### PATCH /users/me/password — 비밀번호 변경
- 인증: 필수
- 요청: `{ current_password, new_password }` (new_password 규칙은 회원가입과 같음)
- 응답: `204`
- 권한: 본인 + 현재 비밀번호 확인 (9.1)
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_PASSWORD`

### GET /users/:userId — 공개 프로필
- 인증: 없음
- 응답: `PublicProfile` (email 제외)
- 에러: 404

### GET /users/:userId/products — 사용자의 판매 상품
- 인증: 선택
- 요청(query): `status?`, `cursor?`, `limit?`
- 응답: `ProductSummary[]` (삭제된 상품 제외, 최신순)
- 에러: 404
- 차단 `[확정 7]`: 내가 차단한 사용자의 프로필에 직접 들어온 경우는 상품 상세와 같이 허용한다 (17장 #7). 차단당한 사람에게 차단 사실은 드러내지 않는다

### GET /users/:userId/reviews — 받은 후기
- 인증: 없음
- 요청(query): `cursor?`, `limit?`
- 응답: `[{ id, rating, content, created_at, reviewer: UserSummary, reviewer_role: "SELLER"|"BUYER", product: { id, title, is_deleted } }]`
- 비고: 후기는 누구나 조회 (9.1). 삭제된 상품도 제목을 표시 (7장)

### GET /users/me/products — 내 판매 상품
- 인증: 필수
- 요청(query): `status?` (`ON_SALE`·`RESERVED`·`SOLD`), `cursor?`, `limit?`
- 응답: `ProductSummary[]` (삭제 제외)
- 테이블: `products` (`idx_products_seller`)

---

## 2. 지역

관련 테이블: `regions` (D7). **`001_regions.sql`이 적용되기 전에는 빈 결과를 반환한다.**

### GET /regions/sido — 시·도 목록
- 인증: 없음
- 응답: `["서울특별시", "부산광역시", ...]`

### GET /regions/sigungu — 시·군·구 목록
- 인증: 없음
- 요청(query): `sido` (필수)
- 응답: `["강남구", ...]` (세종특별자치시는 시·군·구가 없으므로 빈 배열)
- 에러: 400

### GET /regions — 읍·면·동 목록·검색
- 인증: 없음
- 요청(query): `sido?`, `sigungu?`, `q?`(읍·면·동 이름 일부, 1자 이상), `cursor?`, `limit?`
- 응답: `[{ id, code, sido, sigungu, eupmyeondong }]`
- 에러: 400 (조건이 하나도 없으면)
- 테이블: `regions` (`idx_regions_sido_sigungu`)

### GET /regions/by-code/:code — 법정동 코드로 조회
- 인증: 없음
- 용도: 카카오 주소 검색 결과의 `b_code`(10자리)를 `regions`와 매칭. 리 단위 코드면 서버가 마지막 2자리를 `00`으로 바꿔 조회 (5.2)
- 응답: `{ id, code, sido, sigungu, eupmyeondong }`
- 에러: 400 (10자리 숫자가 아님), 404 `REGION_NOT_FOUND`

---

## 3. 카테고리

### GET /categories — 카테고리 목록
- 인증: 없음
- 응답: `[{ id, name, sort_order }]` (`sort_order`, `id` 순)
- 테이블: `categories`. 사용자 API로는 수정하지 않는다 (5.3)

---

## 4. 상품

관련 테이블: `products`, `product_images`, `categories`, `regions`, `users`, `favorites`, `cart`, `chat_rooms`, `blocks`, `user_trust_stats`, Supabase Storage

### GET /products — 상품 목록·검색
- 인증: 선택
- 요청(query)
  - `q?`: 상품명 검색 (`%`, `_` 이스케이프 후 ILIKE, `idx_products_title_trgm`)
  - `category_id?`
  - 지역: `region_id?` 또는 `sido?` + `sigungu?` (시·군·구 단위 필터)
  - `min_price?`, `max_price?`
  - `status?`: `ON_SALE`, `RESERVED`, `SOLD` (콤마로 여러 개)
  - `sort?`: `latest`(기본) / `oldest` / `price_asc` / `price_desc` / `views` (허용 목록 매핑, 15.1 #4)
  - `cursor?`, `limit?`
- 응답: `[ProductSummary + { seller: { id, nickname, manner_temperature } }]`
- 조건: `deleted_at IS NULL`. 로그인했으면 **내가 차단한 사용자의 상품 제외** (D15)
- 에러: 400 (잘못된 sort·가격 범위 등)

### GET /products/:productId — 상품 상세
- 인증: 선택
- 응답
  ```text
  { id, title, description, price, status, view_count, created_at, updated_at,
    category: { id, name }, region: RegionName, images: ImageItem[],
    seller: PublicProfile, favorite_count,
    is_mine, is_favorited, is_in_cart, my_chat_room_id }   // 개인화 필드는 로그인 시에만
  ```
- 조건: 삭제된 상품은 404. 차단한 사용자의 상품도 **직접 접근은 허용** (17장 #7)
- 부수 효과: 조회수 +1 (D25). 본인 조회 제외, 같은 사용자(비로그인은 IP)·상품은 10분에 1회. 서버 메모리로 처리. `updated_at`은 바뀌지 않음 (트리거 조건)
- 에러: 404

### POST /products — 상품 등록
- 인증: 필수
- 요청: `multipart/form-data`
  - `category_id`, `title`(1~100자), `description`(1~2000자), `price`(1~1,000,000,000)
  - `images`: 파일 1~10개. 보낸 순서가 `sort_order` 0~9 (0번이 대표 이미지)
- 응답: `201` 상품 상세
- 권한·조건
  - 내 지역(`users.region_id`)이 설정되어 있어야 함. 상품 `region_id`는 서버가 자동 저장 (D20)
  - `seller_id` = 나, `status` = `ON_SALE`
- 처리: 한 트랜잭션에서 `products` INSERT → Storage 업로드(`products/{product_id}/{uuid}.{ext}`, 경로는 서버가 생성) → `product_images` INSERT. 실패하면 롤백하고 올린 파일 삭제
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_CATEGORY`, 400 `IMAGE_COUNT_INVALID`, 400 `INVALID_IMAGE`(형식·크기·확장자·MIME), 409 `REGION_REQUIRED`, 500 `STORAGE_ERROR`
- 이미지 규칙 `[확정 4]`: **JPG / PNG / WebP**, 장당 **최대 10MB**, 상품당 **1~10장**. WebP 자동 변환 없음(원본 형식 그대로 저장). 확장자와 MIME을 함께 검증
- 구현 시점 `[확정 4]`: 이미지 업로드는 **상품 등록 기능 구현 단계**에서 개발한다. 지금은 업로드 코드를 만들지 않는다
- Storage 버킷 `[확정 12]`: **`reown-product-images`** (공개 읽기, 업로드·삭제는 백엔드 service role 키로만). 파일 경로는 버킷 안의 `products/{product_id}/{uuid}.{ext}`이고 이 경로를 `product_images.storage_path`에 저장한다

### PATCH /products/:productId — 상품 수정
- 인증: 필수
- 요청: `{ category_id?, title?, description?, price? }` (이 4개 외의 필드는 400)
- 응답: 상품 상세
- 권한·조건: `seller_id = 나` + `status = 'ON_SALE'` + 삭제 안 됨 (D21)
- 가격 인하 처리 `[확정 8]`: 새 가격이 대기 중(`PENDING`) 제안 금액 **이하**가 되면, 같은 트랜잭션에서 그 제안을 **`REJECTED`로 자동 처리**한다 (`responded_at = now()`). 해당 구매자에게 **`PRICE_OFFER_REJECTED` 알림을 보낸다** (기존 type 사용) `[확정 14]`. 알림 행은 같은 트랜잭션에서 INSERT하고, 소켓 전송은 COMMIT 후
- 에러: 400, 404 (없거나 내 상품 아님), 409 `PRODUCT_NOT_EDITABLE` (내 상품이지만 판매중 아님)

### DELETE /products/:productId — 상품 삭제 (소프트 삭제)
- 인증: 필수
- 응답: `204`
- 권한·조건: `seller_id = 나` + `status IN ('ON_SALE','SOLD')`. 예약중이면 불가 (D10)
- 처리 `[확정 13]`
  1. **DB 트랜잭션** `[확정 17]`: `deleted_at = now()` + **자동 정리**(11.3 "상품 삭제": 모든 방의 대기·수락 제안 → EXPIRED, 미래 약속 → CANCELED, 지난 약속 → EXPIRED) + 각 구매자에게 `PRICE_OFFER_EXPIRED` / `APPOINTMENT_CANCELED` 알림 + 그 상품의 **`product_images` 행 삭제** → COMMIT
  2. **COMMIT 후** 소켓 알림 전송
  3. 이어서 Storage에서 그 상품의 이미지 파일을 삭제한다 (삭제할 경로는 1단계에서 행을 지우기 전에 읽어 둔다)
- Storage 삭제 실패 처리 `[확정 13]`
  - DB 트랜잭션과 Storage는 하나로 묶을 수 없다. 그래서 **DB를 먼저 확정하고, 파일 삭제는 COMMIT 후에** 한다. COMMIT 전에 파일을 지우면 DB가 롤백됐을 때 판매중 상품의 이미지가 사라지기 때문이다
  - 파일 삭제가 실패해도 **DB의 상품 삭제 결과를 되돌리지 않는다**. API는 `204`로 응답하고, 실패한 상품 id와 경로를 서버 로그에 남겨 추후 정리한다 `[확정 17]`
  - 남은 파일은 경로가 `products/{product_id}/`로 시작하므로, 삭제된 상품(`deleted_at IS NOT NULL`)의 폴더를 나중에 다시 지우면 정리된다 (재시도·정리 방법은 구현 단계에서 정한다)
- 삭제 후 표시: 채팅·거래·후기 내역에서 삭제된 상품은 제목 등은 그대로 보여주고, 이미지는 없으므로 `thumbnail_url: null`(프론트엔드는 기본 이미지 표시)
- 에러: 404, 409 `PRODUCT_RESERVED`

---

## 5. 상품 이미지

관련 테이블: `product_images`, `products`(updated_at), Supabase Storage

공통 조건: `seller_id = 나` + `ON_SALE` + 삭제 안 됨 (이미지 변경도 상품 수정, D21). **변경할 때마다 같은 트랜잭션에서 `products.updated_at = now()`** (5.5)

이미지 규칙은 4장과 같다 (JPG/PNG/WebP, 장당 10MB, 최대 10장, 변환 없음) `[확정 4]`. 구현은 상품 등록 기능 구현 단계에서 한다.

**더미(개발·시연용) 상품 이미지** `[확정 15]`: 더미 이미지도 `reown-product-images` 버킷에 업로드하고, `product_images.storage_path`에는 **Storage 경로**만 저장한다. 외부 이미지 URL을 `storage_path`에 직접 저장하지 않는다.

### POST /products/:productId/images — 이미지 추가
- 인증: 필수
- 요청: `multipart/form-data` `images` (추가 후 총 10장 이하)
- 응답: `ImageItem[]` (전체 이미지, 순서대로)
- 에러: 400 `INVALID_IMAGE`, 404, 409 `PRODUCT_NOT_EDITABLE`, 409 `IMAGE_LIMIT_EXCEEDED`

### DELETE /products/:productId/images/:imageId — 이미지 삭제
- 인증: 필수
- 응답: `ImageItem[]`. 남은 이미지의 `sort_order`를 0부터 다시 채운다
- 처리: DB 트랜잭션(행 삭제, 순서 재정렬, `products.updated_at` 갱신) COMMIT 후 Storage 파일 삭제. 파일 삭제 실패 시 처리는 상품 삭제와 같다 (로그 기록, 응답은 성공)
- 에러: 404, 409 `PRODUCT_NOT_EDITABLE`, 409 `LAST_IMAGE` (최소 1장, D17)

### PUT /products/:productId/images/order — 이미지 순서 변경
- 인증: 필수
- 요청: `{ image_ids: [..] }`. 현재 이미지 전체를 새 순서로 (`UNIQUE (product_id, sort_order) DEFERRABLE` 덕분에 한 트랜잭션에서 교체 가능)
- 응답: `ImageItem[]`
- 에러: 400 (목록이 현재 이미지 집합과 다름), 404, 409 `PRODUCT_NOT_EDITABLE`

---

## 6. 좋아요

관련 테이블: `favorites`, `products`, `blocks`. 좋아요 수는 공개, 목록은 본인만 (D5)

### PUT /products/:productId/favorite — 좋아요
- 인증: 필수
- 응답: `200 { favorited: true, favorite_count }` (이미 눌렀어도 200, `ON CONFLICT DO NOTHING`)
- 조건: 자기 상품 불가 (D26), 삭제된 상품 불가
- 에러: 404, 409 `OWN_PRODUCT`

### DELETE /products/:productId/favorite — 좋아요 취소
- 인증: 필수
- 응답: `200 { favorited: false, favorite_count }` (없어도 200)

### GET /users/me/favorites — 좋아요 목록
- 인증: 필수
- 요청(query): `cursor?`, `limit?`
- 응답: `[ProductSummary + { favorited_at }]` (최근순, `idx_favorites_user_created`)
- 조건: 삭제된 상품 제외 (7장). 차단한 사용자의 상품 제외 (D15 "내 목록") `[확정 7]`

---

## 7. 장바구니

관련 테이블: `cart`, `products`, `blocks`. **개수와 목록 모두 본인만** (D5). 결제 없음

### PUT /products/:productId/cart — 장바구니 담기
- 인증: 필수
- 응답: `200 { in_cart: true }`
- 조건: 자기 상품·삭제된 상품 불가 (D26)
- 에러: 404, 409 `OWN_PRODUCT`

### DELETE /products/:productId/cart — 장바구니 빼기
- 인증: 필수
- 응답: `200 { in_cart: false }`

### GET /users/me/cart — 장바구니 목록
- 인증: 필수
- 요청(query): `cursor?`, `limit?`
- 응답: `[ProductSummary + { added_at }]`
- 조건: 좋아요 목록과 같음

---

## 8. 채팅방 / 메시지

관련 테이블: `chat_rooms`, `messages`, `products`, `blocks`, `price_offers`, `trade_appointments`, `transactions`

**참여자** = `chat_rooms.buyer_id` 또는 `products.seller_id`. 참여자가 아니면 모든 채팅 API에서 404 (9.2 #2)

### POST /products/:productId/chat-rooms — 채팅 시작
- 인증: 필수
- 요청: 없음 (구매자 = 나)
- 응답: 기존 방이 있으면 `200`, 새로 만들면 `201` + 채팅방 상세
- 조건 (D23, D15)
  - 기존 방이 있으면 상품 상태와 관계없이 그 방을 반환 (`ON CONFLICT DO NOTHING` 후 조회)
  - 새 방: 자기 상품 아님, 상품이 `ON_SALE`/`RESERVED`이고 삭제 안 됨, 어느 방향으로도 차단 없음
- 에러: 404, 409 `OWN_PRODUCT`, 409 `CHAT_NOT_ALLOWED`(거래완료), 409 `CHAT_UNAVAILABLE`(차단, 일반 문구)

### GET /chat-rooms — 내 채팅방 목록
- 인증: 필수
- 요청(query): `role?` (`all`·`buying`·`selling`), `cursor?`, `limit?`
- 응답: `[{ id, my_role: "BUYER"|"SELLER", counterpart: UserSummary, product: ProductSummary, last_message: { content, sender_id, created_at }|null, unread_count, can_send }]` (마지막 메시지 최신순)
- 비고: `can_send=false`의 이유(차단·삭제)는 구분해서 내려주지 않는다 (차단 사실 미노출)

### GET /chat-rooms/unread-count — 안 읽은 메시지 수 (전체)
- 인증: 필수
- 응답: `{ count }` (`idx_messages_unread`). 재접속·로그인 시 호출 (12.3 #4)

### GET /chat-rooms/:roomId — 채팅방 상세
- 인증: 필수
- 응답: `{ id, my_role, counterpart, product, can_send, pending_offer, current_appointment, transaction }`
  - `pending_offer`: 이 방의 PENDING 제안 또는 null
  - `current_appointment`: 이 방의 SCHEDULED 약속 또는 null (`is_past` 포함)
  - `transaction`: 이 방 구매자와의 RESERVED/COMPLETED 거래 또는 null
- 권한: 참여자. 에러: 404

### GET /chat-rooms/:roomId/messages — 메시지 내역
- 인증: 필수
- 요청(query): `before_id?`, `limit?` (최신순 역방향, `idx_messages_room`)
- 응답: `[{ id, sender_id, content, read_at, created_at }]`
- 권한: 참여자 (삭제된 상품의 방도 읽기 가능, D23). 에러: 404

### 메시지 전송 — Socket.IO `chat:send` `[확정 5]`
- 메시지 **전송은 Socket.IO**, 기존 메시지 **조회는 REST**(`GET /chat-rooms/:roomId/messages`)로 한다. REST 전송 API는 두지 않는다
- 인증: 연결할 때 JWT 검증 (16장). 이벤트를 처리할 때도 토큰 만료를 확인하고, 만료되었으면 `UNAUTHORIZED` 에러를 돌려준 뒤 연결을 끊는다
- 요청: `socket.emit("chat:send", { roomId, content, clientMessageId? }, ack)`
  - content: trim 후 1자 이상, 1000자 이하. 원문 저장, HTML 저장 안 함
  - clientMessageId: 선택. 프론트엔드가 보낸 메시지와 ack를 맞추기 위한 임시 ID (DB에 저장하지 않음)
- 응답(ack): 성공 `{ data: { id, chat_room_id, sender_id, content, read_at: null, created_at } }` / 실패 `{ error: { code, message } }` (REST와 같은 형식)
- 조건: 참여자, 차단 없음, 상품이 삭제되지 않음. 거래완료 상품의 기존 방은 전송 가능 (D23)
- 처리: `messages` INSERT → COMMIT 후 `chat:message`(`chat:{roomId}` 방), `chat:new-message`(상대 `user:` 방) 전송. 알림 테이블에는 저장하지 않음 (D12)
- 속도 제한: 사용자별 기본 rate limit을 서버 메모리로 적용한다 (D23). 기본값 예: **10초에 10개**, 구현 시 조정
- 에러 code: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`(참여자 아님), `CHAT_READ_ONLY`(삭제된 상품), `CHAT_UNAVAILABLE`(차단, 일반 문구), `RATE_LIMITED`

### POST /chat-rooms/:roomId/read — 읽음 처리
- 인증: 필수
- 응답: `{ read_count }`. 상대가 보낸 안 읽은 메시지의 `read_at`을 일괄 갱신 (12.3 #5)
- 처리: Socket.IO `chat:read`(방) 전송
- 권한: 참여자. 에러: 404

---

## 9. 가격 제안

관련 테이블: `price_offers`, `chat_rooms`, `products`, `blocks`, `notifications`

### POST /chat-rooms/:roomId/price-offers — 가격 제안
- 인증: 필수
- 요청: `{ offered_price }`
- 응답: `201 { id, offered_price, status: "PENDING", created_at }`
- 권한: 이 방의 **구매자** (판매자·비참여자 → 404) `[확정 9]`
- 조건 (D22): 상품 `ON_SALE` + 삭제 안 됨, `offered_price < products.price`, 이 방에서 최근 24시간 제안 3회 미만, 대기 중 제안 없음, 차단 없음
- 알림: 판매자 ← `PRICE_OFFER_RECEIVED`
- 에러: 400, 400 `OFFER_PRICE_TOO_HIGH`, 404, 409 `PRODUCT_NOT_ON_SALE`, 409 `OFFER_ALREADY_PENDING`(`uq_price_offers_pending`), 409 `CHAT_UNAVAILABLE`, 429 `OFFER_LIMIT_EXCEEDED`

### GET /chat-rooms/:roomId/price-offers — 제안 내역
- 인증: 필수
- 응답: `{ items: [{ id, offered_price, status, responded_at, created_at }], remaining_offers_24h }` (`remaining_offers_24h`는 구매자에게만)
- 권한: 참여자

### POST /price-offers/:offerId/accept — 수락
### POST /price-offers/:offerId/reject — 거절
- 인증: 필수
- 응답: `{ id, offered_price, status, responded_at }`
- 권한: 그 방 상품의 **판매자**
- 조건: `status = 'PENDING'` (조건부 UPDATE, 15.3), 상품 `ON_SALE` 또는 `RESERVED` + 삭제 안 됨 (17장 #5)
- 알림: 구매자 ← `PRICE_OFFER_ACCEPTED` / `PRICE_OFFER_REJECTED`
- 에러: 404 (판매자가 아닌 경우 포함), 409 `OFFER_NOT_PENDING`, 409 `PRODUCT_NOT_AVAILABLE`

### POST /price-offers/:offerId/cancel — 제안 취소
- 인증: 필수
- 응답: `{ id, status: "CANCELED", responded_at }`
- 권한: 그 방의 **구매자**. 조건: `PENDING`
- 알림: 없음 (알림 type에 없음)
- 에러: 404 (구매자가 아닌 경우 포함), 409 `OFFER_NOT_PENDING`

---

## 10. 거래 약속

관련 테이블: `trade_appointments`, `chat_rooms`, `products`, `transactions`, `blocks`, `notifications`
위치(장소·좌표)는 **채팅방 참여자에게만** 반환 (5.11, 15.2)

### POST /chat-rooms/:roomId/appointments — 약속 만들기
- 인증: 필수
- 요청: `{ scheduled_at, place_name, place_address?, latitude?, longitude? }` (좌표는 둘 다 있거나 둘 다 없음)
  - 장소는 프론트엔드가 **카카오 지도 JavaScript SDK**로 고른 값을 보낸다 `[확정 10]`. 백엔드는 카카오 API를 호출하지 않고 값의 형식·범위만 검증한다
- 응답: `201` 약속 객체 `{ id, proposer_id, scheduled_at, place_name, place_address, latitude, longitude, status, closed_at, closed_by, created_at, is_past }`
- 권한: 참여자 (판매자·구매자 모두)
- 조건 (D14, 17장 #6): 차단 없음, `scheduled_at > now()`, 상품이 `ON_SALE`이거나 `RESERVED`이면서 이 방이 예약된 구매자의 방. 거래완료·삭제 상품 불가
- 처리: 이 방에 **지난** SCHEDULED 약속이 있으면 먼저 `EXPIRED`로 종료. **미래** SCHEDULED 약속이 있으면 409 (변경 API 사용)
- 알림: 상대방 ← `APPOINTMENT_CREATED`
- 에러: 400, 404, 409 `APPOINTMENT_EXISTS`, 409 `APPOINTMENT_NOT_ALLOWED`, 409 `CHAT_UNAVAILABLE`

### GET /chat-rooms/:roomId/appointments — 약속 내역 (변경 이력 포함)
- 인증: 필수
- 응답: 약속 객체 목록 (최신순, `idx_trade_appointments_room`)
- 권한: 참여자

### PUT /appointments/:appointmentId — 약속 변경
- 인증: 필수
- 요청: 약속 만들기와 같음
- 응답: `200` **새** 약속 객체
- 권한: 참여자
- 조건: 기존 약속이 `SCHEDULED`이고 `scheduled_at > now()` (지난 약속은 변경 불가), 새 약속은 생성 조건을 만족
- 처리(한 트랜잭션): 기존 → `CANCELED`(`closed_by` = 나, `closed_at` = now) + 새 행 INSERT(`proposer_id` = 나)
- 알림: 상대방 ← `APPOINTMENT_UPDATED` (새 약속 id)
- 에러: 400, 404, 409 `APPOINTMENT_NOT_CHANGEABLE`, 409 `APPOINTMENT_NOT_ALLOWED`, 409 `CHAT_UNAVAILABLE`

### POST /appointments/:appointmentId/cancel — 약속 취소
- 인증: 필수
- 응답: 약속 객체 (`CANCELED`)
- 권한: 참여자. 조건: `SCHEDULED` + 미래 약속
- 알림: 상대방 ← `APPOINTMENT_CANCELED`
- 에러: 404, 409 `APPOINTMENT_NOT_CHANGEABLE`

---

## 11. 거래

관련 테이블: `transactions`, `products`, `chat_rooms`, `price_offers`, `trade_appointments`, `blocks`, `notifications`
**생성·상태 변경은 판매자만** (5.12). `products.status`와 같은 트랜잭션에서 변경 (11.4). 상품 상태를 직접 바꾸는 API는 없다 (D21)

### POST /chat-rooms/:roomId/transactions — 예약 또는 바로 거래완료
- 인증: 필수
- 요청: `{ status: "RESERVED" | "COMPLETED" }`. 구매자는 이 방의 구매자로 정해진다 (D8, body로 받지 않음)
- 응답: `201` 거래 객체 `{ id, product, buyer, seller, final_price, status, created_at, completed_at, canceled_at }`
- 권한: 그 방 상품의 **판매자** (구매자·비참여자 → 404) `[확정 9]`
- `final_price` `[확정 6]`: **거래 생성 시점에 확정**한다. 값은 이 방에서 가장 최근 ACCEPTED 제안 금액, 없으면 그 시점의 상품 가격 (5.12). 이후 상품 가격이 바뀌거나 새 제안이 수락되어도 **이미 생성된 거래의 `final_price`는 바꾸지 않는다**
- `RESERVED`(예약): 상품 `ON_SALE` + 삭제 안 됨, 차단 없음 → 상품 `RESERVED`. 알림: 구매자 ← `TRADE_RESERVED`
- `COMPLETED`(바로 완료): 상품 `ON_SALE`일 때만. 예약중이면 예약된 거래의 완료 API를 써야 함 (D21) → 상품 `SOLD` + 자동 정리(11.3 "거래완료"). 알림: 구매자 ← `TRADE_COMPLETED`, 다른 구매자들 ← `PRICE_OFFER_EXPIRED` / `APPOINTMENT_CANCELED`
- 에러: 400, 404, 409 `PRODUCT_NOT_ON_SALE`, 409 `PRODUCT_RESERVED`, 409 `TRANSACTION_EXISTS`(`uq_transactions_active_product`), 409 `CHAT_UNAVAILABLE`

### POST /transactions/:transactionId/complete — 예약 → 거래완료
- 인증: 필수
- 응답: 거래 객체
- 권한: 판매자. 조건: `status = 'RESERVED'` (예약된 구매자로만 완료, D21)
- 처리: 거래 `COMPLETED` + 상품 `SOLD` + 자동 정리(11.3) + 알림 (위와 같음)
- 에러: 404, 409 `TRANSACTION_NOT_RESERVED`
- `final_price`는 예약할 때 확정한 값을 그대로 쓴다. 완료 시점에 다시 계산하지 않는다 `[확정 6]`

### POST /transactions/:transactionId/cancel — 예약 취소
- 인증: 필수
- 응답: 거래 객체 (`CANCELED`)
- 권한: 판매자. 조건: `RESERVED`
- 처리: 거래 `CANCELED` + 상품 `ON_SALE` + 자동 정리(11.3 "예약 취소": 그 방의 미래 약속 CANCELED, 지난 약속 EXPIRED, 제안 유지)
- 알림: 구매자 ← `TRADE_CANCELED` (약속 취소 알림은 중복이라 보내지 않음, 11.3)
- 에러: 404, 409 `TRANSACTION_NOT_RESERVED`. 거래완료는 되돌릴 수 없음 (D9)

### GET /transactions — 내 거래 내역 (구매·판매)
- 인증: 필수
- 요청(query): `role` (`buying` | `selling`), `status?`, `cursor?`, `limit?`
- 응답: `[거래 객체 + { review: { can_write, deadline, written } }]` (삭제된 상품도 제목 표시)
- 테이블: `transactions` (`idx_transactions_buyer`), `products` (`idx_products_seller`), `reviews`

### GET /transactions/:transactionId — 거래 상세
- 인증: 필수
- 응답: 거래 객체 + 후기 작성 상태
- 권한: 판매자 또는 구매자. 에러: 404

---

## 12. 후기

관련 테이블: `reviews`, `transactions`, `products`, `user_trust_stats`

### POST /transactions/:transactionId/reviews — 후기 작성
- 인증: 필수
- 요청: `{ rating (1~5), content? (최대 500자) }`
- 응답: `201 { id, rating, content, reviewee: UserSummary, created_at }`
- 권한: 그 거래의 판매자 또는 구매자. 대상자(`reviewee_id`)는 서버가 상대방으로 정함
- 조건 (D24): 거래 `COMPLETED`, `now() <= completed_at + 7일`. 차단 관계여도 작성 가능 (D15)
- 에러: 400, 404, 409 `REVIEW_NOT_ALLOWED`(완료 전), 409 `REVIEW_PERIOD_EXPIRED`, 409 `REVIEW_EXISTS`
- 수정·삭제 API 없음 (D24)

### GET /transactions/:transactionId/reviews — 거래의 후기 (최대 2개)
- 인증: 필수
- 권한: 거래 당사자. 에러: 404
- (사용자별 받은 후기는 `GET /users/:userId/reviews`, 누구나 조회)

---

## 13. 신고

관련 테이블: `reports`, `users`, `products`, `chat_rooms`. 처리는 DB 관리자가 대시보드에서 한다 (D4). 자동 제재·결과 알림 없음 (D16)

### POST /reports — 신고
- 인증: 필수
- 요청: `{ reported_user_id, product_id?, chat_room_id?, reason, content? }`
  - reason: `FRAUD` / `ABUSE` / `PROHIBITED_ITEM` / `SPAM` / `ETC`
  - content: 최대 1000자
- 응답: `201 { id, reason, status: "PENDING", created_at }`
- 조건 (5.14): 자신 신고 불가, `product_id`가 있으면 피신고자의 상품, `chat_room_id`가 있으면 신고자·피신고자가 그 방의 두 참여자, 둘 다 있으면 방의 상품과 일치
- 에러: 400, 400 `INVALID_REPORT_CONTEXT`, 404(사용자 없음), 409 `REPORT_ALREADY_PENDING`(`uq_reports_pending`)

### GET /reports/me — 내가 한 신고 목록
- 인증: 필수
- 응답: `[{ id, reported_user: UserSummary, product_id, chat_room_id, reason, status, created_at }]`
- 피신고자에게 신고 사실이나 `reporter_id`를 보여주는 API는 없다 (15.2)

---

## 14. 차단

관련 테이블: `blocks` + 자동 정리 대상(`price_offers`, `trade_appointments`, `transactions`, `products`, `notifications`)

### PUT /blocks/:userId — 차단
- 효과 `[확정 7]`: 차단한 상대와의 상품·채팅·제안·약속·거래 상호작용을 제한한다 (D15). 차단당한 사람에게는 차단 사실을 직접 드러내지 않는다 (막힌 동작은 일반 code `CHAT_UNAVAILABLE` 등으로 응답)
- 인증: 필수
- 응답: 새로 차단하면 `201`, 이미 차단했으면 `200`
- 조건: 자신 차단 불가
- 처리(새로 차단한 경우 한 트랜잭션, 11.3 "차단"): 두 사람 사이의 모든 방(양쪽이 판매하는 상품 모두)에서 대기·수락 제안 → EXPIRED, 미래 약속 → CANCELED, 지난 약속 → EXPIRED, 예약 → CANCELED + 상품 `ON_SALE`
- 알림: **차단당한 사람에게만**, 그 type의 정해진 수신자일 때만 (예약 취소는 차단당한 사람이 구매자일 때만 `TRADE_CANCELED`). 차단한 사람에게는 보내지 않음
- 에러: 400 (자기 자신), 404 (사용자 없음)

### DELETE /blocks/:userId — 차단 해제
- 인증: 필수
- 응답: `204` (차단이 없어도 204). 자동 정리된 데이터는 되돌리지 않음

### GET /blocks — 내 차단 목록
- 인증: 필수
- 응답: `[{ user: UserSummary, created_at }]`
- 권한: 차단한 쪽만. 차단당한 사람이 알 수 있는 API는 없다

---

## 15. 알림

관련 테이블: `notifications` (+ 대상: `price_offers`, `transactions`, `trade_appointments`, `chat_rooms`, `products`). 채팅 알림은 저장하지 않음 (D12). 생성은 서버만 (9.1). 90일 정리는 정기 작업 (D27, API 아님)

### GET /notifications — 알림 목록
- 인증: 필수
- 요청(query): `unread_only?`, `cursor?`, `limit?`
- 응답: `[{ id, type, read_at, created_at, target }]`
  - `PRICE_OFFER_*`: `{ price_offer_id, offered_price, chat_room_id, product: { id, title } }`
  - `TRADE_*`: `{ transaction_id, final_price, product: { id, title } }`
  - `APPOINTMENT_*`: `{ trade_appointment_id, chat_room_id, scheduled_at, place_name, product: { id, title } }`
- 비고: 알림 문구는 저장하지 않고 프론트엔드가 `type` + `target`으로 만든다 (5.16)

### GET /notifications/unread-count — 안 읽은 알림 수
- 인증: 필수. 응답: `{ count }` (`idx_notifications_unread`)

### POST /notifications/:notificationId/read — 읽음 처리
- 인증: 필수. 응답: `204`. 권한: 받는 사람. 에러: 404

### POST /notifications/read-all — 모두 읽음
- 인증: 필수. 응답: `{ updated }`

---

## 16. Socket.IO 이벤트 (DATABASE.md 12장)

| 방향 | 이벤트 | 방 | 내용 |
|---|---|---|---|
| 연결 | `handshake.auth.token` | — | JWT 검증 실패 시 연결 거부 `[확정 5]`. 성공하면 서버가 `user:{userId}`에 입장시킴. 토큰이 만료되면(1시간) 이벤트 처리 때 `UNAUTHORIZED` 후 연결 종료 → 프론트엔드는 재로그인 후 다시 연결 |
| C → S | `chat:join` `{ roomId }` | `chat:{roomId}` | 참여자 확인 후 입장 (아니면 에러 응답) |
| C → S | `chat:leave` `{ roomId }` | | |
| C → S | `chat:send` `{ roomId, content, clientMessageId? }` + ack | `chat:{roomId}` | 메시지 전송 (8장). ack로 `{ data }` 또는 `{ error }` |
| S → C | `chat:message` | `chat:{roomId}` | 새 메시지 |
| S → C | `chat:read` | `chat:{roomId}` | `{ reader_id, read_at }` |
| S → C | `chat:new-message` | `user:{상대 id}` | 채팅 목록 배지 갱신용 `{ chat_room_id, message }` |
| S → C | `notification:new` | `user:{받는 사람 id}` | 알림 객체 (위 목록 형식) |

- 모든 소켓 전송은 DB **COMMIT 후**에 한다 (12.3)
- 놓친 이벤트는 재연결 시 REST(`unread-count`, 목록 API)로 복구한다

---

## 17. 정책 ↔ API 대응표

| 정책 | 반영 API |
|---|---|
| D2 Access Token만 | 1장 (로그아웃 API 없음) |
| D3 매너온도 계산 | 프로필·상품 상세·목록의 `manner_temperature` (View) |
| D4 관리자 기능 없음 | 신고 상태 변경 API 없음 |
| D5 좋아요 공개 / 장바구니 비공개 | 6장 `favorite_count` 공개, 7장 개수 노출 없음 |
| D7 지역 사전 입력 | 2장 (카카오는 `by-code` 매칭 보조) |
| D8 채팅한 사람만 구매자 | 거래 생성이 채팅방 경로 (`/chat-rooms/:roomId/transactions`) |
| D9 거래완료 되돌리기 불가 | 완료 거래 취소 API 없음 |
| D10 예약중 삭제 불가 | `DELETE /products/:id` 409 |
| D11 자동 정리 | 상품 삭제, 거래완료, 예약 취소, 차단 처리 |
| D12 채팅 알림 비저장 | 메시지는 Socket만, `notifications`에 없음 |
| D13 거래 알림은 구매자에게만 | 11장 알림 |
| D14 약속 즉시 확정 / 변경 = 취소 + 생성 | 10장 |
| D15 차단 | 14장 + 목록 제외 + 채팅·제안·약속·예약 차단 |
| D16 신고 맥락, 자동 제재 없음 | 13장 |
| D17 제한값 | 각 요청 검증 |
| D19 회원 탈퇴 없음 | 탈퇴 API 없음 |
| D20 상품 지역 자동 | `POST /products` (지역 미설정 409) |
| D21 상태는 거래 API로만, 수정은 판매중만 | 4장, 5장, 11장 |
| D22 가격 제안 규칙 | 9장. 상품 가격 인하 시 대기 제안 자동 거절은 4장 (확정 8) |
| D23 채팅 가능 상태, 속도 제한 | 8장 (Socket 전송 rate limit, 확정 5) |
| D24 후기 7일, 수정·삭제 불가 | 12장 |
| D25 조회수 | 상품 상세 |
| D26 자기 상품 관심 불가 | 6·7장 409 `OWN_PRODUCT` |
| D27 알림 90일 | 정기 작업 (API 아님) |
| D28 닉네임 변경 제한 없음 | `PATCH /users/me` |

---

## 18. 결정 사항 기록 (2026-10-05 확정)

| # | 항목 | 결정 | 반영 위치 |
|---|---|---|---|
| 1 | 응답 형식 | 성공 `{ data }`, 목록 `{ data, next_cursor }`, 에러 `{ error: { code, message } }`. 커서 페이지네이션, `limit` 기본 20 / 최대 50 → **결정 20으로 대체 (2026-10-13)** | 0.2 |
| 2 | ID·numeric 타입 | 숫자로 응답 (`bigint`, `numeric` 모두 변환) → **결정 20으로 대체 (2026-10-13)**. numeric 값을 숫자로 응답하는 부분은 유지 | 0.2 |
| 3 | JWT·비밀번호 | Access Token 만료 1시간, Refresh Token 없음. 비밀번호 8~72자 (UTF-8 72바이트 초과 거부) | 0.1, 1장 |
| 4 | 이미지 | JPG/PNG/WebP, 장당 최대 10MB, 상품당 최대 10장, WebP 자동 변환 없음. 업로드 구현은 상품 등록 기능 구현 단계에서 하고 지금은 구현하지 않음. 개발·시연용 더미 상품 이미지는 외부 이미지 또는 별도로 제작한 이미지 사용 가능 | 4장, 5장 |
| 5 | 채팅 | 메시지 전송은 Socket.IO, 기존 메시지 조회는 REST. Socket.IO JWT 인증. 메시지 전송에 기본 rate limit | 8장, 16장 |
| 6 | 거래 가격 | `final_price`는 거래 생성 시 확정. 이후 상품 가격이 바뀌어도 변경하지 않음 | 11장 |
| 7 | 차단 | 차단한 상대와의 상품·채팅·거래 등 상호작용 제한. 차단 사실은 상대에게 직접 노출하지 않음 | 1장, 6~8장, 14장 |
| 8 | 가격 제안 | 상품 가격이 PENDING 제안가 이하로 내려가면 그 제안을 자동 `REJECTED` | 4장 `PATCH /products/:productId` |
| 9 | HTTP 403 | 사용하지 않음. 존재·권한 여부를 숨겨야 하면 404, 잘못된 요청은 400. DATABASE.md의 404 원칙 유지 | 0.3, 9장, 11장 |
| 10 | 카카오 지도 | 프론트엔드에서 카카오 지도 JavaScript SDK 사용. JavaScript 키는 백엔드 API 키와 분리, 허용 도메인 제한, 실제 키는 GitHub에 저장하지 않음 | 10장 |
| 11 | 지역 해제 | `region_id: null`로 해제 불가. 사용자는 항상 하나의 지역을 설정한 상태를 유지 | 1장 |
| 12 | Storage 버킷 | `reown-product-images` | 0.4, 4장 |
| 13 | 삭제된 상품의 이미지 | 상품 삭제 시 Storage 파일과 `product_images` 행도 삭제. DB COMMIT 후 파일 삭제, 실패 시 로그 기록 후 나중에 정리 | 4장 DELETE, 5장 |
| 14 | 가격 인하 자동 거절 알림 | 구매자에게 `PRICE_OFFER_REJECTED` 알림 발송 | 4장 PATCH |
| 15 | 더미 상품 이미지 | Storage에 업로드하고 `storage_path`에 Storage 경로 저장. 외부 URL 직접 저장 금지 | 5장 |
| 16 | 회원가입 시 지역 | ~~선택. 가입 직후 `region_id` NULL 허용~~ → **18번으로 변경됨** | — |
| 17 | 상품 삭제 시 `product_images` | 행도 삭제. DB COMMIT 후 Storage 파일 삭제. Storage 실패가 DB 결과를 되돌리지 않음. 실패 시 로그를 남기고 추후 정리 | 4장 DELETE |
| 18 | 회원가입 시 지역 (16번 변경) | **필수**. `region_id`는 가입 시 반드시 존재해야 하고 유효한 `regions.id`인지 서버가 검증. 가입 후 다른 지역으로 변경 가능, NULL 해제 계속 금지. 상품 등록의 지역 조건(D20)은 유지하되 가입 단계에서 항상 충족됨. 문서 정책만 변경, DB 스키마는 지금 바꾸지 않음 | API.md v1.1, 1장 |

**설계 중 추가로 정한 사항 (유지)**

| 항목 | 내용 | 반영 위치 |
|---|---|---|
| bcrypt 72바이트 제한 | 비밀번호가 UTF-8 기준 72바이트를 넘으면 400 | 1장 |
| Socket.IO 토큰 만료 확인 | 연결 시점뿐 아니라 이벤트를 처리할 때마다 JWT 만료를 확인 | 8장, 16장 |
| 만료 토큰 처리 | 메시지 이벤트에서 토큰이 만료됐으면 `UNAUTHORIZED` 응답 후 연결 종료 | 8장, 16장 |

### 18.2 2차 결정 (2026-10-13 확정)

팀원 구현(`main`, API 문서 v0.3)과 확정본 v1.1을 비교·검토한 뒤 정한 내용이다. 기존 결정 1~18의 번호와 문구는 그대로 두고, 새 결정은 19번부터 붙인다.

| # | 항목 | 결정 | 기존 결정과의 관계 |
|---|---|---|---|
| 19 | 백엔드 언어 | TypeScript 유지. 통합할 때 `npm run typecheck`, `npm run build`가 실제로 통과해야 한다. 실패하면 원인을 보고하고 통과로 보지 않는다. 프론트엔드는 JavaScript 유지 | 새 결정 (CLAUDE.md 2장에 변경 기록 예정) |
| 20 | API 응답 형식 | 기존 구현 기준으로 통일 (18.2.1, 18.2.2) | **결정 1과 2를 대체한다.** 결정 2 중 "numeric 값은 숫자" 부분만 유지 |
| 21 | 경로·동작 조정 | 기능별로 정한다 (18.2.3) | 해당 API의 경로·동작만 대체한다. 기능 범위, 권한, 거래 규칙, 보안 정책은 바꾸지 않는다 |
| 22 | 법정동 원본 파일 | `db/seeds/source/`의 공식 ZIP·TXT를 Git으로 관리한다. `.gitattributes`에 `db/seeds/source/** -text`를 추가하고 commit 후 SHA-256을 다시 검증한다. `db/seeds/001_regions.sql`도 보존한다 | 새 결정 |
| 23 | 브랜치 운영 | 통합이 끝날 때까지 `main` 직접 push를 중단한다. 이후 변경은 작업 브랜치 + PR로만 한다. `main`·`develop` 모두 PR 필수, 직접 push 금지를 적용한다 | CLAUDE.md 13장 브랜치 전략 복구 |

#### 18.2.1 응답 형식 규칙 (결정 20)

**공통 표현**

| 항목 | 규칙 |
|---|---|
| 필드 이름 | API는 **camelCase**(요청 body·query·응답 모두). DB 컬럼은 snake_case |
| ID | **문자열** (`"15"`). 응답, 요청 body(`categoryId`, `chatRoomId`, `regionId` 등), query 모두 문자열. 경로 파라미터는 `^[1-9]\d*$` 형식만 허용 |
| 숫자 값 | 금액, 개수(`favoriteCount`, `viewCount`, `reviewCount`), `avgRating`, `mannerTemperature`, `latitude`, `longitude`는 **숫자** |
| 시간 | UTC ISO 8601 문자열 (`"2026-10-13T03:00:00.000Z"`) |
| 값 없음 | `null`. 빈 목록은 `[]` |
| 상태 값 | 대문자 코드 (`"ON_SALE"` 등) |

**응답 종류 (모든 API는 다음 다섯 가지 중 하나만 사용)**

| 종류 | 형식 | 대상 |
|---|---|---|
| ① 단건 리소스 | `{ "data": { "<리소스>": { ... } } }` | 상세 조회, 생성(201), 수정(200). 예: `data.product`, `data.transaction`, `data.user`, `data.appointment` |
| ② 목록 (커서) | `{ "data": { "items": [ ... ], "pageInfo": { "nextCursor": string\|null, "hasNext": boolean } } }` | 상품·좋아요·거래·메시지·알림 등 페이지가 있는 목록 |
| ③ 목록 (전체) | `{ "data": { "items": [ ... ] } }` | 페이지 없는 기준 데이터 목록. 예: 카테고리, 시·도, 시·군·구 |
| ④ 동작 결과 | `{ "data": { "<결과 이름>": { ... } } }`. 인증 결과만 `{ "data": { "accessToken", "expiresIn", "user" } }` | 좋아요·장바구니 → `data.favorite`, `data.cartItem`. 읽음 처리 → `data.read: { readCount }`. 개수 → `data.unreadCount: { count }`. 회원가입·로그인 → 인증 결과 |
| ⑤ 본문 없음 | `204 No Content` | 상품 삭제, 차단 해제, 알림 읽음 등 반환할 데이터가 없는 경우 |

**통일 대상 (현재 구현이 위 규칙과 다른 API)**

| API | 현재 구현 | 통일 후 |
|---|---|---|
| `PATCH /products/:productId` (상품 수정) | 수정된 DB 행을 그대로 반환 | ① `data.product`를 상품 상세와 같은 형식으로 반환 |
| 좋아요 | `POST` 한 번으로 추가·취소 전환, `data` 안에 결과 필드를 바로 담음 | `PUT` / `DELETE` 모두 ④ `data.favorite: { productId, isFavorited, favoriteCount }` |
| 회원가입·로그인 | `data: { accessToken, user: { …, regionId } }` | ④ `data: { accessToken, expiresIn, user: { id, email, nickname, region: { id, sido, sigungu, eupmyeondong } } }` |
| 카테고리·지역 목록 | `data.items` | 그대로 (③) |
| 상품·좋아요 목록 | `data.items` + `pageInfo` | 그대로 (②) |
| 거래 생성·변경 | `data.transaction` | 그대로 (①) |

**페이지네이션**: 커서 방식. `limit`은 **기본 20, 최소 1, 최대 100** (결정 1의 "최대 50"을 대체). `cursor`는 서버가 만든 불투명 문자열이며 첫 요청에는 보내지 않는다. 허용하지 않는 query 값이나 정의되지 않은 필드는 400 `VALIDATION_ERROR`.

**Socket.IO ack**: 성공 `{ data: { message: {...} } }`, 실패 `{ error: {...} }` (REST와 같은 형식).

#### 18.2.2 오류 응답 규칙 (결정 20)

형식: `{ "error": { "code": string, "message": string, "details"?: { [필드]: string } } }`. `details`는 입력값 오류일 때 필드별 메시지를 담는다. SQL, 스택 트레이스, 환경변수는 응답에 넣지 않는다.

| HTTP | code | 상황 |
|---|---|---|
| 400 | `INVALID_JSON` | JSON 문법 오류 |
| 400 | `VALIDATION_ERROR` | 형식·길이·범위 오류, 정의되지 않은 필드, 없는 카테고리·지역 (`details`에 필드 표시) |
| 401 | `AUTHENTICATION_REQUIRED` | 토큰 없음 |
| 401 | `INVALID_TOKEN` | 토큰이 잘못됐거나 만료됨 (Socket 이벤트 포함) |
| 401 | `INVALID_CREDENTIALS` | 로그인 실패 (이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않음) |
| 404 | `RESOURCE_NOT_FOUND` | 데이터가 없거나 **권한이 없음** (403은 쓰지 않음, 결정 9 유지) |
| 409 | `RESOURCE_CONFLICT` | 중복, 상태 조건 불일치, 차단으로 막힘 (차단 사실을 드러내지 않는 일반 문구) |
| 429 | `RATE_LIMIT_EXCEEDED` | 메시지 전송 제한, 가격 제안 24시간 3회 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 오류, Storage 오류 |

**v1.1 기능별 code와의 대응**

| v1.1 code | 이번 규칙 |
|---|---|
| `UNAUTHORIZED` | `AUTHENTICATION_REQUIRED` / `INVALID_TOKEN` |
| `NOT_FOUND`, `REGION_NOT_FOUND` | `RESOURCE_NOT_FOUND` |
| `EMAIL_TAKEN`, `NICKNAME_TAKEN` | `RESOURCE_CONFLICT` + `details.email` / `details.nickname` |
| `INVALID_REGION`, `INVALID_CATEGORY`, `INVALID_PASSWORD`, `IMAGE_COUNT_INVALID`, `INVALID_IMAGE`, `INVALID_REPORT_CONTEXT` | `VALIDATION_ERROR` + `details` |
| `OWN_PRODUCT`, `PRODUCT_NOT_EDITABLE`, `PRODUCT_NOT_ON_SALE`, `PRODUCT_NOT_AVAILABLE`, `PRODUCT_RESERVED`, `REGION_REQUIRED`, `CHAT_NOT_ALLOWED`, `CHAT_READ_ONLY`, `CHAT_UNAVAILABLE`, `OFFER_ALREADY_PENDING`, `OFFER_NOT_PENDING`, `APPOINTMENT_EXISTS`, `APPOINTMENT_NOT_ALLOWED`, `APPOINTMENT_NOT_CHANGEABLE`, `TRANSACTION_EXISTS`, `TRANSACTION_NOT_RESERVED`, `REVIEW_NOT_ALLOWED`, `REVIEW_PERIOD_EXPIRED`, `REVIEW_EXISTS`, `REPORT_ALREADY_PENDING`, `IMAGE_LIMIT_EXCEEDED`, `LAST_IMAGE` | `RESOURCE_CONFLICT` (상황은 `message`로 설명) |
| `RATE_LIMITED`, `OFFER_LIMIT_EXCEEDED` | `RATE_LIMIT_EXCEEDED` |
| `STORAGE_ERROR` | `INTERNAL_SERVER_ERROR` |

409 안에서 프론트엔드가 상황별로 다른 화면을 보여야 하는 경우에 기능별 code를 추가할지는 아직 정하지 않았다 (19.1 3번).

#### 18.2.3 경로·동작 조정 (결정 21)

| 기능 | 결정 | 상태 |
|---|---|---|
| 거래 생성 | `POST /products/:productId/transactions` + `{ chatRoomId, status }` (구현 유지). 서버가 채팅방이 그 상품의 방인지 확인해 D8을 지킨다 | 구현됨 |
| 거래 완료·취소 | `PATCH /transactions/:transactionId` + `{ status: "COMPLETED" \| "CANCELED" }` (구현 유지) | 구현됨 |
| 거래 조회 | `GET /transactions`(`role`, `status`, 커서), `GET /transactions/:transactionId` 추가 | 미구현 |
| 좋아요 | `PUT` / `DELETE /products/:productId/favorite`로 통일. `POST` 전환 방식은 제거 | 구현 수정 필요 |
| 좋아요·장바구니 목록 경로 | 미확정 (19.1 1번) | 좋아요만 구현됨 (`GET /favorites`) |
| 지역 | `GET /regions`는 `keyword` 또는 `sido`(+`sigungu`) 중 하나 이상 필수. `GET /regions/sido`, `GET /regions/sigungu`, `GET /regions/by-code/:code` 추가 | 일부 구현 (keyword 검색만) |
| 상품 목록 | 구현의 query 이름 유지(`keyword`, `categoryId`, `regionId`, `minPrice`, `maxPrice`, `sort=latest\|oldest\|priceAsc\|priceDesc\|views`). v1.1 기능인 `sido`·`sigungu` 필터와 `status` 여러 개 지정 추가. 목록 항목에 `seller: { id, nickname, mannerTemperature }` 추가 | 일부 구현 |
| 상품 상세 | `isMine`, `isInCart`, `myChatRoomId` 추가 | 구현 수정 필요 |
| 이미지 순서 변경 | 미확정 (19.1 2번) | 미구현 |
| 그 밖의 v1.1 API (상품 등록·이미지, 장바구니, 채팅, 제안, 약속, 후기, 신고, 차단, 알림, 회원정보) | 기능 범위·권한·규칙은 v1.1 그대로. 형식만 18.2.1·18.2.2로 바꿔 적는다 | 미구현 |

#### 18.2.4 유지하는 v1.1 업무 규칙·보안 정책 (형식 결정과 별개)

- **인증·보안**: 사용자 ID는 JWT에서만 가져온다. 권한이 없으면 404로 존재 여부를 숨긴다. 비밀번호는 bcrypt로 저장한다. 응답에 비밀번호 해시와 비밀값을 넣지 않는다. SQL 값은 모두 파라미터로 바인딩한다.
- **재확인한 결정** (번호와 내용 그대로): 3(JWT 1시간, 비밀번호 8~72자), 설계 중 추가 사항(72바이트 초과 거부, Socket 이벤트마다 토큰 만료 확인), 18·11(회원가입 시 지역 필수, NULL 해제 불가), 8·14(가격 인하 시 대기 제안 자동 거절과 알림), 13·17(상품 삭제 시 이미지 행 삭제 → COMMIT → Storage 삭제), 6(`final_price` 생성 시 확정), 7(차단 사실 미노출), 9(403 미사용)
- **DB 정책**: D1~D28, DATABASE.md 9장 권한 매트릭스, 11.3 자동 정리 규칙
- 현재 구현이 위 규칙과 다르면 **구현을 수정한다** (문서를 바꾸지 않는다). 수정 대상: JWT 기본값 2h, 비밀번호 8~20자, 회원가입 지역 미지원, `PATCH /users/me` 미구현, 가격 인하 처리 없음

#### 18.2.5 결정 이유와 영향

| # | 이유 | DB | 백엔드 | 프론트엔드 |
|---|---|---|---|---|
| 19 | 전환이 이미 끝났고, 되돌리는 비용이 유지 비용보다 크다. 타입 검사로 협업 중 실수를 줄인다 | 없음 | 빌드 단계 추가. typecheck·build 통과가 병합 조건 | 없음 |
| 20 | 프론트엔드 시작 전이라 형식을 바꿀 비용이 없고, 구현 형식이 합리적이다 | 없음 | 응답이 다른 API 몇 곳만 맞춤 | 하나의 형식으로 API 클라이언트 작성 |
| 21 | 정책을 지키는 구현은 유지하고, 같은 요청을 반복하면 결과가 달라지는 문제(좋아요)와 기능 누락(지역 단계 선택, 거래 조회)만 보완한다 | 없음 (기존 테이블·인덱스로 처리) | API 추가·수정 | 지역 단계 선택 화면 가능 |
| 22 | 원본이 있어야 seed를 재현·검증할 수 있다 | 없음 (이미 적용됨) | 없음 | 없음 |
| 23 | `main`과 `develop`이 갈라진 원인이 직접 push였다 | 없음 | 작업 방식 변경 | 같음 |

## 19. 남은 확인 항목

없음. 2026-10-05에 모든 결정 사항이 확정되었다 (18장 1~18번). 18번은 같은 날 16번(회원가입 시 지역 선택)을 필수로 바꾼 결정이다. 마지막 두 항목(회원가입 시 지역, 상품 삭제 시 `product_images` 처리)은 16·17번으로 확정되었다.

### 19.1 2026-10-13 기준

| # | 항목 | 확인할 사람 |
|---|---|---|
| 1 | 좋아요·장바구니 목록 경로를 `GET /favorites`·`GET /cart`(구현 방식)로 할지 `GET /users/me/favorites`·`GET /users/me/cart`(v1.1)로 할지. 두 목록은 같은 방식으로 맞춘다 | 팀 |
| 2 | 이미지 순서 변경 메서드를 `PUT`(v1.1)과 `PATCH`(v0.3) 중 무엇으로 할지 | 팀 |
| 3 | 409 안에서 화면 분기가 필요한 상황(예: 자기 상품, 제안 횟수 초과)에 기능별 code를 추가할지 | 프론트엔드 담당 |
| 4 | 백엔드 `npm run typecheck`·`npm run build` 통과 여부 | 통합 담당 (아직 실행하지 않음) |
| 5 | Supabase에 `region_id`가 NULL인 회원이 있는지 | DB 관리자 |
| 6 | 팀원이 TypeScript 전환과 JWT 2h를 택한 이유 (CLAUDE.md 기록용, 결정에는 영향 없음) | 팀원 |

---

## 20. API 확정 후 후속 문서 수정 사항

API가 확정되었으므로(`docs/API.md` v1.0) 아래 문서를 맞춘다. **아직 수정하지 않았다.** 모두 문서 수정이며 DB 스키마 변경은 없다.

### 20.1 문서

| 문서 | 수정 내용 | 관련 결정 |
|---|---|---|
| `docs/API.md` | **완료 (v1.1)**. 이 문서를 옮기고 작업 표시·기록(18~20장)은 뺐다. v1.1에서 회원가입 시 지역 필수 반영 | 전체 |
| `docs/API_DRAFT.md` | 후속 문서 수정이 끝나면 삭제할지, 결정 기록으로 남길지 정한다 | — |
| `docs/DATABASE.md` 2.2 | 새 서비스 정책을 D29부터 추가할지 검토: 가격 인하 시 대기 제안 자동 거절, 지역 해제 불가, 삭제 상품 이미지 삭제, `final_price` 생성 시 확정 | 6, 8, 11, 13 |
| `docs/DATABASE.md` 4.2 | Storage 버킷 이름 `reown-product-images` 명시 | 12 |
| `docs/DATABASE.md` 5.1 | `region_id` 설명의 "가입 직후 미설정 가능"을 **"회원가입 시 필수. 서버가 유효한 `regions.id`인지 검증. 가입 후 다른 지역으로 변경 가능, NULL 해제 불가"**로 변경. 컬럼은 당분간 NULL 허용으로 두고 서버(API)에서 강제한다는 점을 명시 | 11, 18 |
| `docs/DATABASE.md` 2.1 / 2.2 | D20 설명 보강: "지역은 회원가입 시 필수이므로 상품 등록 조건은 항상 충족". 회원가입 지역 필수를 새 정책(D29~)으로 기록할지 검토 | 18 |
| `docs/DATABASE.md` 5.4 | 백엔드 규칙 "지역을 설정하지 않은 사용자는 상품을 등록할 수 없다"에 "회원가입 시 지역 필수로 항상 충족, 방어적 검증만 유지" 추가 | 18 |
| `docs/DATABASE.md` 6.1 | 관계 목록 `regions 1 : N users (users.region_id, 선택)`의 "선택"을 "회원가입 시 필수(API에서 강제)"로 | 18 |
| `docs/DATABASE.md` 9.1 | `users` 생성 조건에 "지역 필수" 표시 | 18 |
| `docs/DATABASE.md` 10.1 | 회원/지역 규칙 표에 "회원가입 시 지역 필수(BE), 설정 후 NULL 해제 불가(BE)" 추가 | 11, 18 |
| `docs/DATABASE.md` 7장 | `users.region_id → regions` ON DELETE `SET NULL`은 지역 필수 정책과 맞지 않는다. `regions`는 사용자가 지우지 않는 기준 데이터라 실제 영향은 거의 없지만, 문서에 "지역 행은 삭제하지 않는다"를 명시하고 RESTRICT 변경은 아래 스키마 검토 항목으로 넘긴다 | 18 |
| `docs/DATABASE.md` 5.5 | 상품 삭제 시 `product_images` 행·Storage 파일 삭제, COMMIT 후 파일 삭제 순서, Storage 실패는 DB 결과를 되돌리지 않고 로그 후 정리, 더미 이미지도 Storage 경로만 저장 | 13, 15, 17 |
| `docs/DATABASE.md` 5.10 | 상태 전이표에 `PENDING → REJECTED`(시스템: 상품 가격이 제안가 이하로 인하) 추가. 현재 표는 REJECTED 주체가 판매자뿐 | 8 |
| `docs/DATABASE.md` 5.12 | `final_price`는 거래 생성 시 확정되고 이후 바뀌지 않는다는 문장 추가 | 6 |
| `docs/DATABASE.md` 7장 | "상품 소프트 삭제 시 데이터 처리"에 이미지 행·파일 삭제 추가 | 13, 17 |
| `docs/DATABASE.md` 11.3 | 자동 정리 표에 "상품 가격 인하" 이벤트 추가 (대기 제안 → REJECTED, 구매자 ← `PRICE_OFFER_REJECTED`) | 8, 14 |
| `docs/DATABASE.md` 12.2 | 알림 이벤트에 가격 인하 자동 거절 추가 | 14 |
| `docs/DATABASE.md` 15.2 | 이미지 업로드 규칙 구체화 (JPG/PNG/WebP, 10MB, 변환 없음) | 4 |
| `docs/DATABASE.md` 19장 | 변경 이력 추가 (예: v1.2, "정책·문서 보강. 테이블·컬럼·제약 변경 없음") | — |
| `CLAUDE.md` 9장 | "프론트엔드에 민감한 키 노출 금지"에 예외 명시: 카카오 지도 **JavaScript 키**는 공개용 키라 프론트엔드에서 쓰되 허용 도메인을 제한하고 실제 값은 Git에 올리지 않는다. Supabase 키는 계속 프론트엔드 금지 | 10 |
| `CLAUDE.md` 6장 | 현재 DB 상태 표의 API 항목을 "확정 (`docs/API.md`)"으로 갱신 | — |
| `README.md` | 환경변수 절에 프론트엔드용 `VITE_KAKAO_JS_KEY` 안내 추가, "현재 프로젝트 상태" 표에서 API 명세를 완료로 갱신 | 10 |
| `.env.example` (루트, 백엔드) | `SUPABASE_STORAGE_BUCKET=reown-product-images` 추가 검토 (비밀값이 아니므로 값까지 적어도 됨). "프론트엔드에는 Supabase 키를 넣지 않는다" 주석은 유지 | 12 |
| `frontend/.env.example` (새 파일) | `VITE_KAKAO_JS_KEY=` (값은 비움). 루트 `.env.example`의 "VITE_ 접두사 금지"는 백엔드 변수에 대한 규칙이라는 점을 주석으로 구분 | 10 |
| `docs/PROJECT_STATUS.md` | 진행 단계를 "API 명세 확정"으로 갱신 | — |

- `.gitignore`는 수정이 필요 없다. 슬래시 없는 `.env`, `.env.*` 규칙이 `frontend/.env`에도 적용되고, `!.env.example`이 `frontend/.env.example`도 포함한다.
- `db/README.md`, `docs/DB_CONNECTION.md`는 이번 결정과 관련된 수정 사항이 없다.

### 20.2 추후 DB 스키마 검토 (지금은 변경하지 않음)

회원가입 시 지역 필수(결정 18)는 지금 **문서와 서버 검증으로만** 강제한다. DB에서도 강제하려면 DB 관리자 승인 후 새 migration(`002_…sql`)으로 검토한다. `001_initial_schema.sql`은 수정하지 않는다.

| 검토 항목 | 내용 | 주의 |
|---|---|---|
| `users.region_id` NOT NULL | `ALTER TABLE users ALTER COLUMN region_id SET NOT NULL` | 적용 전에 `region_id`가 NULL인 사용자가 없어야 한다 |
| `fk_users_region` ON DELETE | `SET NULL` → `RESTRICT` | NOT NULL과 함께 바꾸지 않으면 지역 행 삭제 시 제약 위반 |
| 문서 동기화 | DATABASE.md 5.1·7장·16장 ERD, `db/erd/` 재생성 | migration 적용 후 |

### 20.3 문서가 아닌 관리 작업 (DB 관리자 / 담당자)

| 작업 | 담당 | 비고 |
|---|---|---|
| Supabase Storage 버킷 `reown-product-images` 생성 (공개 읽기) | DB 관리자 | 버킷 설정에서 파일 크기 제한 10MB와 허용 MIME(`image/jpeg`, `image/png`, `image/webp`)도 지정하면 서버 검증과 이중으로 막을 수 있다 |
| 카카오 개발자 콘솔에서 JavaScript 키 확인, 허용 도메인 등록 (`localhost` 개발 주소 포함) | 키 관리 담당 | 실제 키는 팀원에게 비공개로 전달 |
| 카테고리·지역 seed 적용 | DB 관리자 | 승인 후. 지역 seed는 **회원가입**의 선행 조건이기도 하다 (결정 18) |

### 20.4 2차 결정(19~23)에 따른 후속 수정 (2026-10-13 추가)

위 20.1~20.3의 기존 항목은 그대로 유지하고, 아래 항목을 더한다. 아직 수정하지 않았다.

| 대상 | 수정 내용 | 관련 결정 |
|---|---|---|
| `docs/API.md` | 18.2 기준으로 v1.2 작성 (`main`의 팀원 문서 v0.3과 병합할 때 충돌을 해결하면서 작성) | 20, 21 |
| `CLAUDE.md` 2장 | 백엔드 TypeScript 전환 기록 (변경 이유, 날짜, 합의) | 19 |
| `CLAUDE.md` 13장 | `main`·`develop` 브랜치 보호(PR 필수, 직접 push 금지) 적용 사실 | 23 |
| `.gitattributes` | `db/seeds/source/** -text` 추가 | 22 |
| `backend/src/config/env.ts`, `.env.example` | `JWT_EXPIRES_IN` 기본값을 `1h`로 (구현 수정 단계) | 3 |
| 백엔드 구현 | 18.2.1 통일 대상과 18.2.4 수정 대상을 기능별 PR로 반영 | 3, 8, 11, 14, 18, 20, 21 |
