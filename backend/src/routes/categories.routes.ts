import { Router } from 'express';
import * as categoriesController from '../controllers/categories.controller.js';
import asyncHandler from '../utils/async-handler.js';

const router = Router();

// 기준 데이터는 공개 조회만 제공하고 controller/service/repository 순으로 연결한다.
router.get('/', asyncHandler(categoriesController.getCategories));

export default router;
