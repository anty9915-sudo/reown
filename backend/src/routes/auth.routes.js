import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import { validateLogin, validateSignup } from '../validators/auth.validator.js';
import asyncHandler from '../utils/async-handler.js';

const router = Router();

router.post(
  '/signup',
  validate(validateSignup),
  asyncHandler(authController.signup),
);
router.post(
  '/login',
  validate(validateLogin),
  asyncHandler(authController.login),
);

export default router;
