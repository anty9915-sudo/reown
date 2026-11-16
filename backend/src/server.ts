import { createServer } from 'node:http';
import app from './app.js';
import env from './config/env.js';
import { initializeSocketServer } from './sockets/index.js';

const httpServer = createServer(app);
initializeSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`REOWN backend listening on http://localhost:${env.port}`);
});
