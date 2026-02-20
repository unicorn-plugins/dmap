/**
 * 모델 버전 API 라우트
 *
 * 엔드포인트:
 * - GET  /api/model-versions         현재 모델 버전 조회
 * - POST /api/model-versions/refresh  수동 갱신 트리거
 *
 * @module routes/model-versions
 */
import { Router } from 'express';
import { getAllModelVersions, refreshModelVersions } from '../services/model-versions.js';

export const modelVersionsRouter = Router();

/** GET /api/model-versions — 현재 모델 버전 조회 */
modelVersionsRouter.get('/', (_req, res) => {
  const versions = getAllModelVersions();
  res.json(versions);
});

/** POST /api/model-versions/refresh — 수동 갱신 트리거 */
modelVersionsRouter.post('/refresh', async (_req, res) => {
  try {
    const versions = await refreshModelVersions();
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: `Refresh failed: ${err}` });
  }
});
