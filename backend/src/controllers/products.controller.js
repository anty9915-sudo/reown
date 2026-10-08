import * as productsService from '../services/products.service.js';

// routes에서 받은 상품 목록 조건을 service로 전달하고 공통 목록 응답을 만든다.
export const getProducts = async (req, res) => {
  const data = await productsService.getProducts(req.query, req.user?.id);
  res.status(200).json({ data });
};

// 로그인 사용자는 user ID, 비회원은 IP를 조회수 중복 방지 키로 사용한다.
export const getProduct = async (req, res) => {
  const viewerId = req.user?.id;
  const address = req.ip || req.socket.remoteAddress || 'unknown';
  const viewerKey = viewerId ? `user:${viewerId}` : `ip:${address}`;
  const product = await productsService.getProduct({
    productId: req.params.productId,
    viewerId,
    viewerKey,
  });
  res.status(200).json({ data: { product } });
};

// 인증 미들웨어가 만든 req.user.id와 수정 요청을 service로 전달한다.
export const updateProduct = async (req, res) => {
  const product = await productsService.updateProduct(
    req.params.productId,
    req.user.id,
    req.body,
  );
  res.status(200).json({ data: { product } });
};

// 실제 행 삭제가 아닌 소프트 삭제를 service에 요청하고 204를 반환한다.
export const deleteProduct = async (req, res) => {
  await productsService.deleteProduct(req.params.productId, req.user.id);
  res.status(204).send();
};
