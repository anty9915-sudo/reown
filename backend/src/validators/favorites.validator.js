const INTEGER_PATTERN = /^\d+$/;
const ALLOWED_FIELDS = ['limit', 'cursor'];

// 찜 목록의 조회 개수와 다음 페이지 커서가 올바른지 검사한다.
export const validateFavoriteListQuery = (query) => {
  const details = {};

  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return { query: 'Query Parameter가 올바르지 않습니다.' };
  }

  for (const field of Object.keys(query)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }

  if (
    query.limit !== undefined &&
    (typeof query.limit !== 'string' ||
      !INTEGER_PATTERN.test(query.limit) ||
      Number(query.limit) < 1 ||
      Number(query.limit) > 100)
  ) {
    details.limit = 'limit은 1 이상 100 이하의 정수여야 합니다.';
  }

  if (
    query.cursor !== undefined &&
    (typeof query.cursor !== 'string' ||
      query.cursor.length < 1 ||
      query.cursor.length > 1000)
  ) {
    details.cursor = '페이지 커서가 올바르지 않습니다.';
  }

  return details;
};
