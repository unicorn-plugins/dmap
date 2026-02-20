import { Router } from 'express';
import { listTranscriptSessions, getTranscriptMessages, deleteTranscriptSession, deleteBatchTranscriptSessions, saveTitleOverride } from '../services/transcript-service.js';
import { resolveWorkingDir } from '../services/plugin-manager.js';

export const transcriptsRouter = Router();

// GET /api/transcripts - List all transcript sessions
// ?pluginId=xxx → 해당 플러그인 프로젝트의 대화 목록 반환
transcriptsRouter.get('/', async (req, res) => {
  try {
    const pluginId = req.query.pluginId as string | undefined;
    const projectDir = await resolveWorkingDir(pluginId);
    const sessions = await listTranscriptSessions(projectDir);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list transcript sessions' });
  }
});

// DELETE /api/transcripts - Delete transcript sessions by IDs
transcriptsRouter.delete('/', async (req, res) => {
  try {
    const { ids, pluginId } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }
    const projectDir = await resolveWorkingDir(pluginId);
    const deleted = await deleteBatchTranscriptSessions(ids, projectDir);
    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transcript sessions' });
  }
});

// DELETE /api/transcripts/:sessionId - Delete a specific transcript session
transcriptsRouter.delete('/:sessionId', async (req, res) => {
  try {
    const pluginId = req.query.pluginId as string | undefined;
    const projectDir = await resolveWorkingDir(pluginId);
    const success = await deleteTranscriptSession(req.params.sessionId, projectDir);
    if (success) {
      res.json({ deleted: true });
    } else {
      res.status(404).json({ error: 'Transcript not found' });
    }
  } catch (err: any) {
    if (err.message?.includes('Invalid session ID')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to delete transcript' });
    }
  }
});

// PATCH /api/transcripts/:sessionId/title - Update transcript title
transcriptsRouter.patch('/:sessionId/title', async (req, res) => {
  try {
    const { title } = req.body || {};
    if (typeof title !== 'string') {
      res.status(400).json({ error: 'title string is required' });
      return;
    }
    const pluginId = req.query.pluginId as string | undefined;
    const projectDir = await resolveWorkingDir(pluginId);
    await saveTitleOverride(req.params.sessionId, title, projectDir);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('Invalid session ID')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to update title' });
    }
  }
});

// GET /api/transcripts/:sessionId - Get messages for a specific session
transcriptsRouter.get('/:sessionId', async (req, res) => {
  try {
    const pluginId = req.query.pluginId as string | undefined;
    const projectDir = await resolveWorkingDir(pluginId);
    const messages = await getTranscriptMessages(req.params.sessionId, projectDir);
    res.json({ messages, count: messages.length });
  } catch (err: any) {
    if (err.message?.includes('Invalid session ID')) {
      res.status(400).json({ error: err.message });
    } else if (err.message?.includes('not found')) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to read transcript' });
    }
  }
});
