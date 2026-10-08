import AppError from '../utils/app-error.js';

// routes에서 validator와 검사할 위치(body/query)를 받아 공통 입력 검증을 수행한다.
// 오류가 있으면 error-handler.js로 AppError를 전달하고, 없으면 controller로 진행한다.
const validate = (validator, source = 'body') => (req, res, next) => {
  const details = validator(req[source]);

  if (Object.keys(details).length > 0) {
    return next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        '입력값이 올바르지 않습니다.',
        details,
      ),
    );
  }

  return next();
};

export default validate;
