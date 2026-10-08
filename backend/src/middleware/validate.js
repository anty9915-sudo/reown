import AppError from '../utils/app-error.js';

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
