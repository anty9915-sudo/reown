import * as authService from '../services/auth.service.js';
import type { Request, Response } from 'express';
import type { AuthCredentials, SignupInput } from '../types/domain.js';

// 회원가입 결과를 201 응답으로 반환한다.
export const signup = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.signup(req.body as SignupInput);
  res.status(201).json({ data });
};

// 로그인 결과를 200 응답으로 반환한다.
export const login = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.login(req.body as AuthCredentials);
  res.status(200).json({ data });
};
