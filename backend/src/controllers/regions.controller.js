import * as regionsService from '../services/regions.service.js';

// regions.routes.js에서 검증된 검색 조건을 받아 지역 검색 결과를 반환한다.
export const getRegions = async (req, res) => {
  const items = await regionsService.getRegions(req.query);
  res.status(200).json({ data: { items } });
};
