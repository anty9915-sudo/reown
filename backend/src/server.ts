import { createServer } from "node:http";
import app from "./app.js";
import env from "./config/env.js";
import { initializeSocketServer } from "./sockets/index.js";
import cors from "cors";

const httpServer = createServer(app);
initializeSocketServer(httpServer);

httpServer.listen(env.port, () => {
  const mode = env.databaseUrl ? "Supabase" : "local dev JSON";
  console.log(
    `REOWN backend listening on http://localhost:${env.port} (${mode})`,
  );
});

app.use(
  cors({
    origin: [
      "http://localhost:3000", // 로컬 개발용 주소 유지
      "https://팀원프로젝트주소.vercel.app", // 👈 팀원의 Vercel 배포 주소 입력
    ],
    credentials: true, // 로그인 쿠키/토큰 인증을 사용한다면 필수
  }),
);
