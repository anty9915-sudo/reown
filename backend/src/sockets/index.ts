import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import env from '../config/env.js';
import registerChatHandlers from './chat.socket.js';
import { authenticateSocket } from './authenticate-socket.js';

export const initializeSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrls,
      methods: ['GET', 'POST'],
    },
  });

  io.use(authenticateSocket);
  io.on('connection', (socket) => registerChatHandlers(io, socket));
  return io;
};
