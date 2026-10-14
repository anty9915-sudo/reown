import pool from '../config/database.js';
import type { DatabaseRow } from '../types/domain.js';

// regions service에서 호출하며 법정동 기준 데이터를 이름으로 검색한다.
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

export const findRegions = async (
  keyword: string,
  limit: number,
): Promise<DatabaseRow[]> => {
  const result = await pool.query(
    `SELECT id, code, sido, sigungu, eupmyeondong
     FROM public.regions
     WHERE concat_ws(' ', sido, sigungu, eupmyeondong) ILIKE $1 ESCAPE '\\'
     ORDER BY sido, sigungu NULLS FIRST, eupmyeondong, id
     LIMIT $2`,
    [`%${escapeLike(keyword)}%`, limit],
  );
  return result.rows;
};
