import { findCategories } from '../repositories/categories.repository.js';

// repository의 DB 행을 API에서 사용하는 문자열 ID 형태로 변환한다.
export const getCategories = async () => {
  const rows = await findCategories();
  return rows.map((row) => ({ id: String(row.id), name: row.name }));
};
