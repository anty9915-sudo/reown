import pool from '../config/database.js';
import env from '../config/env.js';
import type { DatabaseRow } from '../types/domain.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';

interface CreateUserInput {
  email: string;
  passwordHash: string;
  nickname: string;
  regionId: string | null;
  regionName: string | null;
}

interface PostgresUndefinedColumnError {
  code?: string;
}

const isUndefinedColumnError = (
  error: unknown,
): error is PostgresUndefinedColumnError =>
  typeof error === 'object' &&
  error !== null &&
  (error as PostgresUndefinedColumnError).code === '42703';

const devDataPath = fileURLToPath(
  new URL('../../../.reown-dev/users.json', import.meta.url),
);

type DevUser = {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  regionId: string | null;
  regionName: string | null;
};

const readDevUsers = (): DevUser[] => {
  if (!existsSync(devDataPath)) {
    return [];
  }

  return JSON.parse(readFileSync(devDataPath, 'utf8')) as DevUser[];
};

const writeDevUsers = (users: DevUser[]): void => {
  mkdirSync(dirname(devDataPath), { recursive: true });
  writeFileSync(devDataPath, JSON.stringify(users, null, 2), 'utf8');
};

const toDevDatabaseRow = (user: DevUser): DatabaseRow => ({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  nickname: user.nickname,
  regionId: user.regionId,
  regionName: user.regionName,
});

const postgresConflictError = (constraint: string) => ({
  code: '23505',
  constraint,
});

// 로그인과 이메일 중복 확인에 사용할 회원을 조회한다.
export const findUserByEmail = async (email: string): Promise<DatabaseRow | null> => {
  if (!env.databaseUrl) {
    if (email === 'admin@reown.local') {
      return toDevDatabaseRow({
        id: '0',
        email: 'admin@reown.local',
        passwordHash: bcrypt.hashSync('admin1234', 10),
        nickname: 'admin',
        regionId: null,
        regionName: '관리자',
      });
    }

    const user = readDevUsers().find((item) => item.email === email);
    return user ? toDevDatabaseRow(user) : null;
  }

  let result;

  try {
    result = await pool.query(
      `SELECT
         id,
         email,
         password_hash AS "passwordHash",
         nickname,
         region_id AS "regionId",
         region_name AS "regionName"
       FROM public.users
       WHERE email = $1`,
      [email],
    );
  } catch (error) {
    if (!isUndefinedColumnError(error)) {
      throw error;
    }

    result = await pool.query(
      `SELECT
         id,
         email,
         password_hash AS "passwordHash",
         nickname,
         region_id AS "regionId",
         NULL::varchar AS "regionName"
       FROM public.users
       WHERE email = $1`,
      [email],
    );
  }

  return result.rows[0] ?? null;
};

// 회원가입 전에 같은 닉네임이 있는지 조회한다.
export const findUserByNickname = async (nickname: string): Promise<DatabaseRow | null> => {
  if (!env.databaseUrl) {
    const user = readDevUsers().find((item) => item.nickname === nickname);
    return user ? toDevDatabaseRow(user) : null;
  }

  const result = await pool.query(
    'SELECT id FROM public.users WHERE nickname = $1',
    [nickname],
  );

  return result.rows[0] ?? null;
};

// 해시된 비밀번호와 회원 기본 정보를 users 테이블에 저장한다.
export const createUser = async ({
  email,
  passwordHash,
  nickname,
  regionId,
  regionName,
}: CreateUserInput): Promise<DatabaseRow> => {
  if (!env.databaseUrl) {
    const users = readDevUsers();

    if (users.some((item) => item.email === email)) {
      throw postgresConflictError('uq_users_email');
    }

    if (users.some((item) => item.nickname === nickname)) {
      throw postgresConflictError('uq_users_nickname');
    }

    const user: DevUser = {
      id: String(
        users.reduce(
          (largest, item) => Math.max(largest, Number(item.id) || 0),
          0,
        ) + 1,
      ),
      email,
      passwordHash,
      nickname,
      regionId,
      regionName,
    };
    writeDevUsers([...users, user]);
    return toDevDatabaseRow(user);
  }

  let result;

  try {
    result = await pool.query(
      `INSERT INTO public.users (email, password_hash, nickname, region_id, region_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, nickname, region_id AS "regionId", region_name AS "regionName"`,
      [email, passwordHash, nickname, regionId, regionName],
    );
  } catch (error) {
    if (!isUndefinedColumnError(error)) {
      throw error;
    }

    result = await pool.query(
      `INSERT INTO public.users (email, password_hash, nickname, region_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nickname, region_id AS "regionId"`,
      [email, passwordHash, nickname, regionId],
    );
  }

  return {
    ...result.rows[0],
    regionName: result.rows[0].regionName ?? regionName,
  };
};
