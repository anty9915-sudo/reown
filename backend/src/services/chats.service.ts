import * as chatRoomsRepository from '../repositories/chat-rooms.repository.js';
import * as messagesRepository from '../repositories/messages.repository.js';
import AppError from '../utils/app-error.js';

const notFound = () =>
  new AppError(404, 'RESOURCE_NOT_FOUND', '채팅방 또는 상품을 찾을 수 없습니다.');

const requireMember = async (roomId: string, userId: string) => {
  const room = await chatRoomsRepository.findChatRoom(roomId, userId);
  if (!room) throw notFound();

  if (
    String(room.buyerId) !== userId &&
    String(room.sellerId) !== userId
  ) {
    throw new AppError(403, 'FORBIDDEN', '이 채팅방에 접근할 수 없습니다.');
  }
  return room;
};

const toIso = (value: Date | string | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export const createChatRoom = async (buyerId: string, productId: string) => {
  const product = await chatRoomsRepository.findProductForChat(productId);
  if (!product || product.deletedAt) throw notFound();

  if (String(product.sellerId) === buyerId) {
    throw new AppError(409, 'RESOURCE_CONFLICT', '자기 상품에는 채팅을 시작할 수 없습니다.');
  }

  if (await chatRoomsRepository.isBlocked(buyerId, String(product.sellerId))) {
    throw new AppError(403, 'FORBIDDEN', '차단 관계에서는 채팅을 시작할 수 없습니다.');
  }

  const roomId = await chatRoomsRepository.createOrFindChatRoom(productId, buyerId);
  return { roomId };
};

export const getChatRooms = async (userId: string) => {
  const rooms = await chatRoomsRepository.findChatRoomsForUser(userId);
  return rooms.map((room) => ({
    id: String(room.id),
    productId: String(room.productId),
    productTitle: room.productTitle,
    partner: {
      id: String(room.partnerId),
      nickname: room.partnerNickname,
    },
    lastMessage: room.lastMessage ?? null,
    lastSenderId: room.lastSenderId ? String(room.lastSenderId) : null,
    lastMessageAt: room.lastMessageAt ? toIso(room.lastMessageAt) : null,
    unreadCount: room.unreadCount,
    blocked: room.blocked,
  }));
};

export const getChatRoom = async (roomId: string, userId: string) => {
  const room = await requireMember(roomId, userId);
  return {
    id: String(room.id),
    myId: userId,
    product: {
      id: String(room.productId),
      title: room.productTitle,
      price: room.productPrice,
      image: null,
      status: room.productStatus,
      deleted: room.productDeleted,
    },
    partner: {
      id: String(room.partnerId),
      nickname: room.partnerNickname,
    },
    blocked: room.blocked,
  };
};

export const getMessages = async (roomId: string, userId: string) => {
  await requireMember(roomId, userId);
  const messages = await messagesRepository.findMessages(roomId);
  return messages.map((message) => ({
    id: String(message.id),
    chatRoomId: String(message.chatRoomId),
    senderId: String(message.senderId),
    content: message.content,
    readAt: toIso(message.readAt),
    createdAt: toIso(message.createdAt),
  }));
};

export const sendMessage = async (
  roomId: string,
  userId: string,
  content: unknown,
) => {
  if (
    typeof content !== 'string' ||
    content.trim().length < 1 ||
    content.length > 1000
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      '메시지는 공백이 아닌 1자 이상 1000자 이하로 입력해 주세요.',
    );
  }

  const room = await requireMember(roomId, userId);
  if (room.productDeleted) {
    throw new AppError(409, 'RESOURCE_CONFLICT', '삭제된 상품의 채팅방에서는 메시지를 보낼 수 없습니다.');
  }
  if (room.blocked) {
    throw new AppError(403, 'FORBIDDEN', '차단 관계라 메시지를 보낼 수 없습니다.');
  }

  const message = await messagesRepository.createMessage(
    roomId,
    userId,
    content.trim(),
  );
  return {
    id: String(message.id),
    chatRoomId: String(message.chatRoomId),
    senderId: String(message.senderId),
    content: message.content,
    readAt: toIso(message.readAt),
    createdAt: toIso(message.createdAt),
  };
};

export const markRead = async (roomId: string, userId: string) => {
  await requireMember(roomId, userId);
  return messagesRepository.markMessagesRead(roomId, userId);
};
