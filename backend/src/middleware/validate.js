import AppError from '../utils/app-error.js';

// 검사 함수가 찾은 입력 오류를 공통 400 오류로 전달한다.
const validate = (validator) => (req, res, next) => {
  const details = validator(req.body);

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
