import express from 'express';
import cors from 'cors';
import { PORT, DMAP_PROJECT_DIR } from './config.js';
import { healthRouter } from './routes/health.js';
import { skillsRouter } from './routes/skills.js';
import { sessionsRouter } from './routes/sessions.js';
import { infoRouter } from './routes/info.js';
import { startupRouter } from './routes/startup.js';
import { pluginsRouter } from './routes/plugins.js';
import { filesystemRouter } from './routes/filesystem.js';
import { transcriptsRouter } from './routes/transcripts.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

// Middleware
app.use(cors());
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

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[DMAP Web] Backend running on http://localhost:${PORT}`);
  console.log(`[DMAP Web] DMAP project dir: ${DMAP_PROJECT_DIR}`);
});

export default app;
