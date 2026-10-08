import pool from '../config/database.js';

// 좋아요를 누를 수 있는 상품인지 service가 확인할 때 필요한 상태를 조회한다.
export const findProductForFavorite = async (productId) => {
  const result = await pool.query(
    `SELECT id, seller_id AS "sellerId", deleted_at AS "deletedAt"
     FROM public.products
     WHERE id = $1`,
    [productId],
  );

  return result.rows[0] ?? null;
};

// 현재 사용자가 해당 상품을 이미 좋아요했는지 조회한다.
export const findFavorite = async (userId, productId) => {
  const result = await pool.query(
    `SELECT user_id
     FROM public.favorites
     WHERE user_id = $1 AND product_id = $2`,
    [userId, productId],
  );

  return result.rows[0] ?? null;
};

// 복합 PK를 이용해 같은 좋아요가 중복으로 저장되지 않게 추가한다.
export const addFavorite = async (userId, productId) => {
  await pool.query(
    `INSERT INTO public.favorites (user_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [userId, productId],
  );
};

// 로그인 사용자의 상품 좋아요를 삭제한다.
export const removeFavorite = async (userId, productId) => {
  await pool.query(
    `DELETE FROM public.favorites
     WHERE user_id = $1 AND product_id = $2`,
    [userId, productId],
  );
};

// 상품 상세와 토글 응답에 표시할 현재 좋아요 수를 계산한다.
export const countProductFavorites = async (productId) => {
  const result = await pool.query(
    `SELECT count(*)::integer AS count
     FROM public.favorites
     WHERE product_id = $1`,
    [productId],
  );

  return result.rows[0].count;
};

// 삭제 상품과 차단한 판매자의 상품을 제외하고 내 좋아요 목록을 조회한다.
export const findFavoriteProducts = async ({ userId, cursor, limit }) => {
  const values = [userId];
  const where = [
    'f.user_id = $1',
    'p.deleted_at IS NULL',
    `NOT EXISTS (
       SELECT 1 FROM public.blocks b
       WHERE b.blocker_id = $1 AND b.blocked_id = p.seller_id
     )`,
  ];

  if (cursor) {
    values.push(cursor.favoritedAt, cursor.productId);
    where.push(
      `(f.created_at, f.product_id) < ($2::timestamptz, $3::bigint)`,
    );
  }

  values.push(limit + 1);
  const limitParam = `$${values.length}`;
  const result = await pool.query(
    `SELECT
       p.id, p.title, p.price, p.status,
       f.created_at AS "favoritedAt",
       c.id AS "categoryId", c.name AS "categoryName",
       r.id AS "regionId", r.sido, r.sigungu, r.eupmyeondong,
       (SELECT count(*)::integer
          FROM public.favorites total
         WHERE total.product_id = p.id) AS "favoriteCount"
     FROM public.favorites f
     JOIN public.products p ON p.id = f.product_id
     JOIN public.categories c ON c.id = p.category_id
     JOIN public.regions r ON r.id = p.region_id
     WHERE ${where.join('\n       AND ')}
     ORDER BY f.created_at DESC, f.product_id DESC
     LIMIT ${limitParam}`,
    values,
  );

  return result.rows;
};
