import { Router } from 'express';
import authRouter from './auth.routes.js';
import categoriesRouter from './categories.routes.js';
import productsRouter from './products.routes.js';
import regionsRouter from './regions.routes.js';
import transactionsRouter from './transactions.routes.js';

const router = Router();

// app.js가 /api/v1에 이 router를 연결하므로 아래 경로가 실제 API 주소가 된다.
router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/regions', regionsRouter);
router.use('/transactions', transactionsRouter);

export default router;
