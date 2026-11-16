import * as chatsService from '../services/chats.service.js';
import type { Request, Response } from 'express';

export const createChatRoom = async (req: Request, res: Response): Promise<void> => {
  const result = await chatsService.createChatRoom(req.user!.id, req.body.productId);
  res.status(201).json({ data: result });
};

export const getChatRooms = async (req: Request, res: Response): Promise<void> => {
  const items = await chatsService.getChatRooms(req.user!.id);
  res.status(200).json({ data: { items } });
};

export const getChatRoom = async (req: Request, res: Response): Promise<void> => {
  const room = await chatsService.getChatRoom(
    req.params.roomId as string,
    req.user!.id,
  );
  res.status(200).json({ data: room });
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  const items = await chatsService.getMessages(
    req.params.roomId as string,
    req.user!.id,
  );
  res.status(200).json({ data: { items } });
};
