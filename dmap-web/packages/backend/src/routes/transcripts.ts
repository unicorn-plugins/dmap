import { Router } from 'express';
import { listTranscriptSessions, getTranscriptMessages, deleteTranscriptSession, deleteBatchTranscriptSessions } from '../services/transcript-service.js';

export const transcriptsRouter = Router();

// GET /api/transcripts - List all transcript sessions
transcriptsRouter.get('/', async (_req, res) => {
  try {
    const sessions = await listTranscriptSessions();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list transcript sessions' });
  }
});

// DELETE /api/transcripts - Delete transcript sessions by IDs
transcriptsRouter.delete('/', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }
    const deleted = await deleteBatchTranscriptSessions(ids);
    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transcript sessions' });
  }
});

// DELETE /api/transcripts/:sessionId - Delete a specific transcript session
transcriptsRouter.delete('/:sessionId', async (req, res) => {
  try {
    const success = await deleteTranscriptSession(req.params.sessionId);
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

// GET /api/transcripts/:sessionId - Get messages for a specific session
transcriptsRouter.get('/:sessionId', async (req, res) => {
  try {
    const messages = await getTranscriptMessages(req.params.sessionId);
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
