const ID_PATTERN = /^[1-9]\d*$/;
const INTEGER_PATTERN = /^\d+$/;
const PRODUCT_STATUSES = new Set(['ON_SALE', 'RESERVED', 'SOLD']);
const SORTS = new Set(['latest', 'oldest', 'priceAsc', 'priceDesc', 'views']);
const LIST_FIELDS = [
  'keyword',
  'categoryId',
  'regionId',
  'status',
  'minPrice',
  'maxPrice',
  'sort',
  'limit',
  'cursor',
];
const UPDATE_FIELDS = ['categoryId', 'title', 'description', 'price'];

// products.routes.js의 목록 query와 수정 body가 API 명세를 따르는지 검사한다.
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const rejectUnknownFields = (value, allowedFields, details) => {
  for (const field of Object.keys(value)) {
    if (!allowedFields.includes(field)) {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }
};

const validateQueryInteger = (value, field, details, min, max) => {
  if (value === undefined) {
    return;
  }

  if (
    typeof value !== 'string' ||
    !INTEGER_PATTERN.test(value) ||
    Number(value) < min ||
    Number(value) > max
  ) {
    details[field] = `${min} 이상 ${max} 이하의 정수여야 합니다.`;
  }
};

export const validateProductListQuery = (query) => {
  // 검색·필터·정렬·페이지네이션 query를 검사한다.
  const details = {};

  if (!isObject(query)) {
    return { query: 'Query Parameter가 올바르지 않습니다.' };
  }

  rejectUnknownFields(query, LIST_FIELDS, details);

  if (query.keyword !== undefined) {
    if (
      typeof query.keyword !== 'string' ||
      query.keyword.trim().length < 1 ||
      query.keyword.trim().length > 100
    ) {
      details.keyword = '검색어는 1자 이상 100자 이하의 문자열이어야 합니다.';
    }
  }

  for (const field of ['categoryId', 'regionId']) {
    if (
      query[field] !== undefined &&
      (typeof query[field] !== 'string' || !ID_PATTERN.test(query[field]))
    ) {
      details[field] = 'ID는 1 이상의 정수 문자열이어야 합니다.';
    }
  }

  if (query.status !== undefined && !PRODUCT_STATUSES.has(query.status)) {
    details.status = 'ON_SALE, RESERVED, SOLD 중 하나여야 합니다.';
  }

  validateQueryInteger(query.minPrice, 'minPrice', details, 1, 1000000000);
  validateQueryInteger(query.maxPrice, 'maxPrice', details, 1, 1000000000);
  validateQueryInteger(query.limit, 'limit', details, 1, 100);

  if (
    !details.minPrice &&
    !details.maxPrice &&
    query.minPrice !== undefined &&
    query.maxPrice !== undefined &&
    Number(query.minPrice) > Number(query.maxPrice)
  ) {
    details.maxPrice = '최대 가격은 최소 가격 이상이어야 합니다.';
  }

  if (query.sort !== undefined && !SORTS.has(query.sort)) {
    details.sort = '지원하지 않는 정렬 방식입니다.';
  }

  if (
    query.cursor !== undefined &&
    (typeof query.cursor !== 'string' || query.cursor.length < 1 || query.cursor.length > 1000)
  ) {
    details.cursor = '페이지 커서가 올바르지 않습니다.';
  }

  return details;
};

export const validateUpdateProduct = (body) => {
  // 상품 수정에서 허용된 네 필드와 각 길이·범위를 검사한다.
  const details = {};

  if (!isObject(body)) {
    return { body: '요청 본문은 JSON 객체여야 합니다.' };
  }

  rejectUnknownFields(body, UPDATE_FIELDS, details);

  if (!UPDATE_FIELDS.some((field) => body[field] !== undefined)) {
    details.body = '수정할 필드를 하나 이상 보내야 합니다.';
  }

  if (
    body.categoryId !== undefined &&
    (typeof body.categoryId !== 'string' || !ID_PATTERN.test(body.categoryId))
  ) {
    details.categoryId = '카테고리 ID는 1 이상의 정수 문자열이어야 합니다.';
  }

  if (body.title !== undefined) {
    if (
      typeof body.title !== 'string' ||
      body.title.trim().length < 1 ||
      body.title.length > 100
    ) {
      details.title = '상품명은 1자 이상 100자 이하의 문자열이어야 합니다.';
    }
  }

  if (body.description !== undefined) {
    if (
      typeof body.description !== 'string' ||
      body.description.trim().length < 1 ||
      body.description.length > 2000
    ) {
      details.description = '상품 설명은 1자 이상 2000자 이하의 문자열이어야 합니다.';
    }
  }

  if (
    body.price !== undefined &&
    (!Number.isInteger(body.price) || body.price < 1 || body.price > 1000000000)
  ) {
    details.price = '가격은 1 이상 10억 이하의 정수여야 합니다.';
  }

  return details;
};
