import { Router } from 'express';
import * as favoritesController from '../controllers/favorites.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/async-handler.js';
import { validateFavoriteListQuery } from '../validators/favorites.validator.js';

const router = Router();

// 로그인 사용자가 좋아요한 상품을 최근 좋아요 순서로 조회한다.
router.get(
  '/',
  authenticate,
  validate(validateFavoriteListQuery, 'query'),
  asyncHandler(favoritesController.getFavorites),
);

export default router;
