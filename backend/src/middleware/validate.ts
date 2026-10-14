import AppError from '../utils/app-error.js';
import type { RequestHandler } from 'express';

type ValidationSource = 'body' | 'query' | 'params';
type Validator = (value: unknown) => Record<string, string>;

// routes에서 validator와 검사할 위치(body/query)를 받아 공통 입력 검증을 수행한다.
// 오류가 있으면 error-handler.ts로 AppError를 전달하고, 없으면 controller로 진행한다.
const validate = (
  validator: Validator,
  source: ValidationSource = 'body',
): RequestHandler => (req, _res, next) => {
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
