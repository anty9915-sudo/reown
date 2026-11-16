import { Router } from 'express';
import * as chatsController from '../controllers/chats.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import validateIdParam from '../middleware/validate-id-param.js';
import asyncHandler from '../utils/async-handler.js';
import { validateCreateChatRoom } from '../validators/chats.validator.js';

const router = Router();

router.post(
  '/',
  authenticate,
  validate(validateCreateChatRoom),
  asyncHandler(chatsController.createChatRoom),
);
router.get(
  '/',
  authenticate,
  asyncHandler(chatsController.getChatRooms),
);
router.get(
  '/:roomId',
  authenticate,
  validateIdParam('roomId'),
  asyncHandler(chatsController.getChatRoom),
);
router.get(
  '/:roomId/messages',
  authenticate,
  validateIdParam('roomId'),
  asyncHandler(chatsController.getMessages),
);

export default router;
