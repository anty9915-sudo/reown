const ID_PATTERN = /^[1-9]\d*$/;
type ValidationDetails = Record<string, string>;

export const validateCreateChatRoom = (value: unknown): ValidationDetails => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { body: '요청 본문은 JSON 객체여야 합니다.' };
  }

  const body = value as Record<string, unknown>;
  const details: ValidationDetails = {};

  for (const field of Object.keys(body)) {
    if (field !== 'productId') {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }

  if (typeof body.productId !== 'string' || !ID_PATTERN.test(body.productId)) {
    details.productId = '상품 ID는 1 이상의 정수 문자열이어야 합니다.';
  }

  return details;
};
