const ID_PATTERN = /^[1-9]\d*$/;

// 거래 생성·변경 body의 허용 필드와 상태값을 검사한다.
const validateBody = (body, allowedFields) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { body: '요청 본문은 JSON 객체여야 합니다.' };
  }

  const details = {};
  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }
  return details;
};

export const validateCreateTransaction = (body) => {
  // 상품에서 새 예약 또는 바로 거래완료를 만들 때 사용한다.
  const details = validateBody(body, ['chatRoomId', 'status']);

  if (
    typeof body?.chatRoomId !== 'string' ||
    !ID_PATTERN.test(body.chatRoomId)
  ) {
    details.chatRoomId = '채팅방 ID는 1 이상의 정수 문자열이어야 합니다.';
  }

  if (!['RESERVED', 'COMPLETED'].includes(body?.status)) {
    details.status = 'RESERVED 또는 COMPLETED여야 합니다.';
  }

  return details;
};

export const validateUpdateTransaction = (body) => {
  // 기존 예약을 완료하거나 취소할 때 사용한다.
  const details = validateBody(body, ['status']);

  if (!['COMPLETED', 'CANCELED'].includes(body?.status)) {
    details.status = 'COMPLETED 또는 CANCELED여야 합니다.';
  }

  return details;
};
