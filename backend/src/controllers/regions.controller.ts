import * as regionsService from '../services/regions.service.js';
import type { Request, Response } from 'express';
import type { RegionListQuery } from '../types/domain.js';

// regions.routes.ts에서 검증된 검색 조건을 받아 지역 검색 결과를 반환한다.
export const getRegions = async (req: Request, res: Response): Promise<void> => {
  const items = await regionsService.getRegions(
    req.query as unknown as RegionListQuery,
  );
  res.status(200).json({ data: { items } });
};
