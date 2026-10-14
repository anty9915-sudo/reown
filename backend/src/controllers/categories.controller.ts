import * as categoriesService from '../services/categories.service.js';
import type { Request, Response } from 'express';

// categories.routes.ts에서 호출되어 정렬된 카테고리 목록을 반환한다.
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const items = await categoriesService.getCategories();
  res.status(200).json({ data: { items } });
};
