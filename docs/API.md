# REOWN API 명세

> 상태: **확정 v1.1 (2026-10-05)**. 백엔드·프론트엔드 구현의 기준 문서다.
> 기준: `docs/DATABASE.md` v1.1 (D1~D28, 9장 권한 매트릭스, 10~12장), `db/migrations/001_initial_schema.sql`
> 전제: **DB 구조를 바꾸지 않는다.** 모든 API는 기존 16개 테이블과 View `user_trust_stats`만 사용한다.
> 결정 과정과 후속 문서 수정 목록은 `docs/API_DRAFT.md` 18~20장에 기록되어 있다.

---

## 0. 공통 규칙

### 0.1 기본

| 항목 | 규칙 |
|---|---|
| Base URL | `/api/v1` (CLAUDE.md 7장) |
| 형식 | JSON (`Content-Type: application/json`). 이미지 업로드만 `multipart/form-data` |
| 인증 | `Authorization: Bearer <access_token>` (JWT, D2: Access Token만 사용, Refresh Token 없음). **만료 1시간**. 만료되면 401 → 프론트엔드는 로그인 화면으로 보낸다 |
| 로그아웃 | API 없음. 클라이언트가 토큰을 삭제한다 (D2) |
| 사용자 ID | **JWT에서만** 가져온다. body·query의 사용자 ID로 "나"를 판단하지 않는다 (9.2 #4) |
| 시간 | ISO 8601 UTC 문자열 (`2026-10-04T12:00:00Z`). 화면에서 KST로 표시 |
| 상태 코드 값 | DB 코드 그대로 전달 (`ON_SALE` 등). 화면 문구는 프론트엔드가 매핑 (DATABASE.md 4.1) |

**인증 표기**: `필수` = 토큰 없으면 401 / `선택` = 토큰이 있으면 개인화(내 좋아요 여부, 차단 사용자 상품 제외 등) / `없음`

### 0.2 응답 형식

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
- **ID와 numeric 값은 숫자로 응답**: `pg`는 `bigint`(ID, `count()`)와 `numeric`(`avg_rating`, `manner_temperature`, `latitude`, `longitude`)을 문자열로 돌려주므로 백엔드에서 숫자로 변환해 응답한다. 요청의 ID도 숫자로 받는다.

### 0.3 공통 에러

| HTTP | code | 상황 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 필수값 누락, 형식·길이·범위 오류, 허용되지 않은 필드 |
| 401 | `UNAUTHORIZED` | 토큰 없음·만료·위조 |
| 404 | `NOT_FOUND` | 데이터가 없거나 **접근 권한이 없음**. 당사자지만 그 행위의 주체가 아닌 경우(예: 판매자가 가격 제안 생성, 구매자가 예약 생성)도 404 (존재·권한 여부를 숨긴다, 9.2 #3) |
| 409 | 기능별 code | 상태 조건 불일치, 중복 (UNIQUE 위반 23505 포함) |
| 429 | `RATE_LIMITED` 등 | 메시지 전송 속도 제한(D23), 제안 24시간 3회(D22) |
| 500 | `INTERNAL_ERROR` | 서버 오류. 내부 메시지·SQL을 노출하지 않는다 |

- **403은 쓰지 않는다**. 권한·존재 여부를 숨겨야 하면 404, 요청 자체가 잘못되면 400 (DATABASE.md 9.2 원칙 유지).
- DB 에러 매핑: `23505`(UNIQUE) → 409, `23503`(FK) → 400 또는 404, `23514`(CHECK) → 400.
- **차단 관련 에러는 차단 사실을 드러내지 않는 일반 code**(`CHAT_UNAVAILABLE`)를 쓴다 (D15, 10.9).

### 0.4 공통 응답 객체

```text
UserSummary     { id, nickname }
PublicProfile   { id, nickname, region: RegionName, manner_temperature, avg_rating, review_count, created_at }
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
- 요청: `{ email, password, nickname, region_id }`
  - email: trim + 소문자 정규화, 최대 255자
  - password: **8~72자**. bcrypt는 **72바이트**까지만 사용하므로 UTF-8 기준 72바이트를 넘으면 400 (한글 등 다중 바이트 문자를 포함한 경우)
  - nickname: `^[가-힣a-zA-Z0-9]{2,20}$` (D17)
  - region_id: **필수**. 존재하는 `regions.id`인지 서버가 확인한다. 누락·`null`·숫자가 아님 → 400 `VALIDATION_ERROR`, 존재하지 않는 지역 → 400 `INVALID_REGION`
  - 따라서 모든 회원은 가입 시점부터 지역이 설정되어 있다. 가입 후에는 다른 지역으로 변경할 수 있지만 NULL로 해제할 수는 없다 (`PATCH /users/me`)
- 응답: `201 { access_token, expires_in, user: { id, email, nickname, region } }`
- 권한: 없음
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_REGION`, 409 `EMAIL_TAKEN`, 409 `NICKNAME_TAKEN`
- 처리: bcrypt(cost 10 이상) 해시만 저장 (10.1)
- 비고: 지역 목록은 `regions` 기준 데이터(D7)에서 고른다. 지역 seed가 적용되기 전에는 회원가입을 할 수 없다

### POST /auth/login — 로그인
- 인증: 없음
- 요청: `{ email, password }`
- 응답: `200 { access_token, expires_in, user: { id, email, nickname, region } }`
- 에러: 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` (이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않음)
- 토큰 만료: 1시간 (`expires_in: 3600`). Refresh Token 없음

### GET /users/me — 내 정보
- 인증: 필수
- 응답: `{ id, email, nickname, region, manner_temperature, avg_rating, review_count, created_at }`
- 에러: 401

### PATCH /users/me — 닉네임·지역 변경
- 인증: 필수
- 요청: `{ nickname?, region_id? }`
  - region_id: 보내면 다른 지역으로 **변경**한다. 존재하는 `regions.id`인지 서버가 확인한다 (없으면 400 `INVALID_REGION`). `null`(지역 해제)은 400 `VALIDATION_ERROR`. 보내지 않으면 지역은 그대로다
  - 사용자는 가입부터 항상 하나의 지역을 설정한 상태를 유지한다
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
- 차단: 내가 차단한 사용자의 프로필에 직접 들어온 경우는 상품 상세와 같이 허용한다 (17장 #7). 차단당한 사람에게 차단 사실은 드러내지 않는다

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
  - 상품 `region_id`는 등록 시점의 내 지역(`users.region_id`)을 서버가 자동 저장한다 (D20)
  - 지역이 없는 사용자는 등록할 수 없다는 D20 조건은 유지한다. 회원가입에서 지역이 필수이고 해제할 수 없으므로 API로 가입한 사용자는 항상 이 조건을 충족한다. 다만 DB 컬럼은 NULL을 허용하므로 서버는 방어적으로 확인하고, NULL이면 409 `REGION_REQUIRED` (정상 흐름에서는 발생하지 않음)
  - `seller_id` = 나, `status` = `ON_SALE`
- 처리: 한 트랜잭션에서 `products` INSERT → Storage 업로드(`products/{product_id}/{uuid}.{ext}`, 경로는 서버가 생성) → `product_images` INSERT. 실패하면 롤백하고 올린 파일 삭제
- 에러: 400 `VALIDATION_ERROR`, 400 `INVALID_CATEGORY`, 400 `IMAGE_COUNT_INVALID`, 400 `INVALID_IMAGE`(형식·크기·확장자·MIME), 409 `REGION_REQUIRED`, 500 `STORAGE_ERROR`
- 이미지 규칙: **JPG / PNG / WebP**, 장당 **최대 10MB**, 상품당 **1~10장**. WebP 자동 변환 없음(원본 형식 그대로 저장). 확장자와 MIME을 함께 검증
- 구현 시점: 이미지 업로드는 **상품 등록 기능 구현 단계**에서 개발한다
- Storage 버킷: **`reown-product-images`** (공개 읽기, 업로드·삭제는 백엔드 service role 키로만). 파일 경로는 버킷 안의 `products/{product_id}/{uuid}.{ext}`이고 이 경로를 `product_images.storage_path`에 저장한다

### PATCH /products/:productId — 상품 수정
- 인증: 필수
- 요청: `{ category_id?, title?, description?, price? }` (이 4개 외의 필드는 400)
- 응답: 상품 상세
- 권한·조건: `seller_id = 나` + `status = 'ON_SALE'` + 삭제 안 됨 (D21)
- 가격 인하 처리: 새 가격이 대기 중(`PENDING`) 제안 금액 **이하**가 되면, 같은 트랜잭션에서 그 제안을 **`REJECTED`로 자동 처리**한다 (`responded_at = now()`). 해당 구매자에게 **`PRICE_OFFER_REJECTED` 알림을 보낸다** (기존 type 사용). 알림 행은 같은 트랜잭션에서 INSERT하고, 소켓 전송은 COMMIT 후
- 에러: 400, 404 (없거나 내 상품 아님), 409 `PRODUCT_NOT_EDITABLE` (내 상품이지만 판매중 아님)

### DELETE /products/:productId — 상품 삭제 (소프트 삭제)
- 인증: 필수
- 응답: `204`
- 권한·조건: `seller_id = 나` + `status IN ('ON_SALE','SOLD')`. 예약중이면 불가 (D10)
- 처리
  1. **DB 트랜잭션**: `deleted_at = now()` + **자동 정리**(11.3 "상품 삭제": 모든 방의 대기·수락 제안 → EXPIRED, 미래 약속 → CANCELED, 지난 약속 → EXPIRED) + 각 구매자에게 `PRICE_OFFER_EXPIRED` / `APPOINTMENT_CANCELED` 알림 + 그 상품의 **`product_images` 행 삭제** → COMMIT
  2. **COMMIT 후** 소켓 알림 전송
  3. 이어서 Storage에서 그 상품의 이미지 파일을 삭제한다 (삭제할 경로는 1단계에서 행을 지우기 전에 읽어 둔다)
- Storage 삭제 실패 처리
  - DB 트랜잭션과 Storage는 하나로 묶을 수 없다. 그래서 **DB를 먼저 확정하고, 파일 삭제는 COMMIT 후에** 한다. COMMIT 전에 파일을 지우면 DB가 롤백됐을 때 판매중 상품의 이미지가 사라지기 때문이다
  - 파일 삭제가 실패해도 **DB의 상품 삭제 결과를 되돌리지 않는다**. API는 `204`로 응답하고, 실패한 상품 id와 경로를 서버 로그에 남겨 추후 정리한다
  - 남은 파일은 경로가 `products/{product_id}/`로 시작하므로, 삭제된 상품(`deleted_at IS NOT NULL`)의 폴더를 나중에 다시 지우면 정리된다 (재시도·정리 방법은 구현 단계에서 정한다)
- 삭제 후 표시: 채팅·거래·후기 내역에서 삭제된 상품은 제목 등은 그대로 보여주고, 이미지는 없으므로 `thumbnail_url: null`(프론트엔드는 기본 이미지 표시)
- 에러: 404, 409 `PRODUCT_RESERVED`

---

## 5. 상품 이미지

관련 테이블: `product_images`, `products`(updated_at), Supabase Storage

공통 조건: `seller_id = 나` + `ON_SALE` + 삭제 안 됨 (이미지 변경도 상품 수정, D21). **변경할 때마다 같은 트랜잭션에서 `products.updated_at = now()`** (5.5)

이미지 규칙은 4장과 같다 (JPG/PNG/WebP, 장당 10MB, 최대 10장, 변환 없음). 구현은 상품 등록 기능 구현 단계에서 한다.

**더미(개발·시연용) 상품 이미지**: 더미 이미지도 `reown-product-images` 버킷에 업로드하고, `product_images.storage_path`에는 **Storage 경로**만 저장한다. 외부 이미지 URL을 `storage_path`에 직접 저장하지 않는다.

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
- 조건: 삭제된 상품 제외 (7장). 차단한 사용자의 상품 제외 (D15 "내 목록")

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

### 메시지 전송 — Socket.IO `chat:send`
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
- 권한: 이 방의 **구매자** (판매자·비참여자 → 404)
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
  - 장소는 프론트엔드가 **카카오 지도 JavaScript SDK**로 고른 값을 보낸다. 백엔드는 카카오 API를 호출하지 않고 값의 형식·범위만 검증한다
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
- 권한: 그 방 상품의 **판매자** (구매자·비참여자 → 404)
- `final_price`: **거래 생성 시점에 확정**한다. 값은 이 방에서 가장 최근 ACCEPTED 제안 금액, 없으면 그 시점의 상품 가격 (5.12). 이후 상품 가격이 바뀌거나 새 제안이 수락되어도 **이미 생성된 거래의 `final_price`는 바꾸지 않는다**
- `RESERVED`(예약): 상품 `ON_SALE` + 삭제 안 됨, 차단 없음 → 상품 `RESERVED`. 알림: 구매자 ← `TRADE_RESERVED`
- `COMPLETED`(바로 완료): 상품 `ON_SALE`일 때만. 예약중이면 예약된 거래의 완료 API를 써야 함 (D21) → 상품 `SOLD` + 자동 정리(11.3 "거래완료"). 알림: 구매자 ← `TRADE_COMPLETED`, 다른 구매자들 ← `PRICE_OFFER_EXPIRED` / `APPOINTMENT_CANCELED`
- 에러: 400, 404, 409 `PRODUCT_NOT_ON_SALE`, 409 `PRODUCT_RESERVED`, 409 `TRANSACTION_EXISTS`(`uq_transactions_active_product`), 409 `CHAT_UNAVAILABLE`

### POST /transactions/:transactionId/complete — 예약 → 거래완료
- 인증: 필수
- 응답: 거래 객체
- 권한: 판매자. 조건: `status = 'RESERVED'` (예약된 구매자로만 완료, D21)
- 처리: 거래 `COMPLETED` + 상품 `SOLD` + 자동 정리(11.3) + 알림 (위와 같음)
- 에러: 404, 409 `TRANSACTION_NOT_RESERVED`
- `final_price`는 예약할 때 확정한 값을 그대로 쓴다. 완료 시점에 다시 계산하지 않는다

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
- 효과: 차단한 상대와의 상품·채팅·제안·약속·거래 상호작용을 제한한다 (D15). 차단당한 사람에게는 차단 사실을 직접 드러내지 않는다 (막힌 동작은 일반 code `CHAT_UNAVAILABLE` 등으로 응답)
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
| 연결 | `handshake.auth.token` | — | JWT 검증 실패 시 연결 거부. 성공하면 서버가 `user:{userId}`에 입장시킴. 토큰이 만료되면(1시간) 이벤트 처리 때 `UNAUTHORIZED` 후 연결 종료 → 프론트엔드는 재로그인 후 다시 연결 |
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
| D20 상품 지역 자동 | `POST /products` (지역은 회원가입 필수, 방어적 검증 409) |
| D21 상태는 거래 API로만, 수정은 판매중만 | 4장, 5장, 11장 |
| D22 가격 제안 규칙 | 9장. 상품 가격 인하 시 대기 제안 자동 거절은 4장 |
| D23 채팅 가능 상태, 속도 제한 | 8장 (Socket 전송 rate limit) |
| D24 후기 7일, 수정·삭제 불가 | 12장 |
| D25 조회수 | 상품 상세 |
| D26 자기 상품 관심 불가 | 6·7장 409 `OWN_PRODUCT` |
| D27 알림 90일 | 정기 작업 (API 아님) |
| D28 닉네임 변경 제한 없음 | `PATCH /users/me` |

---

## 18. 변경 이력

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-10-05 | v1.0 | 최초 확정. API 60개 + Socket.IO 이벤트. 결정 사항 1~17번 반영 (`docs/API_DRAFT.md` 18장). DB 구조 변경 없음 |
| 2026-10-05 | v1.1 | 회원가입 시 지역 필수로 변경 (결정 18). `POST /auth/signup`의 `region_id` 필수·서버 검증, `PATCH /users/me` 설명, `POST /products` 지역 조건 정리. DB 구조 변경 없음 |
