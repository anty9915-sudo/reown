-- =====================================================================
-- REOWN  001_initial_schema.sql
-- ---------------------------------------------------------------------
-- 기준 문서 : docs/DATABASE.md  (설계 확정 v1.0, D1~D28 + 17장 해석)
-- 대상      : Supabase PostgreSQL 15 이상 (UTF8)
-- 상태      : 검토용. 팀 승인 전에는 Supabase에 실행하지 않는다.
--
-- 범위
--   * 16개 테이블 생성 (public.users 포함)
--   * PK / FK / UNIQUE / CHECK / 부분 UNIQUE / 조회용 인덱스
--   * updated_at 트리거 (users, products, transactions)
--   * 매너온도 View (user_trust_stats)
--   * RLS 활성화 + anon / authenticated 권한 회수
--
-- 범위 밖
--   * auth 스키마 (Supabase Auth) — 이 프로젝트는 Express + bcrypt + JWT로 직접 인증하므로 사용·참조하지 않는다
--   * 초기 데이터 (regions 법정동, categories) → 별도 seed 파일
--   * 알림 90일 정리 작업 (D27) → 배포 단계
--
-- 생성 순서 (FK 의존관계)
--   확장 → 공통 함수 → regions → categories → users → products → product_images
--   → favorites / cart → chat_rooms → messages / price_offers / trade_appointments / transactions
--   → reviews (transactions 참조) → reports → blocks
--   → notifications (price_offers, transactions, trade_appointments 참조)
--   → 인덱스 → 트리거 → View → RLS / 권한 → 주석 → 사후 확인
--
-- 실행 방식
--   * 전체가 하나의 트랜잭션이다. 중간에 하나라도 실패하면 전부 롤백된다.
--   * 대상 테이블·함수가 하나라도 이미 존재하면 0단계에서 중단한다 (빈 DB에서만 실행).
-- =====================================================================

BEGIN;

-- =====================================================================
-- 0. 사전 조건 확인 (읽기 전용. 아무것도 변경하지 않음)
-- =====================================================================
DO $$
DECLARE
  v_existing text;
  v_trgm     text;
BEGIN
  -- PostgreSQL 15 이상: NULLS NOT DISTINCT, VIEW security_invoker
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION 'PostgreSQL 15 이상이 필요합니다. 현재 버전: %', current_setting('server_version');
  END IF;

  -- 닉네임 CHECK의 [가-힣] 범위는 UTF8 인코딩을 전제로 한다
  IF pg_encoding_to_char((SELECT encoding FROM pg_database WHERE datname = current_database())) <> 'UTF8' THEN
    RAISE EXCEPTION '데이터베이스 인코딩이 UTF8이 아닙니다. 닉네임 CHECK(D17)가 의도대로 동작하지 않습니다.';
  END IF;

  -- 이 파일이 만드는 객체가 하나라도 이미 있으면 중단 (기존 데이터 보호)
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_existing
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname IN (
       'users', 'regions', 'categories', 'products', 'product_images', 'favorites', 'cart',
       'chat_rooms', 'messages', 'price_offers', 'trade_appointments', 'transactions',
       'reviews', 'reports', 'blocks', 'notifications', 'user_trust_stats'
     );

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION '이미 존재하는 객체가 있어 중단합니다: %. 001은 빈 public 스키마에서만 실행합니다.', v_existing;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    RAISE EXCEPTION 'public.set_updated_at() 함수가 이미 있어 중단합니다. 기존 함수를 덮어쓰지 않습니다.';
  END IF;

  -- 상품명 검색 인덱스는 extensions.gin_trgm_ops를 사용한다
  SELECT extnamespace::regnamespace::text INTO v_trgm FROM pg_extension WHERE extname = 'pg_trgm';
  IF v_trgm IS NOT NULL AND v_trgm <> 'extensions' THEN
    RAISE EXCEPTION 'pg_trgm이 % 스키마에 설치되어 있습니다. 이 파일은 extensions 스키마를 전제로 합니다.', v_trgm;
  END IF;

  IF to_regnamespace('extensions') IS NULL THEN
    RAISE EXCEPTION 'extensions 스키마가 없습니다. (Supabase 기본 스키마)';
  END IF;
END
$$;

-- =====================================================================
-- 1. 확장
-- =====================================================================
-- 상품명 부분 검색용 (idx_products_title_trgm). Supabase 관례에 따라 extensions 스키마에 설치한다.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- =====================================================================
-- 2. 공통 함수
-- =====================================================================
-- UPDATE 시 updated_at 갱신 (DATABASE.md 4.1)
CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 3. 기준 데이터 테이블
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3.1 regions : 법정동(읍·면·동 단위) 기준 데이터 (D7)
-- ---------------------------------------------------------------------
CREATE TABLE public.regions (
  id            bigint       GENERATED ALWAYS AS IDENTITY,
  code          varchar(10)  NOT NULL,
  sido          varchar(20)  NOT NULL,
  sigungu       varchar(30),
  eupmyeondong  varchar(30)  NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_regions        PRIMARY KEY (id),
  CONSTRAINT uq_regions_code   UNIQUE (code),
  CONSTRAINT chk_regions_code  CHECK (code ~ '^[0-9]{8}00$')
);

-- ---------------------------------------------------------------------
-- 3.2 categories : 상품 카테고리 (한 단계)
-- ---------------------------------------------------------------------
CREATE TABLE public.categories (
  id          bigint       GENERATED ALWAYS AS IDENTITY,
  name        varchar(30)  NOT NULL,
  sort_order  smallint     NOT NULL DEFAULT 0,

  CONSTRAINT pk_categories             PRIMARY KEY (id),
  CONSTRAINT uq_categories_name        UNIQUE (name),
  CONSTRAINT chk_categories_name       CHECK (char_length(btrim(name)) >= 1),
  CONSTRAINT chk_categories_sort_order CHECK (sort_order >= 0)
);

-- =====================================================================
-- 4. 회원
-- =====================================================================

-- ---------------------------------------------------------------------
-- 4.1 users : 회원 계정 (DATABASE.md 5.1)
--     email은 백엔드에서 trim + 소문자로 정규화해 저장한다 → CHECK + UNIQUE로 대소문자 중복 방지
--     password_hash는 bcrypt 해시. 어떤 API 응답에도 포함하지 않는다
--     nickname은 한글(완성형)·영문·숫자 2~20자 (D17), 변경 제한 없음 (D28)
-- ---------------------------------------------------------------------
CREATE TABLE public.users (
  id             bigint        GENERATED ALWAYS AS IDENTITY,
  email          varchar(255)  NOT NULL,
  password_hash  varchar(100)  NOT NULL,
  nickname       varchar(20)   NOT NULL,
  region_id      bigint,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT pk_users              PRIMARY KEY (id),
  CONSTRAINT fk_users_region       FOREIGN KEY (region_id) REFERENCES public.regions (id) ON DELETE SET NULL,
  CONSTRAINT uq_users_email        UNIQUE (email),
  CONSTRAINT uq_users_nickname     UNIQUE (nickname),
  CONSTRAINT chk_users_email_lower CHECK (email = lower(email)),
  CONSTRAINT chk_users_nickname    CHECK (nickname ~ '^[가-힣a-zA-Z0-9]{2,20}$')
);

-- =====================================================================
-- 5. 상품
-- =====================================================================

-- ---------------------------------------------------------------------
-- 5.1 products : 판매 상품 (소프트 삭제: deleted_at)
-- ---------------------------------------------------------------------
CREATE TABLE public.products (
  id           bigint        GENERATED ALWAYS AS IDENTITY,
  seller_id    bigint        NOT NULL,
  category_id  bigint        NOT NULL,
  region_id    bigint        NOT NULL,
  title        varchar(100)  NOT NULL,
  description  text          NOT NULL,
  price        integer       NOT NULL,
  status       varchar(10)   NOT NULL DEFAULT 'ON_SALE',
  view_count   integer       NOT NULL DEFAULT 0,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),
  deleted_at   timestamptz,

  CONSTRAINT pk_products              PRIMARY KEY (id),
  CONSTRAINT fk_products_seller       FOREIGN KEY (seller_id)   REFERENCES public.users (id)      ON DELETE RESTRICT,
  CONSTRAINT fk_products_category     FOREIGN KEY (category_id) REFERENCES public.categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_region       FOREIGN KEY (region_id)   REFERENCES public.regions (id)    ON DELETE RESTRICT,
  CONSTRAINT chk_products_title       CHECK (char_length(btrim(title)) >= 1),
  CONSTRAINT chk_products_description CHECK (char_length(description) BETWEEN 1 AND 2000),
  CONSTRAINT chk_products_price       CHECK (price BETWEEN 1 AND 1000000000),          -- D17: 1원 이상
  CONSTRAINT chk_products_status      CHECK (status IN ('ON_SALE', 'RESERVED', 'SOLD')),
  CONSTRAINT chk_products_view_count  CHECK (view_count >= 0)
);

-- ---------------------------------------------------------------------
-- 5.2 product_images : 이미지는 Supabase Storage, DB에는 경로만 저장
--     최대 10장은 sort_order 0~9 + UNIQUE로 보장. 최소 1장은 백엔드 검증 (D17)
-- ---------------------------------------------------------------------
CREATE TABLE public.product_images (
  id            bigint       GENERATED ALWAYS AS IDENTITY,
  product_id    bigint       NOT NULL,
  storage_path  text         NOT NULL,
  sort_order    smallint     NOT NULL DEFAULT 0,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_product_images                PRIMARY KEY (id),
  CONSTRAINT fk_product_images_product        FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE,
  CONSTRAINT uq_product_images_storage_path   UNIQUE (storage_path),
  -- 한 트랜잭션 안에서 순서를 바꿀 수 있도록 COMMIT 시점에 검사한다
  CONSTRAINT uq_product_images_product_sort   UNIQUE (product_id, sort_order) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT chk_product_images_storage_path  CHECK (char_length(storage_path) BETWEEN 1 AND 500),
  CONSTRAINT chk_product_images_sort_order    CHECK (sort_order BETWEEN 0 AND 9)
);

-- =====================================================================
-- 6. 관심 (D5, D26)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6.1 favorites : 좋아요 (공개 반응)
-- ---------------------------------------------------------------------
CREATE TABLE public.favorites (
  user_id     bigint       NOT NULL,
  product_id  bigint       NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_favorites          PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_favorites_user     FOREIGN KEY (user_id)    REFERENCES public.users (id)    ON DELETE CASCADE,
  CONSTRAINT fk_favorites_product  FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 6.2 cart : 장바구니 (비공개 관심 목록, D18 테이블명 유지)
-- ---------------------------------------------------------------------
CREATE TABLE public.cart (
  user_id     bigint       NOT NULL,
  product_id  bigint       NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_cart          PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_cart_user     FOREIGN KEY (user_id)    REFERENCES public.users (id)    ON DELETE CASCADE,
  CONSTRAINT fk_cart_product  FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE
);

-- =====================================================================
-- 7. 채팅 / 거래
-- =====================================================================

-- ---------------------------------------------------------------------
-- 7.1 chat_rooms : 상품 × 구매자 1:1 채팅방
-- ---------------------------------------------------------------------
CREATE TABLE public.chat_rooms (
  id          bigint       GENERATED ALWAYS AS IDENTITY,
  product_id  bigint       NOT NULL,
  buyer_id    bigint       NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_chat_rooms                PRIMARY KEY (id),
  CONSTRAINT fk_chat_rooms_product        FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE RESTRICT,
  CONSTRAINT fk_chat_rooms_buyer          FOREIGN KEY (buyer_id)   REFERENCES public.users (id)    ON DELETE RESTRICT,
  -- 채팅방 중복 생성 방지 + transactions 복합 FK의 참조 대상
  CONSTRAINT uq_chat_rooms_product_buyer  UNIQUE (product_id, buyer_id)
);

-- ---------------------------------------------------------------------
-- 7.2 messages : 채팅 메시지 (D12: 읽음 처리는 read_at)
-- ---------------------------------------------------------------------
CREATE TABLE public.messages (
  id            bigint       GENERATED ALWAYS AS IDENTITY,
  chat_room_id  bigint       NOT NULL,
  sender_id     bigint       NOT NULL,
  content       text         NOT NULL,
  read_at       timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_messages            PRIMARY KEY (id),
  CONSTRAINT fk_messages_chat_room  FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms (id) ON DELETE RESTRICT,
  CONSTRAINT fk_messages_sender     FOREIGN KEY (sender_id)    REFERENCES public.users (id)      ON DELETE RESTRICT,
  CONSTRAINT chk_messages_content   CHECK (char_length(btrim(content)) >= 1 AND char_length(content) <= 1000)
);

-- ---------------------------------------------------------------------
-- 7.3 price_offers : 가격 제안 (D22)
--     responded_at = PENDING에서 처음 벗어난 시각. ACCEPTED → EXPIRED일 때도 유지 (17장 #4)
-- ---------------------------------------------------------------------
CREATE TABLE public.price_offers (
  id             bigint       GENERATED ALWAYS AS IDENTITY,
  chat_room_id   bigint       NOT NULL,
  offered_price  integer      NOT NULL,
  status         varchar(10)  NOT NULL DEFAULT 'PENDING',
  responded_at   timestamptz,
  created_at     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_price_offers                PRIMARY KEY (id),
  CONSTRAINT fk_price_offers_chat_room      FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms (id) ON DELETE RESTRICT,
  CONSTRAINT chk_price_offers_offered_price CHECK (offered_price BETWEEN 1 AND 1000000000),
  CONSTRAINT chk_price_offers_status        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED', 'EXPIRED')),
  CONSTRAINT chk_price_offers_responded_at  CHECK ((status = 'PENDING') = (responded_at IS NULL))
);

-- ---------------------------------------------------------------------
-- 7.4 trade_appointments : 거래 약속 (D14, 17장 #1·#9)
--     변경 = 기존 행 CANCELED + 새 행 INSERT (이력 보존)
--     EXPIRED = 지난 SCHEDULED 약속을 시스템이 종료
--     closed_by = 취소·변경한 사용자. 시스템 정리면 NULL
-- ---------------------------------------------------------------------
CREATE TABLE public.trade_appointments (
  id             bigint        GENERATED ALWAYS AS IDENTITY,
  chat_room_id   bigint        NOT NULL,
  proposer_id    bigint        NOT NULL,
  scheduled_at   timestamptz   NOT NULL,
  place_name     varchar(100)  NOT NULL,
  place_address  varchar(255),
  latitude       numeric(9,6),
  longitude      numeric(9,6),
  status         varchar(10)   NOT NULL DEFAULT 'SCHEDULED',
  closed_at      timestamptz,
  closed_by      bigint,
  created_at     timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT pk_trade_appointments              PRIMARY KEY (id),
  CONSTRAINT fk_trade_appointments_chat_room    FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms (id) ON DELETE RESTRICT,
  CONSTRAINT fk_trade_appointments_proposer     FOREIGN KEY (proposer_id)  REFERENCES public.users (id)      ON DELETE RESTRICT,
  CONSTRAINT fk_trade_appointments_closed_by    FOREIGN KEY (closed_by)    REFERENCES public.users (id)      ON DELETE RESTRICT,
  CONSTRAINT chk_trade_appointments_place_name  CHECK (char_length(btrim(place_name)) >= 1),
  CONSTRAINT chk_trade_appointments_latitude    CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_trade_appointments_longitude   CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_trade_appointments_coordinates CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT chk_trade_appointments_status      CHECK (status IN ('SCHEDULED', 'CANCELED', 'EXPIRED')),
  CONSTRAINT chk_trade_appointments_closed_at   CHECK ((status = 'SCHEDULED') = (closed_at IS NULL)),
  CONSTRAINT chk_trade_appointments_closed_by   CHECK (status = 'CANCELED' OR closed_by IS NULL)
);

-- ---------------------------------------------------------------------
-- 7.5 transactions : 예약 / 거래완료 / 예약 취소 이력
--     복합 FK (product_id, buyer_id) → chat_rooms : 채팅한 사람만 구매자 (D8)
-- ---------------------------------------------------------------------
CREATE TABLE public.transactions (
  id            bigint       GENERATED ALWAYS AS IDENTITY,
  product_id    bigint       NOT NULL,
  buyer_id      bigint       NOT NULL,
  final_price   integer      NOT NULL,
  status        varchar(10)  NOT NULL DEFAULT 'RESERVED',
  created_at    timestamptz  NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  canceled_at   timestamptz,
  updated_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_transactions              PRIMARY KEY (id),
  CONSTRAINT fk_transactions_chat_room    FOREIGN KEY (product_id, buyer_id)
                                          REFERENCES public.chat_rooms (product_id, buyer_id) ON DELETE RESTRICT,
  CONSTRAINT chk_transactions_final_price CHECK (final_price BETWEEN 1 AND 1000000000),
  CONSTRAINT chk_transactions_status      CHECK (status IN ('RESERVED', 'COMPLETED', 'CANCELED')),
  CONSTRAINT chk_transactions_completed   CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL)),
  CONSTRAINT chk_transactions_canceled    CHECK ((status = 'CANCELED')  = (canceled_at  IS NOT NULL))
);

-- =====================================================================
-- 8. 신뢰
-- =====================================================================

-- ---------------------------------------------------------------------
-- 8.1 reviews : 거래 후기 (D24: 7일 이내·작성자 자격은 백엔드 검증)
-- ---------------------------------------------------------------------
CREATE TABLE public.reviews (
  id              bigint        GENERATED ALWAYS AS IDENTITY,
  transaction_id  bigint        NOT NULL,
  reviewer_id     bigint        NOT NULL,
  reviewee_id     bigint        NOT NULL,
  rating          smallint      NOT NULL,
  content         varchar(500),
  created_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT pk_reviews                      PRIMARY KEY (id),
  CONSTRAINT fk_reviews_transaction          FOREIGN KEY (transaction_id) REFERENCES public.transactions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_reviewer             FOREIGN KEY (reviewer_id)    REFERENCES public.users (id)        ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_reviewee             FOREIGN KEY (reviewee_id)    REFERENCES public.users (id)        ON DELETE RESTRICT,
  CONSTRAINT uq_reviews_transaction_reviewer UNIQUE (transaction_id, reviewer_id),
  CONSTRAINT chk_reviews_rating              CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_not_self            CHECK (reviewer_id <> reviewee_id)
);

-- ---------------------------------------------------------------------
-- 8.2 reports : 신고 (D4 대시보드 처리, D16 chat_room_id 선택 FK, 자동 제재 없음)
-- ---------------------------------------------------------------------
CREATE TABLE public.reports (
  id                bigint         GENERATED ALWAYS AS IDENTITY,
  reporter_id       bigint         NOT NULL,
  reported_user_id  bigint         NOT NULL,
  product_id        bigint,
  chat_room_id      bigint,
  reason            varchar(20)    NOT NULL,
  content           varchar(1000),
  status            varchar(10)    NOT NULL DEFAULT 'PENDING',
  created_at        timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT pk_reports                PRIMARY KEY (id),
  CONSTRAINT fk_reports_reporter       FOREIGN KEY (reporter_id)      REFERENCES public.users (id)      ON DELETE RESTRICT,
  CONSTRAINT fk_reports_reported_user  FOREIGN KEY (reported_user_id) REFERENCES public.users (id)      ON DELETE RESTRICT,
  CONSTRAINT fk_reports_product        FOREIGN KEY (product_id)       REFERENCES public.products (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_reports_chat_room      FOREIGN KEY (chat_room_id)     REFERENCES public.chat_rooms (id) ON DELETE RESTRICT,
  CONSTRAINT chk_reports_not_self      CHECK (reporter_id <> reported_user_id),
  CONSTRAINT chk_reports_reason        CHECK (reason IN ('FRAUD', 'ABUSE', 'PROHIBITED_ITEM', 'SPAM', 'ETC')),
  CONSTRAINT chk_reports_status        CHECK (status IN ('PENDING', 'RESOLVED', 'REJECTED'))
);

-- ---------------------------------------------------------------------
-- 8.3 blocks : 차단 (D15)
-- ---------------------------------------------------------------------
CREATE TABLE public.blocks (
  blocker_id  bigint       NOT NULL,
  blocked_id  bigint       NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_blocks           PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT fk_blocks_blocker   FOREIGN KEY (blocker_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_blocks_blocked   FOREIGN KEY (blocked_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT chk_blocks_not_self CHECK (blocker_id <> blocked_id)
);

-- =====================================================================
-- 9. 알림 (D12: 채팅 제외, D13: 거래 알림은 구매자만, D27: 90일 보관)
-- =====================================================================
CREATE TABLE public.notifications (
  id                    bigint       GENERATED ALWAYS AS IDENTITY,
  user_id               bigint       NOT NULL,
  type                  varchar(30)  NOT NULL,
  price_offer_id        bigint,
  transaction_id        bigint,
  trade_appointment_id  bigint,
  read_at               timestamptz,
  created_at            timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pk_notifications                   PRIMARY KEY (id),
  CONSTRAINT fk_notifications_user              FOREIGN KEY (user_id)              REFERENCES public.users (id)              ON DELETE CASCADE,
  CONSTRAINT fk_notifications_price_offer       FOREIGN KEY (price_offer_id)       REFERENCES public.price_offers (id)       ON DELETE CASCADE,
  CONSTRAINT fk_notifications_transaction       FOREIGN KEY (transaction_id)       REFERENCES public.transactions (id)       ON DELETE CASCADE,
  CONSTRAINT fk_notifications_trade_appointment FOREIGN KEY (trade_appointment_id) REFERENCES public.trade_appointments (id) ON DELETE CASCADE,
  CONSTRAINT chk_notifications_type CHECK (type IN (
    'PRICE_OFFER_RECEIVED', 'PRICE_OFFER_ACCEPTED', 'PRICE_OFFER_REJECTED', 'PRICE_OFFER_EXPIRED',
    'TRADE_RESERVED', 'TRADE_COMPLETED', 'TRADE_CANCELED',
    'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_CANCELED'
  )),
  CONSTRAINT chk_notifications_single_target CHECK (
    num_nonnulls(price_offer_id, transaction_id, trade_appointment_id) = 1
  ),
  -- '_'는 LIKE 와일드카드이므로 이스케이프한다
  CONSTRAINT chk_notifications_target_matches_type CHECK (
       (type LIKE 'PRICE\_OFFER\_%' AND price_offer_id       IS NOT NULL)
    OR (type LIKE 'TRADE\_%'        AND transaction_id       IS NOT NULL)
    OR (type LIKE 'APPOINTMENT\_%'  AND trade_appointment_id IS NOT NULL)
  )
);

-- =====================================================================
-- 10. 인덱스
-- =====================================================================

-- ---------------------------------------------------------------------
-- 10.1 무결성용 부분 UNIQUE 인덱스 (DATABASE.md 8.1)
-- ---------------------------------------------------------------------
-- 같은 상품의 중복 예약·중복 판매 방지. CANCELED는 제외되어 재거래 가능
CREATE UNIQUE INDEX uq_transactions_active_product
  ON public.transactions (product_id)
  WHERE status IN ('RESERVED', 'COMPLETED');

-- 한 채팅방의 대기 중 제안은 1개
CREATE UNIQUE INDEX uq_price_offers_pending
  ON public.price_offers (chat_room_id)
  WHERE status = 'PENDING';

-- 한 채팅방의 유효한 약속은 1개
CREATE UNIQUE INDEX uq_trade_appointments_scheduled
  ON public.trade_appointments (chat_room_id)
  WHERE status = 'SCHEDULED';

-- 처리 전인 같은 맥락의 신고 반복 접수 방지 (product_id, chat_room_id의 NULL도 같은 값으로 취급)
CREATE UNIQUE INDEX uq_reports_pending
  ON public.reports (reporter_id, reported_user_id, product_id, chat_room_id)
  NULLS NOT DISTINCT
  WHERE status = 'PENDING';

-- ---------------------------------------------------------------------
-- 10.2 조회용 인덱스 (DATABASE.md 8.2)
--      products의 부분 인덱스는 쿼리에 "deleted_at IS NULL" 조건이 있어야 사용된다
-- ---------------------------------------------------------------------
CREATE INDEX idx_products_latest      ON public.products (created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_price       ON public.products (price, id)                WHERE deleted_at IS NULL;
CREATE INDEX idx_products_views       ON public.products (view_count DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category    ON public.products (category_id)              WHERE deleted_at IS NULL;
CREATE INDEX idx_products_region      ON public.products (region_id)                WHERE deleted_at IS NULL;
CREATE INDEX idx_products_seller      ON public.products (seller_id, created_at DESC);
CREATE INDEX idx_products_title_trgm  ON public.products USING gin (title extensions.gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX idx_regions_sido_sigungu ON public.regions (sido, sigungu);

CREATE INDEX idx_favorites_product      ON public.favorites (product_id);
CREATE INDEX idx_favorites_user_created ON public.favorites (user_id, created_at DESC);
CREATE INDEX idx_cart_user_created      ON public.cart (user_id, created_at DESC);

CREATE INDEX idx_chat_rooms_buyer ON public.chat_rooms (buyer_id);

CREATE INDEX idx_messages_room    ON public.messages (chat_room_id, id DESC);
CREATE INDEX idx_messages_unread  ON public.messages (chat_room_id, sender_id) WHERE read_at IS NULL;

CREATE INDEX idx_price_offers_room        ON public.price_offers (chat_room_id, created_at DESC);
CREATE INDEX idx_trade_appointments_room  ON public.trade_appointments (chat_room_id, created_at DESC);

CREATE INDEX idx_transactions_buyer ON public.transactions (buyer_id, created_at DESC);

CREATE INDEX idx_reviews_reviewee ON public.reviews (reviewee_id, created_at DESC);

CREATE INDEX idx_reports_reported_user ON public.reports (reported_user_id);
CREATE INDEX idx_reports_status        ON public.reports (status, created_at);

CREATE INDEX idx_blocks_blocked ON public.blocks (blocked_id);

CREATE INDEX idx_notifications_user   ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL;

-- =====================================================================
-- 11. 트리거 : updated_at 자동 갱신 (DATABASE.md 4.1 대상: users, products, transactions)
-- =====================================================================
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- products는 실제 상품 정보가 바뀔 때만 갱신한다. view_count 증가(D25)는 수정으로 보지 않는다.
-- 이미지(product_images)는 별도 테이블이므로, 이미지를 바꾸는 상품 수정 API가
-- 같은 트랜잭션에서 "UPDATE products SET updated_at = now()"를 직접 실행한다.
-- products에 컬럼을 추가하면 아래 WHEN 목록에 포함할지 함께 검토한다.
CREATE TRIGGER trg_products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  WHEN (
    (OLD.seller_id, OLD.category_id, OLD.region_id, OLD.title, OLD.description, OLD.price, OLD.status, OLD.deleted_at)
    IS DISTINCT FROM
    (NEW.seller_id, NEW.category_id, NEW.region_id, NEW.title, NEW.description, NEW.price, NEW.status, NEW.deleted_at)
  )
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 12. 매너온도 View (D3, DATABASE.md 13장)
--     manner_temperature = clamp(36.5 + Σ(rating - 3) × 0.2, 0.0, 99.9), 후기가 없으면 36.5
--     security_invoker: 조회하는 사용자의 권한과 RLS가 적용된다 (anon 우회 방지)
-- =====================================================================
CREATE VIEW public.user_trust_stats
WITH (security_invoker = true) AS
SELECT
  u.id                    AS user_id,
  count(r.id)::integer    AS review_count,
  round(avg(r.rating), 2) AS avg_rating,
  least(99.9, greatest(0.0, 36.5 + coalesce(sum(r.rating - 3), 0) * 0.2))::numeric(4,1) AS manner_temperature
FROM public.users u
LEFT JOIN public.reviews r ON r.reviewee_id = u.id
GROUP BY u.id;

-- =====================================================================
-- 13. 보안: RLS 활성화 + anon / authenticated 권한 회수 (DATABASE.md 4.2)
--     정책(POLICY)은 만들지 않는다 → anon / authenticated는 모든 행 접근 불가
--     백엔드 연결 계정(테이블 소유자)은 RLS 영향을 받지 않는다. FORCE RLS는 쓰지 않는다.
-- =====================================================================
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;

-- 트리거 전용 함수는 직접 호출할 필요가 없다
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- Supabase가 기본으로 부여하는 anon / authenticated 권한을 회수한다 (RLS와 이중 방어)
-- anon / authenticated 역할이 없는 환경(로컬 PostgreSQL)에서는 건너뛴다
DO $$
DECLARE
  v_role   text;
  v_table  text;
  v_seq    text;
  v_tables text[] := ARRAY[
    'users', 'regions', 'categories', 'products', 'product_images', 'favorites', 'cart',
    'chat_rooms', 'messages', 'price_offers', 'trade_appointments', 'transactions',
    'reviews', 'reports', 'blocks', 'notifications'
  ];
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      FOREACH v_table IN ARRAY v_tables LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', v_table, v_role);
        -- favorites / cart / blocks는 복합 PK라 id 컬럼과 시퀀스가 없다
        IF EXISTS (
          SELECT 1 FROM pg_attribute
           WHERE attrelid = format('public.%I', v_table)::regclass
             AND attname = 'id' AND NOT attisdropped
        ) THEN
          v_seq := pg_get_serial_sequence(format('public.%I', v_table), 'id');
          IF v_seq IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM %I', v_seq, v_role);
          END IF;
        END IF;
      END LOOP;
      EXECUTE format('REVOKE ALL ON TABLE public.user_trust_stats FROM %I', v_role);
      EXECUTE format('REVOKE ALL ON FUNCTION public.set_updated_at() FROM %I', v_role);
    END IF;
  END LOOP;
END
$$;

-- =====================================================================
-- 14. 문서용 주석 (Supabase 대시보드에 표시됨)
-- =====================================================================
COMMENT ON TABLE public.users              IS '회원 계정. email 소문자·UNIQUE, nickname D17, password_hash는 bcrypt';
COMMENT ON TABLE public.regions            IS '법정동(읍·면·동) 기준 데이터. D7';
COMMENT ON TABLE public.categories         IS '상품 카테고리 기준 데이터';
COMMENT ON TABLE public.products           IS '판매 상품. deleted_at 소프트 삭제. status는 거래 API로만 변경(D21)';
COMMENT ON TABLE public.product_images     IS '상품 이미지 Storage 경로. 상품당 1~10장(D17)';
COMMENT ON TABLE public.favorites          IS '좋아요(공개 반응). D5, D26';
COMMENT ON TABLE public.cart               IS '장바구니(비공개 관심 목록). D5, D18, D26';
COMMENT ON TABLE public.chat_rooms         IS '상품 × 구매자 1:1 채팅방. D23';
COMMENT ON TABLE public.messages           IS '채팅 메시지. 읽음은 read_at(D12)';
COMMENT ON TABLE public.price_offers       IS '가격 제안. D22';
COMMENT ON TABLE public.trade_appointments IS '거래 약속. 변경은 기존 CANCELED + 새 행(D14)';
COMMENT ON TABLE public.transactions       IS '예약·거래완료·예약 취소 이력. D8, D9, D21';
COMMENT ON TABLE public.reviews            IS '거래 후기. 완료 후 7일 이내, 수정·삭제 불가(D24)';
COMMENT ON TABLE public.reports            IS '신고. Supabase 대시보드에서 status 처리(D4, D16)';
COMMENT ON TABLE public.blocks             IS '차단. D15';
COMMENT ON TABLE public.notifications      IS '알림(채팅 제외). 90일 보관(D12, D13, D27)';
COMMENT ON VIEW  public.user_trust_stats   IS '후기 수·평균 평점·매너온도 계산 View. D3';

-- =====================================================================
-- 15. 사후 확인: 16개 테이블 모두 존재하고 RLS가 켜졌는지 검사
-- =====================================================================
DO $$
DECLARE
  v_expected text[] := ARRAY[
    'users', 'regions', 'categories', 'products', 'product_images', 'favorites', 'cart',
    'chat_rooms', 'messages', 'price_offers', 'trade_appointments', 'transactions',
    'reviews', 'reports', 'blocks', 'notifications'
  ];
  v_count   int;
  v_missing text;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY (v_expected);

  IF v_count <> array_length(v_expected, 1) THEN
    RAISE EXCEPTION '생성된 테이블 수가 다릅니다: % / %', v_count, array_length(v_expected, 1);
  END IF;

  SELECT string_agg(c.relname, ', ') INTO v_missing
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY (v_expected)
     AND NOT c.relrowsecurity;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS가 켜지지 않은 테이블: %', v_missing;
  END IF;
END
$$;

COMMIT;
