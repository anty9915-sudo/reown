import AppError from '../utils/app-error.js';

const notFound = (req, res, next) => {
  next(
    new AppError(
      404,
      'RESOURCE_NOT_FOUND',
      '요청한 API를 찾을 수 없습니다.',
    ),
  );
};

export default notFound;
