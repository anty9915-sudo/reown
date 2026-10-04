import express from 'express';

const app = express();

app.disable('x-powered-by');
app.use(express.json());

// 라우터는 docs/API.md 확정 후 src/routes/에 추가한다.

export default app;
