// regions.routes.js에서 지역 검색어와 조회 개수를 검사한다.
export const validateRegionListQuery = (query) => {
  const details = {};
  const allowedFields = ['keyword', 'limit'];

  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return { query: 'Query Parameter가 올바르지 않습니다.' };
  }

  for (const field of Object.keys(query)) {
    if (!allowedFields.includes(field)) {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }

  if (
    typeof query.keyword !== 'string' ||
    query.keyword.trim().length < 1 ||
    query.keyword.trim().length > 50
  ) {
    details.keyword = '검색어는 1자 이상 50자 이하의 문자열이어야 합니다.';
  }

  if (
    query.limit !== undefined &&
    (typeof query.limit !== 'string' ||
      !/^\d+$/.test(query.limit) ||
      Number(query.limit) < 1 ||
      Number(query.limit) > 100)
  ) {
    details.limit = 'limit은 1 이상 100 이하의 정수여야 합니다.';
  }

  return details;
};
