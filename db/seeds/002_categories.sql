-- =====================================================================
-- REOWN seed  002_categories.sql
-- ---------------------------------------------------------------------
-- 대상   : public.categories (docs/DATABASE.md 5.3)
-- 전제   : db/migrations/001_initial_schema.sql 적용 완료
-- 상태   : 검토용. 팀 승인 전에는 Supabase에 실행하지 않는다.
--
-- 규칙
--   * id는 GENERATED ALWAYS AS IDENTITY이므로 지정하지 않는다.
--   * sort_order는 10 단위로 둔다. 나중에 사이에 카테고리를 추가하기 쉽다.
--   * 이름이 이미 있으면 건너뛴다 (ON CONFLICT (name) DO NOTHING).
--     → 여러 번 실행해도 중복되지 않고, 대시보드에서 바꾼 sort_order도 덮어쓰지 않는다.
--
-- 제외한 카테고리
--   * 식품·건강기능식품 : 개인 간 판매에 법적 제한이 있는 품목이 많다
--   * "삽니다"(구매 요청) : 요구사항에 없는 기능이다
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.categories') IS NULL THEN
    RAISE EXCEPTION 'public.categories 테이블이 없습니다. 001_initial_schema.sql을 먼저 적용하세요.';
  END IF;
END
$$;

INSERT INTO public.categories (name, sort_order) VALUES
  ('디지털기기',       10),
  ('생활가전',         20),
  ('가구/인테리어',    30),
  ('생활/주방',        40),
  ('유아동',           50),
  ('여성의류',         60),
  ('여성잡화',         70),
  ('남성패션/잡화',    80),
  ('뷰티/미용',        90),
  ('스포츠/레저',     100),
  ('취미/게임/음반',  110),
  ('도서',            120),
  ('티켓/교환권',     130),
  ('반려동물용품',    140),
  ('식물',            150),
  ('기타 중고물품',   160)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.categories;
  RAISE NOTICE 'categories 행 수: %', v_count;
END
$$;

COMMIT;
