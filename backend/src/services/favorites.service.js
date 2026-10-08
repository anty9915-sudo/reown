import {
  addFavorite,
  countProductFavorites,
  findFavorite,
  findFavoriteProducts,
  findProductForFavorite,
  removeFavorite,
} from '../repositories/favorites.repository.js';
import AppError from '../utils/app-error.js';
import {
  decodeFavoriteCursor,
  encodeFavoriteCursor,
} from '../utils/favorite-cursor.js';

const notFound = () =>
  new AppError(404, 'RESOURCE_NOT_FOUND', '상품을 찾을 수 없습니다.');

const toIso = (value) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

// DB 상품 행을 찜 목록 페이지에서 사용하는 응답 형식으로 바꾼다.
const toFavoriteListItem = (row) => ({
  id: String(row.id),
  title: row.title,
  price: row.price,
  status: row.status,
  favoriteCount: row.favoriteCount,
  thumbnailUrl: null,
  category: {
    id: String(row.categoryId),
    name: row.categoryName,
  },
  region: {
    id: String(row.regionId),
    sido: row.sido,
    sigungu: row.sigungu,
    eupmyeondong: row.eupmyeondong,
  },
  favoritedAt: toIso(row.favoritedAt),
});

// 좋아요가 없으면 추가하고, 이미 있으면 삭제한 뒤 현재 상태와 개수를 반환한다.
export const toggleFavorite = async (productId, userId) => {
  const product = await findProductForFavorite(productId);

  if (!product || product.deletedAt) {
    throw notFound();
  }

  if (String(product.sellerId) === String(userId)) {
    throw new AppError(
      409,
      'RESOURCE_CONFLICT',
      '자기 상품에는 좋아요를 누를 수 없습니다.',
    );
  }

  const favorite = await findFavorite(userId, productId);
  let isFavorited;

  if (favorite) {
    await removeFavorite(userId, productId);
    isFavorited = false;
  } else {
    await addFavorite(userId, productId);
    isFavorited = true;
  }

  const favoriteCount = await countProductFavorites(productId);

  return {
    productId: String(productId),
    isFavorited,
    favoriteCount,
  };
};

// 커서와 조회 개수를 적용해 로그인 사용자의 좋아요 상품 목록을 반환한다.
export const getFavorites = async (userId, query) => {
  const limit = Number(query.limit ?? 20);
  const cursor = decodeFavoriteCursor(query.cursor);
  const rows = await findFavoriteProducts({ userId, cursor, limit });
  const hasNext = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);

  return {
    items: pageRows.map(toFavoriteListItem),
    pageInfo: {
      nextCursor:
        hasNext && last
          ? encodeFavoriteCursor({
              favoritedAt: toIso(last.favoritedAt),
              productId: String(last.id),
            })
          : null,
      hasNext,
    },
  };
};
