import AppError from './app-error.js';
import type { ProductCursor, ProductSort } from '../types/domain.js';

// service가 마지막 상품의 정렬값과 ID를 프론트엔드용 불투명 커서로 만든다.
export const encodeProductCursor = ({ sort, value, id }: ProductCursor): string =>
  Buffer.from(JSON.stringify({ sort, value, id }), 'utf8').toString('base64url');

export const decodeProductCursor = (
  cursor: string | undefined,
  expectedSort: ProductSort,
): ProductCursor | null => {
  // 다음 요청에서 커서를 복원하고 현재 정렬 방식과 같은 커서인지 확인한다.
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
      value.sort !== expectedSort ||
      typeof value.id !== 'string' ||
      !/^[1-9]\d*$/.test(value.id) ||
      (typeof value.value !== 'string' && typeof value.value !== 'number')
    ) {
      throw new Error('invalid cursor');
    }

    return value as unknown as ProductCursor;
  } catch {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      '입력값이 올바르지 않습니다.',
      { cursor: '올바른 페이지 커서가 아닙니다.' },
    );
  }
};
