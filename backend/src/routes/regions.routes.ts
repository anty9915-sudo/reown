import { Router } from 'express';
import * as regionsController from '../controllers/regions.controller.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/async-handler.js';
import { validateRegionListQuery } from '../validators/regions.validator.js';

const router = Router();

// query를 먼저 검증한 뒤 지역 검색 controller/service/repository로 연결한다.
router.get(
  '/',
  validate(validateRegionListQuery, 'query'),
  asyncHandler(regionsController.getRegions),
);

export default router;
