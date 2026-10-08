import pool from '../config/database.js';
import { categoryExists } from '../repositories/categories.repository.js';
import {
  findProductDetail,
  findProductForUpdate,
  findProducts,
  findProductState,
  increaseProductViewCount,
  softDeleteProduct,
  updateProductByOwner,
} from '../repositories/products.repository.js';
import {
  expireOffersForProductDeletion,
} from '../repositories/price-offers.repository.js';
import {
  closeAppointmentsForProductDeletion,
} from '../repositories/trade-appointments.repository.js';
import {
  createAppointmentCanceledNotifications,
  createOfferExpiredNotifications,
} from '../repositories/notifications.repository.js';
import AppError from '../utils/app-error.js';
import {
  decodeProductCursor,
  encodeProductCursor,
} from '../utils/product-cursor.js';
import { shouldIncreaseViewCount } from '../utils/view-tracker.js';

// 상품 controller와 repository 사이에서 권한, 상태, 응답 변환을 담당한다.
// 여러 테이블을 함께 바꾸는 삭제 작업은 이 계층에서 DB 트랜잭션으로 묶는다.
const notFound = () =>
  new AppError(404, 'RESOURCE_NOT_FOUND', '상품을 찾을 수 없습니다.');

const conflict = (message) =>
  new AppError(409, 'RESOURCE_CONFLICT', message);

const toIso = (value) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toProductListItem = (row) => ({
  id: String(row.id),
  title: row.title,
  price: row.price,
  status: row.status,
  viewCount: row.viewCount,
  favoriteCount: row.favoriteCount,
  thumbnailUrl: null,
  category: { id: String(row.categoryId), name: row.categoryName },
  region: {
    id: String(row.regionId),
    sido: row.sido,
    sigungu: row.sigungu,
    eupmyeondong: row.eupmyeondong,
  },
  createdAt: toIso(row.createdAt),
});

const cursorValue = (row, sort) => {
  if (sort === 'latest' || sort === 'oldest') return toIso(row.createdAt);
  if (sort === 'priceAsc' || sort === 'priceDesc') return row.price;
  return row.viewCount;
};

const validateDecodedCursor = (cursor, sort) => {
  if (!cursor) return;
  const isDateSort = sort === 'latest' || sort === 'oldest';
  const valid = isDateSort
    ? typeof cursor.value === 'string' && !Number.isNaN(Date.parse(cursor.value))
    : Number.isInteger(cursor.value) && cursor.value >= 0;

  if (!valid) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      '입력값이 올바르지 않습니다.',
      { cursor: '올바른 페이지 커서가 아닙니다.' },
    );
  }
};

// 목록 query를 DB 조회값으로 변환하고 다음 페이지 커서를 만들어 controller에 반환한다.
export const getProducts = async (query, viewerId) => {
  const sort = query.sort ?? 'latest';
  const limit = Number(query.limit ?? 20);
  const cursor = decodeProductCursor(query.cursor, sort);
  validateDecodedCursor(cursor, sort);

  const rows = await findProducts({
    keyword: query.keyword?.trim(),
    categoryId: query.categoryId,
    regionId: query.regionId,
    status: query.status,
    minPrice: query.minPrice === undefined ? undefined : Number(query.minPrice),
    maxPrice: query.maxPrice === undefined ? undefined : Number(query.maxPrice),
    sort,
    cursor,
    limit,
    viewerId,
  });
  const hasNext = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);

  return {
    items: pageRows.map(toProductListItem),
    pageInfo: {
      nextCursor:
        hasNext && last
          ? encodeProductCursor({
              sort,
              value: cursorValue(last, sort),
              id: String(last.id),
            })
          : null,
      hasNext,
    },
  };
};

// 상세 정보를 조회하고 판매자 본인이 아닌 중복되지 않은 조회만 조회수를 증가시킨다.
export const getProduct = async ({ productId, viewerId, viewerKey }) => {
  const row = await findProductDetail(productId, viewerId);
  if (!row) throw notFound();

  if (
    String(row.sellerId) !== String(viewerId) &&
    shouldIncreaseViewCount(productId, viewerKey)
  ) {
    const updated = await increaseProductViewCount(productId);
    if (updated) row.viewCount = updated.viewCount;
  }

  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    price: row.price,
    status: row.status,
    viewCount: row.viewCount,
    favoriteCount: row.favoriteCount,
    isFavorited: row.isFavorited,
    images: [],
    category: { id: String(row.categoryId), name: row.categoryName },
    region: {
      id: String(row.regionId),
      sido: row.sido,
      sigungu: row.sigungu,
      eupmyeondong: row.eupmyeondong,
    },
    seller: {
      id: String(row.sellerId),
      nickname: row.sellerNickname,
      reviewCount: row.sellerReviewCount,
      avgRating: row.sellerAvgRating === null ? null : Number(row.sellerAvgRating),
      mannerTemperature: Number(row.sellerMannerTemperature),
    },
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
};

// 카테고리 존재 여부와 상품 소유권·판매 상태를 확인한 뒤 허용 필드만 수정한다.
export const updateProduct = async (productId, sellerId, body) => {
  if (body.categoryId !== undefined && !(await categoryExists(body.categoryId))) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      '입력값이 올바르지 않습니다.',
      { categoryId: '존재하지 않는 카테고리입니다.' },
    );
  }

  const changes = {
    ...body,
    title: body.title?.trim(),
    description: body.description?.trim(),
  };
  const updated = await updateProductByOwner(productId, sellerId, changes);
  if (updated) {
    return {
      ...updated,
      id: String(updated.id),
      categoryId: String(updated.categoryId),
      updatedAt: toIso(updated.updatedAt),
    };
  }

  const product = await findProductState(productId);
  if (!product || product.deletedAt || String(product.sellerId) !== sellerId) {
    throw notFound();
  }
  throw conflict('판매중인 상품만 수정할 수 있습니다.');
};

// 상품과 관련 제안·약속·알림을 한 트랜잭션에서 정리한 뒤 소프트 삭제한다.
export const deleteProduct = async (productId, sellerId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await findProductForUpdate(productId, client);

    if (!product || product.deletedAt || String(product.sellerId) !== sellerId) {
      throw notFound();
    }
    if (product.status === 'RESERVED') {
      throw conflict('예약중인 상품은 예약을 취소한 후 삭제할 수 있습니다.');
    }

    const offers = await expireOffersForProductDeletion(client, productId);
    const appointments = await closeAppointmentsForProductDeletion(
      client,
      productId,
    );
    await createOfferExpiredNotifications(client, offers);
    await createAppointmentCanceledNotifications(client, appointments);
    await softDeleteProduct(client, productId);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
