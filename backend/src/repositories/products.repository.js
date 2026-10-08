import pool from '../config/database.js';

// products와 목록 화면에 필요한 categories·regions·favorites를 조회한다.
// service가 비즈니스 규칙을 담당하고, 이 파일은 파라미터 SQL 실행만 담당한다.
const SORT_SQL = {
  latest: 'p.created_at DESC, p.id DESC',
  oldest: 'p.created_at ASC, p.id ASC',
  priceAsc: 'p.price ASC, p.id ASC',
  priceDesc: 'p.price DESC, p.id DESC',
  views: 'p.view_count DESC, p.id DESC',
};

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

// 검색·필터·커서 조건을 조합해 상품 목록을 조회한다.
export const findProducts = async ({
  keyword,
  categoryId,
  regionId,
  status,
  minPrice,
  maxPrice,
  sort,
  cursor,
  limit,
  viewerId,
}) => {
  const values = [];
  const where = ['p.deleted_at IS NULL'];
  const bind = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (keyword) where.push(`p.title ILIKE ${bind(`%${escapeLike(keyword)}%`)} ESCAPE '\\'`);
  if (categoryId) where.push(`p.category_id = ${bind(categoryId)}`);
  if (regionId) where.push(`p.region_id = ${bind(regionId)}`);
  if (status) where.push(`p.status = ${bind(status)}`);
  if (minPrice !== undefined) where.push(`p.price >= ${bind(minPrice)}`);
  if (maxPrice !== undefined) where.push(`p.price <= ${bind(maxPrice)}`);

  if (viewerId) {
    const viewerParam = bind(viewerId);
    where.push(
      `NOT EXISTS (
         SELECT 1 FROM public.blocks b
         WHERE b.blocker_id = ${viewerParam}
           AND b.blocked_id = p.seller_id
       )`,
    );
  }

  if (cursor) {
    const valueParam = bind(cursor.value);
    const idParam = bind(cursor.id);
    const cursorConditions = {
      latest: `(p.created_at, p.id) < (${valueParam}::timestamptz, ${idParam}::bigint)`,
      oldest: `(p.created_at, p.id) > (${valueParam}::timestamptz, ${idParam}::bigint)`,
      priceAsc: `(p.price, p.id) > (${valueParam}::integer, ${idParam}::bigint)`,
      priceDesc: `(p.price, p.id) < (${valueParam}::integer, ${idParam}::bigint)`,
      views: `(p.view_count, p.id) < (${valueParam}::integer, ${idParam}::bigint)`,
    };
    where.push(cursorConditions[sort]);
  }

  const limitParam = bind(limit + 1);
  const result = await pool.query(
    `SELECT
       p.id, p.title, p.price, p.status,
       p.view_count AS "viewCount",
       p.created_at AS "createdAt",
       c.id AS "categoryId", c.name AS "categoryName",
       r.id AS "regionId", r.sido, r.sigungu, r.eupmyeondong,
       (SELECT count(*)::integer FROM public.favorites f WHERE f.product_id = p.id) AS "favoriteCount"
     FROM public.products p
     JOIN public.categories c ON c.id = p.category_id
     JOIN public.regions r ON r.id = p.region_id
     WHERE ${where.join('\n       AND ')}
     ORDER BY ${SORT_SQL[sort]}
     LIMIT ${limitParam}`,
    values,
  );

  return result.rows;
};

// 상세 화면에 필요한 상품, 판매자, 신뢰도, 좋아요 정보를 한 번에 조회한다.
export const findProductDetail = async (productId, viewerId) => {
  const values = [productId];
  const favoriteSql = viewerId
    ? `EXISTS (
         SELECT 1 FROM public.favorites f
         WHERE f.product_id = p.id AND f.user_id = $2
       )`
    : 'false';
  if (viewerId) values.push(viewerId);

  const result = await pool.query(
    `SELECT
       p.id, p.seller_id AS "sellerId", p.title, p.description,
       p.price, p.status, p.view_count AS "viewCount",
       p.created_at AS "createdAt", p.updated_at AS "updatedAt",
       c.id AS "categoryId", c.name AS "categoryName",
       r.id AS "regionId", r.sido, r.sigungu, r.eupmyeondong,
       u.nickname AS "sellerNickname",
       uts.review_count AS "sellerReviewCount",
       uts.avg_rating AS "sellerAvgRating",
       uts.manner_temperature AS "sellerMannerTemperature",
       (SELECT count(*)::integer FROM public.favorites f WHERE f.product_id = p.id) AS "favoriteCount",
       ${favoriteSql} AS "isFavorited"
     FROM public.products p
     JOIN public.categories c ON c.id = p.category_id
     JOIN public.regions r ON r.id = p.region_id
     JOIN public.users u ON u.id = p.seller_id
     LEFT JOIN public.user_trust_stats uts ON uts.user_id = u.id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    values,
  );
  return result.rows[0] ?? null;
};

// 원자적 증가 쿼리를 사용하며 products의 updated_at 트리거에는 영향을 주지 않는다.
export const increaseProductViewCount = async (productId) => {
  const result = await pool.query(
    `UPDATE public.products
     SET view_count = view_count + 1
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING view_count AS "viewCount"`,
    [productId],
  );
  return result.rows[0] ?? null;
};

// service가 허용한 수정 필드만 SQL SET 절로 만들고 소유권·상태를 WHERE에서 확인한다.
export const updateProductByOwner = async (productId, sellerId, changes) => {
  const columns = {
    categoryId: 'category_id',
    title: 'title',
    description: 'description',
    price: 'price',
  };
  const entries = Object.entries(changes).filter(
    ([field, value]) => columns[field] && value !== undefined,
  );
  const values = entries.map(([, value]) => value);
  const sets = entries.map(([field], index) => `${columns[field]} = $${index + 1}`);
  values.push(productId, sellerId);

  const result = await pool.query(
    `UPDATE public.products
     SET ${sets.join(', ')}
     WHERE id = $${values.length - 1}
       AND seller_id = $${values.length}
       AND status = 'ON_SALE'
       AND deleted_at IS NULL
     RETURNING id, category_id AS "categoryId", title, description,
       price, status, updated_at AS "updatedAt"`,
    values,
  );
  return result.rows[0] ?? null;
};

// 수정 실패 원인이 권한 문제인지 상태 문제인지 service가 판단할 때 사용한다.
export const findProductState = async (productId, db = pool) => {
  const result = await db.query(
    `SELECT id, seller_id AS "sellerId", status, deleted_at AS "deletedAt"
     FROM public.products WHERE id = $1`,
    [productId],
  );
  return result.rows[0] ?? null;
};

// 삭제·거래 중 동시 변경을 막기 위해 상품 행을 FOR UPDATE로 잠근다.
export const findProductForUpdate = async (productId, db) => {
  const result = await db.query(
    `SELECT id, seller_id AS "sellerId", price, status,
       deleted_at AS "deletedAt"
     FROM public.products
     WHERE id = $1
     FOR UPDATE`,
    [productId],
  );
  return result.rows[0] ?? null;
};

// transactions service가 거래 상태와 같은 트랜잭션에서 상품 상태를 변경할 때 사용한다.
export const setProductStatus = async (db, productId, status) => {
  const result = await db.query(
    'UPDATE public.products SET status = $2 WHERE id = $1 RETURNING id, status',
    [productId, status],
  );
  return result.rows[0];
};

// 상품 행을 지우지 않고 삭제 시각만 기록해 거래 이력을 보존한다.
export const softDeleteProduct = async (db, productId) => {
  await db.query('UPDATE public.products SET deleted_at = now() WHERE id = $1', [productId]);
};
