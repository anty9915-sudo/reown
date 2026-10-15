import pool from '../config/database.js';
import type { DatabaseRow } from '../types/domain.js';

interface CreateUserInput {
  email: string;
  passwordHash: string;
  nickname: string;
  regionId: string;
}

// 로그인과 이메일 중복 확인에 사용할 회원을 조회한다.
// 지역이 없는 회원도 조회되도록 regions는 LEFT JOIN한다 (결정 24).
export const findUserByEmail = async (email: string): Promise<DatabaseRow | null> => {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.password_hash AS "passwordHash",
       u.nickname,
       u.region_id AS "regionId",
       r.sido AS "regionSido",
       r.sigungu AS "regionSigungu",
       r.eupmyeondong AS "regionEupmyeondong"
     FROM public.users u
     LEFT JOIN public.regions r ON r.id = u.region_id
     WHERE u.email = $1`,
    [email],
  );

  return result.rows[0] ?? null;
};

// 회원가입 전에 같은 닉네임이 있는지 조회한다.
export const findUserByNickname = async (nickname: string): Promise<DatabaseRow | null> => {
  const result = await pool.query(
    'SELECT id FROM public.users WHERE nickname = $1',
    [nickname],
  );

  return result.rows[0] ?? null;
};

// 해시된 비밀번호, 회원 기본 정보, 가입 지역을 users 테이블에 저장한다.
export const createUser = async ({
  email,
  passwordHash,
  nickname,
  regionId,
}: CreateUserInput): Promise<DatabaseRow> => {
  const result = await pool.query(
    `INSERT INTO public.users (email, password_hash, nickname, region_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, nickname, region_id AS "regionId"`,
    [email, passwordHash, nickname, regionId],
  );

  return result.rows[0];
};
