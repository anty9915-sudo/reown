import AppError from '../utils/app-error.js';
import type { ErrorRequestHandler } from 'express';

type JsonSyntaxError = SyntaxError & { type?: string };

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (
    error instanceof SyntaxError &&
    (error as JsonSyntaxError).type === 'entity.parse.failed'
  ) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'JSON 형식이 올바르지 않습니다.',
      },
    });
  }

  if (error instanceof AppError) {
    const body: {
      code: string;
      message: string;
      details?: Record<string, string>;
    } = {
      code: error.code,
      message: error.message,
    };

    if (error.details) {
      body.details = error.details;
    }

    return res.status(error.status).json({ error: body });
  }

  console.error(error);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
    },
  });
};

export default errorHandler;
