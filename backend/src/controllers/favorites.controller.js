import * as favoritesService from '../services/favorites.service.js';

// 상품 ID와 로그인 사용자 ID를 service에 전달하고 변경된 좋아요 상태를 반환한다.
export const toggleFavorite = async (req, res) => {
  const favorite = await favoritesService.toggleFavorite(
    req.params.productId,
    req.user.id,
  );

  res.status(200).json({ data: favorite });
};

// 로그인 사용자의 좋아요 목록 조건을 service에 전달한다.
export const getFavorites = async (req, res) => {
  const data = await favoritesService.getFavorites(req.user.id, req.query);
  res.status(200).json({ data });
};
