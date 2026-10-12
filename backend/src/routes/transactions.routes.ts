import { Router } from 'express';
import * as transactionsController from '../controllers/transactions.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import validateIdParam from '../middleware/validate-id-param.js';
import asyncHandler from '../utils/async-handler.js';
import { validateUpdateTransaction } from '../validators/transactions.validator.js';

const router = Router();

// 기존 예약을 거래완료 또는 취소한다. 실제 상태 전이는 service가 검증한다.
router.patch(
  '/:transactionId',
  authenticate,
  validateIdParam('transactionId'),
  validate(validateUpdateTransaction),
  asyncHandler(transactionsController.updateTransaction),
);

export default router;
