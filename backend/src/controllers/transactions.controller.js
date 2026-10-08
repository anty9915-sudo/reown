import * as transactionsService from '../services/transactions.service.js';

// 상품 라우트에서 호출되며, 예약 또는 바로 거래완료 생성을 service에 맡긴다.
export const createTransaction = async (req, res) => {
  const transaction = await transactionsService.createTransaction(
    req.params.productId,
    req.user.id,
    req.body,
  );
  res.status(201).json({ data: { transaction } });
};

// 거래 라우트에서 호출되며, 기존 예약의 완료·취소 처리를 service에 맡긴다.
export const updateTransaction = async (req, res) => {
  const transaction = await transactionsService.updateTransaction(
    req.params.transactionId,
    req.user.id,
    req.body,
  );
  res.status(200).json({ data: { transaction } });
};
