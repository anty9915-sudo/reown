import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import errorHandler from './middleware/error-handler.js';
import notFound from './middleware/not-found.js';
import apiRouter from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: env.frontendUrls,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }),
);
app.use(express.json());

app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
