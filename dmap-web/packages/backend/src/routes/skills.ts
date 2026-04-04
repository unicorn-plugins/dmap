/**
 * 스킬 라우트 - DMAP 스킬 목록 조회 및 실행 API
 *
 * 엔드포인트:
 * - GET /api/skills: 스킬 목록 조회 (SKILL.md frontmatter 기반 동적 탐색)
 * - POST /api/skills/:name/execute: SSE 스트리밍으로 스킬 실행
 *
 * 스킬 실행 흐름:
 * 1. 세션 생성/재개 → SSE 연결 초기화
 * 2. executeSkill() 호출 (claude-sdk-client)
 * 3. SSE 이벤트 스트리밍 (text/tool/agent/progress/questions/complete)
 * 4. 스킬 체인 감지 시 새 세션 생성 + skill_changed 이벤트 전송
 *
 * @module routes/skills
 */
import { Router, Request, Response } from 'express';
import { DMAP_SKILLS } from '@dmap-web/shared';
import type { SkillExecuteRequest, SkillMeta, SSESkillChangedEvent, SSEUsageEvent } from '@dmap-web/shared';
import { sessionManager } from '../services/session-manager.js';
import { executeSkill, executePrompt, resolvePermissionRequest } from '../services/claude-sdk-client.js';
import { initSSE, sendSSE, endSSE } from '../middleware/sse-handler.js';
import { DMAP_PROJECT_DIR } from '../config.js';
import { resolveProjectDir, resolveWorkingDir, markSetupCompleted } from '../services/plugin-manager.js';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Skills');

export const skillsRouter = Router();

/** 세션별 실행 잠금 - 동일 세션에서 중복 실행 방지, 클라이언트 연결 끊김 시 abort용 */
const activeExecutions = new Map<string, AbortController>();

/**
 * SKILL.md 파일의 YAML frontmatter를 파싱
 *
 * 간이 YAML 파서: 들여쓰기 기반 중첩 객체 지원
 * 인식하는 타입: string, boolean(true/false), 중첩 object
 *
 * @param skillDir - 스킬 디렉토리 경로 (SKILL.md가 있는 위치)
 * @returns 파싱된 frontmatter 객체 또는 null
 */
function parseSkillFrontmatter(skillDir: string): Record<string, unknown> | null {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8').replace(/\r\n/g, '\n');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }];

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const indent = line.search(/\S/);
      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      // Pop stack to find parent at correct indentation
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].obj;

      if (value === '' || value === undefined) {
        // Nested object
        const child: Record<string, unknown> = {};
        parent[key] = child;
        stack.push({ obj: child, indent });
      } else {
        // Scalar value (strip quotes, handle booleans)
        let parsed: unknown = value.replace(/^['"]|['"]$/g, '');
        if (parsed === 'true') parsed = true;
        else if (parsed === 'false') parsed = false;
        parent[key] = parsed;
      }
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * skills/ 디렉토리를 스캔하여 사용 가능한 스킬 목록 생성
 *
 * DMAP 플러그인: DMAP_SKILLS 상수 순서 우선 + 동적 탐색 스킬 추가
 * 외부 플러그인: SKILL.md frontmatter 기반 카테고리 분류 + 정렬
 *
 * 분류 규칙:
 * - well-known 스킬(setup, help 등): 고정 카테고리/아이콘
 * - ext- 접두사: external 카테고리
 * - frontmatter type: router/utility/setup/external
 * - user-invocable: false → 목록에서 제외
 *
 * @param projectDir - 플러그인 프로젝트 경로 (기본: DMAP_PROJECT_DIR)
 */
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
  const CATEGORY_ORDER: Record<string, number> = { router: 0, utility: 1, setup: 2, external: 3 };

  // Dynamic skills (all skills for non-DMAP, remaining for DMAP)
  for (const name of dirSet) {
    // Hide "router" skill for non-DMAP plugins
    if (!isDmap && name === 'router') continue;

    const isExt = name.startsWith('ext-');
    const fixed = FIXED_SKILLS[name];
    const label = name
      .replace(/^ext-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Parse SKILL.md frontmatter for category, i18n
    const frontmatter = parseSkillFrontmatter(path.join(skillsDir, name));

    // Skip non-user-invocable skills
    if (frontmatter?.['user-invocable'] === false) continue;

    const i18n = frontmatter?.i18n as Record<string, Record<string, string>> | undefined;
    const fmCategory = (frontmatter?.type || frontmatter?.category) as SkillMeta['category'] | undefined;

    // Resolve display name from i18n (ko preferred), then frontmatter description
    const i18nDisplayName = i18n?.ko?.name;
    const i18nDescription = i18n?.ko?.description;
    const fmDescription = frontmatter?.description as string | undefined;

    const validCategories = ['router', 'setup', 'utility', 'external'];
    const resolvedCategory = fixed?.category
      || (fmCategory && validCategories.includes(fmCategory) ? fmCategory : undefined)
      || (isExt ? 'external' : 'router');

    result.push({
      name,
      displayName: fixed?.displayName || i18nDisplayName || fmDescription || (isExt ? `${label} 연동` : label),
      description: i18nDescription || fmDescription || (isExt ? `${label} 외부 플러그인 연동` : label),
      icon: fixed?.icon || (isExt ? '🔗' : '📄'),
      category: resolvedCategory,
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
  const { input, sessionId: existingSessionId, pluginId, lang, filePaths } = req.body as SkillExecuteRequest;

  // Resolve directories: projectDir=플러그인 소스(스킬 발견), workingDir=작업 디렉토리(SDK cwd)
  const dmapProjectDir = await resolveProjectDir(pluginId);
  const workingDir = await resolveWorkingDir(pluginId);

  // 자유 프롬프트 모드: SKILL.md 없이 직접 Claude SDK에 프롬프트 전달
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

    // Abort any existing execution for this session
    const existingController = activeExecutions.get(session.id);
    if (existingController) {
      log.info(`Aborting previous execution for prompt session ${session.id}`);
      existingController.abort();
    }
    const abortController = new AbortController();
    activeExecutions.set(session.id, abortController);

    // 클라이언트 연결 끊김 감지 → SDK 실행 abort (리소스 해제)
    req.on('close', () => {
      log.info(`Client disconnected from prompt session ${session.id}, aborting query`);
      abortController.abort();
    });

    try {
      let lastUsage: SSEUsageEvent | null = null;
      const result = await executePrompt(
        input,
        workingDir,
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
        abortController,
      );

      if (lastUsage) {
        // TypeScript can't track callback mutations; cast is safe as lastUsage is set in onEvent
        const u = lastUsage as SSEUsageEvent;
        sessionManager.updateMeta(session.id, {
          usage: {
            inputTokens: u.inputTokens,
            outputTokens: u.outputTokens,
            totalCostUsd: u.totalCostUsd,
            durationMs: u.durationMs,
          },
        });
      }

      if (!abortController.signal.aborted) {
        sendSSE(res, { type: 'complete', sessionId: session.id, fullyComplete: result.fullyComplete });
        sessionManager.setStatus(session.id, result.fullyComplete ? 'completed' : 'waiting');
      } else {
        sessionManager.abortSession(session.id);
      }
    } catch (error: unknown) {
      sendSSE(res, { type: 'error', message: (error as Error).message || 'Prompt execution failed' });
      sessionManager.setStatus(session.id, 'error');
    } finally {
      if (activeExecutions.get(session.id) === abortController) {
        activeExecutions.delete(session.id);
      }
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

  // Abort any existing execution for this session
  const existingController = activeExecutions.get(session.id);
  if (existingController) {
    log.info(`Aborting previous execution for skill session ${session.id}`);
    existingController.abort();
  }
  const abortController = new AbortController();
  activeExecutions.set(session.id, abortController);

  // 클라이언트 연결 끊김 감지 → SDK 실행 abort (리소스 해제)
  req.on('close', () => {
    log.info(`Client disconnected from session ${session.id}, aborting query`);
    abortController.abort();
  });

  try {
    let lastUsage: SSEUsageEvent | null = null;
    let chainDetected = false;
    const result = await executeSkill(
      skillName,
      input,
      workingDir,
      lang,
      {
        onEvent: (event) => {
          // 스킬 체인: 현재 세션 완료 → 새 세션 생성 → skill_changed 이벤트에 newSessionId 주입
          if (event.type === 'skill_changed') {
            const changeEvent = event as SSESkillChangedEvent;
            const targetSkill = skills.find((s) => s.name === changeEvent.newSkillName);

            if (!targetSkill) {
              log.warn(`Skill chain target not found: ${changeEvent.newSkillName}, ignoring`);
              return; // Don't send the event, don't complete old session
            }

            log.info(`Skill chain: ${skillName} → ${changeEvent.newSkillName}`);

            // Complete current session
            sessionManager.setStatus(session.id, 'completed');
            chainDetected = true;

            // Create new session for the chained skill
            const newSession = sessionManager.create(changeEvent.newSkillName);
            sessionManager.updateMeta(newSession.id, {
              preview: changeEvent.chainInput?.slice(0, 100) || `← ${skillName}`,
              pluginId: pluginId || 'dmap',
              skillIcon: targetSkill.icon,
              previousSkillName: skillName,
            });

            // Enrich the event with new session ID before sending
            changeEvent.newSessionId = newSession.id;
          }

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
      abortController,
      session.previousSkillName,
      skills.map(s => ({ name: s.name, description: s.description })),
    );

    if (lastUsage) {
      // TypeScript can't track callback mutations; cast is safe as lastUsage is set in onEvent
      const u = lastUsage as SSEUsageEvent;
      sessionManager.updateMeta(session.id, {
        usage: {
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
          totalCostUsd: u.totalCostUsd,
          durationMs: u.durationMs,
        },
      });
    }

    if (!abortController.signal.aborted) {
      sendSSE(res, { type: 'complete', sessionId: session.id, fullyComplete: result.fullyComplete });
      sessionManager.setStatus(session.id, result.fullyComplete ? 'completed' : 'waiting');
      // setup 스킬 정상 완료 시 .dmap/setup-completed 마커 생성 (재실행 방지)
      if (skillName === 'setup' && result.fullyComplete) {
        markSetupCompleted(dmapProjectDir).catch(() => {});
      }
    } else if (!chainDetected) {
      sessionManager.abortSession(session.id);
    }
  } catch (error: unknown) {
    sendSSE(res, {
      type: 'error',
      message: (error as Error).message || 'Skill execution failed',
    });
    sessionManager.setStatus(session.id, 'error');
  } finally {
    if (activeExecutions.get(session.id) === abortController) {
      activeExecutions.delete(session.id);
    }
    endSSE(res);
  }
});

// POST /api/skills/permission-response - 도구 실행 권한 요청에 대한 사용자 응답
skillsRouter.post('/permission-response', (req: Request, res: Response) => {
  const { requestId, decision, message } = req.body;
  if (!requestId || !['allow', 'deny'].includes(decision)) {
    res.status(400).json({ error: 'Invalid request: requestId and decision (allow|deny) required' });
    return;
  }
  const resolved = resolvePermissionRequest(requestId, decision, message);
  if (!resolved) {
    res.status(404).json({ error: 'No pending permission request found' });
    return;
  }
  res.json({ success: true });
});
