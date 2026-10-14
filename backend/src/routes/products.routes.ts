import { Router } from 'express';
import * as favoritesController from '../controllers/favorites.controller.js';
import * as productsController from '../controllers/products.controller.js';
import * as transactionsController from '../controllers/transactions.controller.js';
import authenticate from '../middleware/authenticate.js';
import optionalAuthenticate from '../middleware/optional-authenticate.js';
import validate from '../middleware/validate.js';
import validateIdParam from '../middleware/validate-id-param.js';
import asyncHandler from '../utils/async-handler.js';
import {
  validateProductListQuery,
  validateUpdateProduct,
} from '../validators/products.validator.js';
import { validateCreateTransaction } from '../validators/transactions.validator.js';

const router = Router();

// 공개 목록: 선택적 인증 → query 검증 → controller → products service/repository
router.get(
  '/',
  optionalAuthenticate,
  validate(validateProductListQuery, 'query'),
  asyncHandler(productsController.getProducts),
);
// 공개 상세: 선택적 인증 → 상품 ID 검증 → 상세 조회와 조회수 처리
router.get(
  '/:productId',
  optionalAuthenticate,
  validateIdParam('productId'),
  asyncHandler(productsController.getProduct),
);
// 판매자 전용 수정: 필수 인증 → ID/body 검증 → 소유권·상태 확인
router.patch(
  '/:productId',
  authenticate,
  validateIdParam('productId'),
  validate(validateUpdateProduct),
  asyncHandler(productsController.updateProduct),
);
// 판매자 전용 삭제: service에서 관련 제안·약속·알림까지 트랜잭션 처리
router.delete(
  '/:productId',
  authenticate,
  validateIdParam('productId'),
  asyncHandler(productsController.deleteProduct),
);
// 로그인 사용자가 상품의 좋아요를 추가하거나 취소한다.
router.post(
  '/:productId/favorite',
  authenticate,
  validateIdParam('productId'),
  asyncHandler(favoritesController.toggleFavorite),
);
// 판매자 전용 거래 생성: transactions controller/service로 연결한다.
router.post(
  '/:productId/transactions',
  authenticate,
  validateIdParam('productId'),
  validate(validateCreateTransaction),
  asyncHandler(transactionsController.createTransaction),
);

export default router;
