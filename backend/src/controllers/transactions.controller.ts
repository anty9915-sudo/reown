import * as transactionsService from '../services/transactions.service.js';
import type { Request, Response } from 'express';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../types/domain.js';

// 상품 라우트에서 호출되며, 예약 또는 바로 거래완료 생성을 service에 맡긴다.
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const transaction = await transactionsService.createTransaction(
    req.params.productId as string,
    req.user!.id,
    req.body as CreateTransactionInput,
  );
  res.status(201).json({ data: { transaction } });
};

// 거래 라우트에서 호출되며, 기존 예약의 완료·취소 처리를 service에 맡긴다.
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  const transaction = await transactionsService.updateTransaction(
    req.params.transactionId as string,
    req.user!.id,
    req.body as UpdateTransactionInput,
  );
  res.status(200).json({ data: { transaction } });
};
