import { Router } from 'express';
import { sessionManager } from '../services/session-manager.js';
import type { SessionRespondRequest } from '@dmap-web/shared';

export const sessionsRouter = Router();

// GET /api/sessions - List all sessions
sessionsRouter.get('/', (req, res) => {
  const pluginId = req.query.pluginId as string | undefined;
  let sessions = sessionManager.listAll();
  if (pluginId) {
    sessions = sessions.filter(s => s.pluginId === pluginId || !s.pluginId);
  }
  res.json({ sessions });
});

// GET /api/sessions/:id - Get session detail
sessionsRouter.get('/:id', (req, res) => {
  const session = sessionManager.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  // Strip internal pendingResponse before sending
  const { pendingResponse: _pending, ...publicSession } = session;
  res.json(publicSession);
});

// POST /api/sessions/:id/respond - Send user response to waiting session
sessionsRouter.post('/:id/respond', (req, res) => {
  const { id } = req.params;
  const { response } = req.body as SessionRespondRequest;

  if (!response) {
    res.status(400).json({ error: 'Response is required' });
    return;
  }

  const resolved = sessionManager.resolveUserResponse(id, response);

  if (!resolved) {
    res.status(404).json({ error: 'No pending response for this session' });
    return;
  }

  res.json({ success: true });
});

// DELETE /api/sessions/:id - Delete a session
sessionsRouter.delete('/:id', (req, res) => {
  const deleted = sessionManager.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ success: true });
});
