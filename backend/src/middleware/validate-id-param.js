import AppError from '../utils/app-error.js';

const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;

// routes의 :productId, :transactionId 같은 path parameter를 검사한다.
// 올바른 bigint 형식이면 controller로 진행하고, 아니면 error-handler.js로 전달한다.
const validateIdParam = (name) => (req, res, next) => {
  if (!POSITIVE_ID_PATTERN.test(req.params[name] ?? '')) {
    return next(
      new AppError(400, 'VALIDATION_ERROR', '입력값이 올바르지 않습니다.', {
        [name]: 'ID는 1 이상의 정수 문자열이어야 합니다.',
      }),
    );
  }

  return next();
};

export default validateIdParam;
