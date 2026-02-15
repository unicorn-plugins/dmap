import { Router, Request, Response } from 'express';
import { DMAP_SKILLS } from '@dmap-web/shared';
import type { SkillExecuteRequest, SkillMeta } from '@dmap-web/shared';
import { sessionManager } from '../services/session-manager.js';
import { executeSkill, executePrompt } from '../services/claude-sdk-client.js';
import { initSSE, sendSSE, endSSE } from '../middleware/sse-handler.js';
import { DMAP_PROJECT_DIR } from '../config.js';
import { resolveProjectDir } from '../services/plugin-manager.js';
import fs from 'fs';
import path from 'path';

export const skillsRouter = Router();

// Build dynamic skill list by scanning skills/ directory
function discoverSkills(projectDir: string = DMAP_PROJECT_DIR): SkillMeta[] {
  const skillsDir = path.join(projectDir, 'skills');
  if (!fs.existsSync(skillsDir)) return projectDir === DMAP_PROJECT_DIR ? DMAP_SKILLS : [];

  const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => d.name);

  const dirSet = new Set(dirs);
  const result: SkillMeta[] = [];
  const isDmap = path.resolve(projectDir) === path.resolve(DMAP_PROJECT_DIR);

  if (isDmap) {
    // DMAP plugin: use DMAP_SKILLS ordering and metadata
    for (const known of DMAP_SKILLS) {
      if (dirSet.has(known.name)) {
        result.push(known);
        dirSet.delete(known.name);
      }
    }
  }

  // Fixed category/icon/order mapping for well-known skill names
  const FIXED_SKILLS: Record<string, { category: SkillMeta['category']; icon: string; displayName?: string; order: number }> = {
    'add-ext-skill': { category: 'utility', icon: '➕', displayName: '플러그인 추가', order: 0 },
    'remove-ext-skill': { category: 'utility', icon: '➖', displayName: '플러그인 제거', order: 1 },
    'help': { category: 'utility', icon: '❓', displayName: '도움말', order: 2 },
    'setup': { category: 'setup', icon: '⚙️', displayName: '플러그인 초기설정', order: 0 },
  };
  // Category display order
  const CATEGORY_ORDER: Record<string, number> = { core: 0, utility: 1, setup: 2, external: 3 };

  // Dynamic skills (all skills for non-DMAP, remaining for DMAP)
  for (const name of dirSet) {
    // Hide "core" skill for non-DMAP plugins
    if (!isDmap && name === 'core') continue;

    const isExt = name.startsWith('ext-');
    const fixed = FIXED_SKILLS[name];
    const label = name
      .replace(/^ext-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    result.push({
      name,
      displayName: fixed?.displayName || (isExt ? `${label} 연동` : label),
      description: isExt ? `${label} 외부 플러그인 연동` : label,
      icon: fixed?.icon || (isExt ? '🔗' : '📄'),
      category: fixed?.category || (isExt ? 'external' : 'core'),
      hasApprovalGates: true,
    });
  }

  // Sort: by category order, then by fixed skill order within same category
  if (!isDmap) {
    result.sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      const orderA = FIXED_SKILLS[a.name]?.order ?? 99;
      const orderB = FIXED_SKILLS[b.name]?.order ?? 99;
      return orderA - orderB;
    });
  }

  return result;
}

// GET /api/skills - List all available skills
skillsRouter.get('/', async (req, res) => {
  const pluginId = req.query.pluginId as string | undefined;
  const projectDir = await resolveProjectDir(pluginId);
  res.json(discoverSkills(projectDir));
});

// POST /api/skills/:name/execute - Execute a DMAP skill with SSE streaming
skillsRouter.post('/:name/execute', async (req: Request, res: Response) => {
  const skillName = String(req.params.name);
  const { input, sessionId: existingSessionId, pluginId } = req.body as SkillExecuteRequest;
  const lang = (req.body as any).lang as string | undefined;
  const filePaths = (req.body as any).filePaths as string[] | undefined;

  // Resolve project directory
  const dmapProjectDir = await resolveProjectDir(pluginId);

  // Handle free-form prompt mode (no SKILL.md needed)
  if (skillName === '__prompt__') {
    if (!input?.trim()) {
      res.status(400).json({ error: 'Prompt input is required' });
      return;
    }

    const session = existingSessionId
      ? sessionManager.get(existingSessionId)
      : sessionManager.create(skillName);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    sessionManager.updateMeta(session.id, {
      preview: input?.slice(0, 100),
      pluginId: pluginId || 'dmap',
      skillIcon: '\u26A1',
    });

    initSSE(res);
    req.on('close', () => {
      console.log(`[SSE] Client disconnected from prompt session ${session.id}`);
    });

    try {
      let lastUsage: any = null;
      const result = await executePrompt(
        input,
        dmapProjectDir,
        lang,
        {
          onEvent: (event) => {
            sendSSE(res, event);
            if (event.type === 'usage') lastUsage = event;
          },
          onSessionId: (sdkSessionId) => sessionManager.updateSdkSessionId(session.id, sdkSessionId),
        },
        session.sdkSessionId,
        pluginId,
        filePaths,
      );

      if (lastUsage) {
        sessionManager.updateMeta(session.id, {
          usage: {
            inputTokens: lastUsage.inputTokens,
            outputTokens: lastUsage.outputTokens,
            totalCostUsd: lastUsage.totalCostUsd,
            durationMs: lastUsage.durationMs,
          },
        });
      }

      sendSSE(res, { type: 'complete', sessionId: session.id, fullyComplete: result.fullyComplete });
      sessionManager.setStatus(session.id, result.fullyComplete ? 'completed' : 'waiting');
    } catch (error: any) {
      sendSSE(res, { type: 'error', message: error.message || 'Prompt execution failed' });
      sessionManager.setStatus(session.id, 'error');
    } finally {
      endSSE(res);
    }
    return;
  }

  // Validate skill exists on filesystem
  const skills = discoverSkills(dmapProjectDir);
  const skill = skills.find((s) => s.name === skillName);
  if (!skill) {
    res.status(404).json({ error: `Skill '${skillName}' not found` });
    return;
  }

  // Create or resume session
  const session = existingSessionId
    ? sessionManager.get(existingSessionId)
    : sessionManager.create(skillName);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  sessionManager.updateMeta(session.id, {
    preview: input?.slice(0, 100),
    pluginId: pluginId || 'dmap',
    skillIcon: skill.icon,
  });

  // Setup SSE
  initSSE(res);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[SSE] Client disconnected from session ${session.id}`);
  });

  try {
    let lastUsage: any = null;
    const result = await executeSkill(
      skillName,
      input,
      dmapProjectDir,
      lang,
      {
        onEvent: (event) => {
          sendSSE(res, event);
          if (event.type === 'usage') lastUsage = event;
        },
        onSessionId: (sdkSessionId) => {
          sessionManager.updateSdkSessionId(session.id, sdkSessionId);
        },
      },
      session.sdkSessionId,
      pluginId,
      filePaths,
    );

    if (lastUsage) {
      sessionManager.updateMeta(session.id, {
        usage: {
          inputTokens: lastUsage.inputTokens,
          outputTokens: lastUsage.outputTokens,
          totalCostUsd: lastUsage.totalCostUsd,
          durationMs: lastUsage.durationMs,
        },
      });
    }

    sendSSE(res, { type: 'complete', sessionId: session.id, fullyComplete: result.fullyComplete });
    sessionManager.setStatus(session.id, result.fullyComplete ? 'completed' : 'waiting');
  } catch (error: any) {
    sendSSE(res, {
      type: 'error',
      message: error.message || 'Skill execution failed',
    });
    sessionManager.setStatus(session.id, 'error');
  } finally {
    endSSE(res);
  }
});
