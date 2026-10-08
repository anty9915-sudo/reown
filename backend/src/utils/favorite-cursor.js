import AppError from './app-error.js';

// 마지막 좋아요 시각과 상품 ID를 프론트엔드가 그대로 돌려줄 커서로 만든다.
export const encodeFavoriteCursor = ({ favoritedAt, productId }) =>
  Buffer.from(
    JSON.stringify({ favoritedAt, productId }),
    'utf8',
  ).toString('base64url');

// 다음 페이지 요청의 커서를 원래 값으로 복원하고 형식을 확인한다.
export const decodeFavoriteCursor = (cursor) => {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));

    if (
      !parsed ||
      typeof parsed.favoritedAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.favoritedAt)) ||
      typeof parsed.productId !== 'string' ||
      !/^[1-9]\d*$/.test(parsed.productId)
    ) {
      throw new Error('invalid cursor');
    }

    return parsed;
  } catch {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      '입력값이 올바르지 않습니다.',
      { cursor: '올바른 페이지 커서가 아닙니다.' },
    );
  }
};
