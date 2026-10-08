import * as authService from '../services/auth.service.js';

// 회원가입 결과를 201 응답으로 반환한다.
export const signup = async (req, res) => {
  const data = await authService.signup(req.body);
  res.status(201).json({ data });
};

// 로그인 결과를 200 응답으로 반환한다.
export const login = async (req, res) => {
  const data = await authService.login(req.body);
  res.status(200).json({ data });
};
