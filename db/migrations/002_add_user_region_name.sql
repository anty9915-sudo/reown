BEGIN;

ALTER TABLE public.users
  ADD COLUMN region_name varchar(100);

COMMENT ON COLUMN public.users.region_name IS
  '사용자가 직접 입력한 동네명';

COMMIT;
