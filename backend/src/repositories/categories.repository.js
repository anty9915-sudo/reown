import pool from '../config/database.js';

// categories service가 사용할 기준 데이터 조회 쿼리다.
export const findCategories = async () => {
  const result = await pool.query(
    'SELECT id, name FROM public.categories ORDER BY sort_order, id',
  );
  return result.rows;
};

// 상품 수정 전에 요청받은 카테고리가 실제로 존재하는지 확인한다.
export const categoryExists = async (categoryId) => {
  const result = await pool.query(
    'SELECT EXISTS (SELECT 1 FROM public.categories WHERE id = $1) AS "exists"',
    [categoryId],
  );
  return result.rows[0].exists;
};
