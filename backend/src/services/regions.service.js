import { findRegions } from '../repositories/regions.repository.js';

// controller의 query를 정리해 repository로 전달하고 API 응답 형태로 변환한다.
export const getRegions = async ({ keyword, limit }) => {
  const rows = await findRegions(keyword.trim(), Number(limit ?? 20));
  return rows.map((row) => ({
    id: String(row.id),
    code: row.code,
    sido: row.sido,
    sigungu: row.sigungu,
    eupmyeondong: row.eupmyeondong,
  }));
};
