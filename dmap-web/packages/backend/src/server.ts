/**
 * Express 서버 진입점 - DMAP Web 백엔드 애플리케이션
 *
 * 아키텍처: Express REST API + SSE 스트리밍 서버
 * 포트: 기본 3001 (config.ts에서 설정)
 *
 * 포트 충돌 처리: Windows 환경에서 netstat/taskkill로 기존 프로세스 종료 후 재시도
 * 종료 처리: SIGTERM/SIGINT 시그널로 graceful shutdown (10초 타임아웃)
 *
 * @module server
 */
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { PORT, DMAP_PROJECT_DIR } from './config.js';
import { healthRouter } from './routes/health.js';
import { skillsRouter } from './routes/skills.js';
import { sessionsRouter } from './routes/sessions.js';
import { infoRouter } from './routes/info.js';
import { startupRouter } from './routes/startup.js';
import { pluginsRouter } from './routes/plugins.js';
import { filesystemRouter } from './routes/filesystem.js';
import { transcriptsRouter } from './routes/transcripts.js';
import { modelVersionsRouter } from './routes/model-versions.js';
import { errorHandler } from './middleware/error-handler.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('Server');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

// Routes
app.use('/', healthRouter);
app.use('/api/info', infoRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/startup-check', startupRouter);
app.use('/api/plugins', pluginsRouter);
app.use('/api/filesystem', filesystemRouter);
app.use('/api/transcripts', transcriptsRouter);
app.use('/api/model-versions', modelVersionsRouter);

// Error handler (must be last)
app.use(errorHandler);

/**
 * 포트 충돌 해결 - 지정 포트를 점유 중인 프로세스를 강제 종료
 * Windows: netstat/taskkill, Linux/Mac: lsof/kill
 */
function killPortProcess(port: number): boolean {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
      const lines = result.trim().split('\n');
      const pids = new Set<string>();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        log.info(`Killing existing process on port ${port} (PID: ${pid})`);
        try { execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf-8' }); } catch { /* already dead */ }
      }
      return pids.size > 0;
    } else {
      const result = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' });
      const pids = result.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        log.info(`Killing existing process on port ${port} (PID: ${pid})`);
        try { execSync(`kill -9 ${pid}`, { encoding: 'utf-8' }); } catch { /* already dead */ }
      }
      return pids.length > 0;
    }
  } catch {
    return false;
  }
}

const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

/**
 * 서버 시작 - EADDRINUSE 에러 시 포트 프로세스 kill 후 1회 재시도
 * graceful shutdown: SIGTERM/SIGINT 수신 시 10초 내 정상 종료
 */
function startServer(retried = false) {
  const server = app.listen(port, () => {
    log.info(`Backend running on http://localhost:${port}`);
    log.info(`DMAP project dir: ${DMAP_PROJECT_DIR}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && !retried) {
      log.info(`Port ${port} in use, killing existing process and retrying...`);
      killPortProcess(port);
      setTimeout(() => startServer(true), 1000);
    } else {
      log.error(`Server error: ${err.message}`);
      process.exit(1);
    }
  });

  function gracefulShutdown(signal: string) {
    log.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      log.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      log.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();

export default app;
