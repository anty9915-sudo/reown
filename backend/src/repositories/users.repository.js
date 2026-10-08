import pool from '../config/database.js';

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

export const findUserByNickname = async (nickname) => {
  const result = await pool.query(
    'SELECT id FROM public.users WHERE nickname = $1',
    [nickname],
  );

  return result.rows[0] ?? null;
};

export const createUser = async ({ email, passwordHash, nickname }) => {
  const result = await pool.query(
    `INSERT INTO public.users (email, password_hash, nickname)
     VALUES ($1, $2, $3)
     RETURNING id, email, nickname, region_id AS "regionId"`,
    [email, passwordHash, nickname],
  );

  return result.rows[0];
};
