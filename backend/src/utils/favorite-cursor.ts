import AppError from './app-error.js';
import type { FavoriteCursor } from '../types/domain.js';

// 마지막 좋아요 시각과 상품 ID를 프론트엔드가 그대로 돌려줄 커서로 만든다.
export const encodeFavoriteCursor = ({ favoritedAt, productId }: FavoriteCursor): string =>
  Buffer.from(
    JSON.stringify({ favoritedAt, productId }),
    'utf8',
  ).toString('base64url');

// 다음 페이지 요청의 커서를 원래 값으로 복원하고 형식을 확인한다.
export const decodeFavoriteCursor = (cursor?: string): FavoriteCursor | null => {
  if (!cursor) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );

    const value = parsed as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof value.favoritedAt !== 'string' ||
      Number.isNaN(Date.parse(value.favoritedAt)) ||
      typeof value.productId !== 'string' ||
      !/^[1-9]\d*$/.test(value.productId)
    ) {
      throw new Error('invalid cursor');
    }

    return value as unknown as FavoriteCursor;
  } catch {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      '입력값이 올바르지 않습니다.',
      { cursor: '올바른 페이지 커서가 아닙니다.' },
    );
  }
};
