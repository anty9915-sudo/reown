import pool from '../config/database.js';

// 로그인과 이메일 중복 확인에 사용할 회원을 조회한다.
export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT
       id,
       email,
       password_hash AS "passwordHash",
       nickname,
       region_id AS "regionId"
     FROM public.users
     WHERE email = $1`,
    [email],
  );

  return result.rows[0] ?? null;
};

// 회원가입 전에 같은 닉네임이 있는지 조회한다.
export const findUserByNickname = async (nickname) => {
  const result = await pool.query(
    'SELECT id FROM public.users WHERE nickname = $1',
    [nickname],
  );

  return result.rows[0] ?? null;
};

// 해시된 비밀번호와 회원 기본 정보를 users 테이블에 저장한다.
export const createUser = async ({ email, passwordHash, nickname }) => {
  const result = await pool.query(
    `INSERT INTO public.users (email, password_hash, nickname)
     VALUES ($1, $2, $3)
     RETURNING id, email, nickname, region_id AS "regionId"`,
    [email, passwordHash, nickname],
  );

  return result.rows[0];
};
