import * as authService from '../services/auth.service.js';

export const signup = async (req, res) => {
  const data = await authService.signup(req.body);
  res.status(201).json({ data });
};

export const login = async (req, res) => {
  const data = await authService.login(req.body);
  res.status(200).json({ data });
};
