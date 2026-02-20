/**
 * 플러그인 라우트 - 플러그인 CRUD + 에이전트 동기화 + 메뉴 관리 API
 *
 * 엔드포인트:
 * - GET /api/plugins: 전체 플러그인 목록 (setupCompleted 플래그 포함)
 * - POST /api/plugins: 새 플러그인 등록
 * - POST /api/plugins/validate: 플러그인 디렉토리 유효성 검증
 * - POST /api/plugins/:id/sync: 에이전트 동기화 (agents/ 디렉토리 스캔)
 * - GET/PUT /api/plugins/:id/menus: 메뉴 설정 조회/저장
 * - POST /api/plugins/:id/menus/ai-recommend: Claude AI 기반 메뉴 자동 분류
 * - PATCH /api/plugins/:id: 외부 플러그인 projectDir 변경
 * - DELETE /api/plugins/:id: 플러그인 삭제
 *
 * @module routes/plugins
 */
import { Router } from 'express';
import { getAllPlugins, addPlugin, removePlugin, updateWorkingDir, validatePluginDir, resolveProjectDir, isSetupCompleted, installPluginViaCli, validateOrgRepo } from '../services/plugin-manager.js';
import { getDefaultSdkModel } from '../services/model-versions.js';
import { syncPluginAgents, removeRegisteredPlugin, getMenus, saveMenus, generateDefaultMenus, refreshExternalMenus } from '../services/agent-registry.js';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import type { MenuConfig, MenuSubcategory, MenuSkillItem } from '@dmap-web/shared';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Plugins');
let installInProgress = false;

export const pluginsRouter = Router();

// GET /api/plugins - List all registered plugins
pluginsRouter.get('/', async (_req, res) => {
  try {
    const plugins = await getAllPlugins();
    // Inject setupCompleted flag for each plugin
    const enriched = await Promise.all(
      plugins.map(async (p, i) => ({
        ...p,
        setupCompleted: i === 0 ? true : await isSetupCompleted(p.projectDir),
      })),
    );
    res.json(enriched);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/plugins - Add a new plugin
pluginsRouter.post('/', async (req, res) => {
  const { projectDir, displayNames } = req.body as {
    projectDir: string;
    displayNames: { ko: string; en: string };
  };

  if (!projectDir || !displayNames) {
    res.status(400).json({ error: 'projectDir and displayNames are required' });
    return;
  }

  try {
    const plugin = await addPlugin(projectDir, displayNames);
    // Auto-sync plugin agents
    try { syncPluginAgents(plugin.id, plugin.projectDir); } catch { /* ignore sync errors */ }
    res.status(201).json(plugin);
  } catch (error: unknown) {
    const msg = (error as Error).message;
    const status = msg === 'already_registered' ? 409 : 400;
    res.status(status).json({ error: msg });
  }
});

// POST /api/plugins/install - CLI 기반 플러그인 설치 (GitHub 또는 로컬)
pluginsRouter.post('/install', async (req, res) => {
  const { type, source, displayNames } = req.body as {
    type: 'github' | 'local';
    source: string;
    displayNames?: { ko: string; en: string };
  };

  if (!type || !source) {
    res.status(400).json({ error: 'type and source are required' });
    return;
  }

  if (type === 'github' && !validateOrgRepo(source)) {
    res.status(400).json({ error: 'invalid_repo_format' });
    return;
  }

  if (type === 'local') {
    const validation = await validatePluginDir(source);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'invalid_plugin' });
      return;
    }
  }

  if (installInProgress) {
    res.status(429).json({ error: 'install_in_progress' });
    return;
  }

  installInProgress = true;
  try {
    log.info(`Plugin install: type=${type}, source=${source}`);
    const result = await installPluginViaCli(type, source);

    if (!result.success) {
      log.error(`Plugin install failed: ${result.error}`);
      res.status(400).json(result);
      return;
    }

    // CLI 성공 후 plugins.json에도 저장 (GitHub: marketplace installLocation, 로컬: source 경로)
    let warning: string | undefined;
    const pluginDir = result.projectDir || source;
    try {
      const names = displayNames || { ko: result.pluginName, en: result.pluginName };
      await addPlugin(pluginDir, names);
      try { syncPluginAgents(result.pluginName, pluginDir); } catch { /* ignore */ }
    } catch (regError: unknown) {
      const msg = (regError as Error).message;
      if (msg === 'already_registered') {
        log.info('Plugin already in registry, skipping duplicate registration');
      } else {
        warning = 'cli_success_but_registry_failed';
        log.warn(`Registry save failed: ${msg}`);
      }
    }

    log.info(`Plugin install success: ${result.pluginName}`);
    res.status(201).json({ ...result, warning });
  } catch (error: unknown) {
    log.error('Plugin install error:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
    installInProgress = false;
  }
});

// POST /api/plugins/validate - Validate a plugin directory
pluginsRouter.post('/validate', async (req, res) => {
  const { projectDir } = req.body as { projectDir: string };

  if (!projectDir) {
    res.status(400).json({ valid: false, error: 'projectDir is required' });
    return;
  }

  const result = await validatePluginDir(projectDir);
  res.json(result);
});

// POST /api/plugins/:id/sync - Sync plugin agents from local project
pluginsRouter.post('/:id/sync', async (req, res) => {
  try {
    const projectDir = await resolveProjectDir(req.params.id);
    const result = syncPluginAgents(req.params.id, projectDir);
    res.json({ success: true, count: result.count, agents: result.agents });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/plugins/:id/menus - Get menu configuration
pluginsRouter.get('/:id/menus', async (req, res) => {
  try {
    const projectDir = await resolveProjectDir(req.params.id);
    const menus = getMenus(req.params.id, projectDir);
    res.json(menus);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/plugins/:id/menus - Save menu configuration
pluginsRouter.put('/:id/menus', async (req, res) => {
  try {
    const menus = req.body;
    if (!menus || !menus.core) {
      res.status(400).json({ error: 'Invalid menu configuration' });
      return;
    }
    saveMenus(req.params.id, menus);
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/plugins/:id/menus/refresh - 외부 플러그인 메뉴 갱신 (ext-skill 추가/삭제 후 호출)
pluginsRouter.post('/:id/menus/refresh', async (req, res) => {
  try {
    const pluginId = req.params.id;
    const projectDir = await resolveProjectDir(pluginId);
    const menus = refreshExternalMenus(pluginId, projectDir);
    res.json(menus);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/plugins/:id/menus/ai-recommend - AI-powered menu classification
pluginsRouter.post('/:id/menus/ai-recommend', async (req, res) => {
  try {
    const pluginId = req.params.id;
    const { lang: userLang } = req.body as { lang?: string };
    const projectDir = await resolveProjectDir(pluginId);

    // 1. Read all SKILL.md files to build skill info for Claude
    const skillsDir = path.join(projectDir, 'skills');
    if (!existsSync(skillsDir)) {
      res.json(generateDefaultMenus(projectDir));
      return;
    }

    const UTILITY_SKILLS = new Set(['setup', 'add-ext-skill', 'remove-ext-skill', 'help']);
    const CORE_TYPES = new Set(['core', 'planning', 'orchestrator']);

    interface SkillInfo {
      name: string;
      type: string;
      description: string;
      koName: string;
      enName: string;
    }

    const coreSkills: SkillInfo[] = [];
    const utilitySkills: SkillInfo[] = [];
    const externalSkills: SkillInfo[] = [];

    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && existsSync(path.join(skillsDir, d.name, 'SKILL.md')));

    for (const dir of dirs) {
      if (dir.name === 'core') continue;
      const skillMdPath = path.join(skillsDir, dir.name, 'SKILL.md');
      const content = readFileSync(skillMdPath, 'utf-8').replace(/\r\n/g, '\n');

      // Parse frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let fmType = '';
      let description = '';
      let koName = dir.name;
      let enName = dir.name;

      if (fmMatch) {
        const yaml = fmMatch[1];
        const typeMatch = yaml.match(/^type:\s*(.+)$/m);
        const descMatch = yaml.match(/^description:\s*(.+)$/m);
        if (typeMatch) fmType = typeMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (descMatch) description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');

        // Skip non-user-invocable skills
        const uiMatch = yaml.match(/^user-invocable:\s*(.+)$/m);
        if (uiMatch && uiMatch[1].trim() === 'false') continue;

        // Parse i18n
        const i18nKoNameMatch = yaml.match(/ko:\s*\n\s+name:\s*(.+)/);
        const i18nEnNameMatch = yaml.match(/en:\s*\n\s+name:\s*(.+)/);
        if (i18nKoNameMatch) koName = i18nKoNameMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (i18nEnNameMatch) enName = i18nEnNameMatch[1].trim().replace(/^['"]|['"]$/g, '');

        // i18n이 없으면 description을 한글명 fallback으로 사용
        if (!i18nKoNameMatch && description) koName = description;
      }

      // Extract description section from body (after frontmatter)
      const bodyStart = fmMatch ? (fmMatch.index || 0) + fmMatch[0].length : 0;
      const body = content.slice(bodyStart).trim();
      // Get first meaningful paragraph as extended description
      const firstParagraph = body.split('\n\n').find(p => p.trim() && !p.startsWith('#'));
      const extDesc = firstParagraph?.trim() || '';

      const info: SkillInfo = {
        name: dir.name,
        type: fmType,
        description: description || extDesc || dir.name,
        koName,
        enName,
      };

      const isExt = dir.name.startsWith('ext-');
      if (UTILITY_SKILLS.has(dir.name)) {
        utilitySkills.push(info);
      } else if (isExt || fmType === 'external') {
        externalSkills.push(info);
      } else if (CORE_TYPES.has(fmType) || !fmType) {
        coreSkills.push(info);
      } else if (fmType === 'utility' || fmType === 'setup') {
        utilitySkills.push(info);
      } else {
        coreSkills.push(info);
      }
    }

    // 고정 유틸리티 스킬 라벨 (AI 추천 불필요)
    const UTILITY_LABELS: Record<string, { ko: string; en: string }> = {
      'setup': { ko: '플러그인 초기설정', en: 'Plugin Setup' },
      'add-ext-skill': { ko: '플러그인 추가', en: 'Add Plugin' },
      'remove-ext-skill': { ko: '플러그인 제거', en: 'Remove Plugin' },
      'help': { ko: '도움말', en: 'Help' },
    };
    const UTILITY_ORDER = ['setup', 'add-ext-skill', 'remove-ext-skill', 'help'];

    // 고정 유틸리티 vs AI 추천 대상 유틸리티 분리
    const fixedUtility: MenuSkillItem[] = [];
    const nonFixedUtility: SkillInfo[] = [];
    for (const name of UTILITY_ORDER) {
      const found = utilitySkills.find(s => s.name === name);
      if (found) {
        fixedUtility.push({ name: found.name, labels: UTILITY_LABELS[name] || { ko: found.koName, en: found.enName } });
      }
    }
    for (const s of utilitySkills) {
      if (!UTILITY_ORDER.includes(s.name)) {
        nonFixedUtility.push(s);
      }
    }

    // AI 추천 대상 스킬: core + 비고정 유틸리티 + 외부
    const labelOnlySkills = [...nonFixedUtility, ...externalSkills];
    const allAiSkillCount = coreSkills.length + labelOnlySkills.length;

    // AI 추천 대상이 없으면 규칙 기반 폴백
    if (allAiSkillCount === 0) {
      const utility: MenuSkillItem[] = [...fixedUtility];
      const external: MenuSkillItem[] = [];
      res.json({ core: [], utility, external });
      return;
    }

    // core 0-1개이고 라벨 추천 대상도 없으면 AI 불필요
    if (coreSkills.length <= 1 && labelOnlySkills.length === 0) {
      const core: MenuSubcategory[] = coreSkills.length === 1
        ? [{ id: 'default', labels: { ko: '기본', en: 'Default' }, skills: [{ name: coreSkills[0].name, labels: { ko: coreSkills[0].koName, en: coreSkills[0].enName } }] }]
        : [];
      const utility: MenuSkillItem[] = [...fixedUtility];
      const external: MenuSkillItem[] = externalSkills
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => ({ name: s.name, labels: { ko: s.koName, en: s.enName } }));
      res.json({ core, utility, external });
      return;
    }

    // Claude SDK로 core 스킬 분류 + 모든 스킬 라벨 추천 요청
    const coreSkillListForAi = coreSkills.map(s =>
      `- name: "${s.name}", type: "${s.type}", description: "${s.description}"`
    ).join('\n');

    const labelOnlyListForAi = labelOnlySkills.map(s =>
      `- name: "${s.name}", type: "${s.type}", description: "${s.description}"`
    ).join('\n');

    const aiPrompt = `You are a menu classification and naming expert. You have two tasks:

TASK 1: Classify CORE skills into subcategories and generate Korean/English display names.
TASK 2: Generate Korean/English display names for LABEL-ONLY skills (no classification needed).

CORE SKILLS (classify + name):
${coreSkillListForAi || '(none)'}

LABEL-ONLY SKILLS (name only):
${labelOnlyListForAi || '(none)'}

RULES:
1. For CORE skills: Group by purpose/use-case (e.g., "탐색" for exploration, "개발" for development). Each subcategory must have at least 2 skills. If only 1 skill would be in a group, merge with the most related group.
2. Provide Korean (ko) and English (en) names for subcategories. Names should be short nouns (1-2 words).
3. Generate Korean (ko) and English (en) display names for EVERY skill. Read each skill's description carefully and create a meaningful Korean name that reflects its purpose.
4. Korean names MUST be natural Korean nouns (e.g., "개발환경 준비", "코드 리뷰"), NOT English transliterations, NOT the English skill name.
5. All label names MUST be 20 characters or less.
6. Return ONLY valid JSON, no markdown code fences, no explanation.

RESPONSE FORMAT (JSON only):
{
  "subcategories": [
    {
      "id": "unique-id",
      "labels": { "ko": "한글명", "en": "English Name" },
      "skills": [
        { "name": "skill-name", "labels": { "ko": "한글명", "en": "English Name" } }
      ]
    }
  ],
  "labelOnly": [
    { "name": "skill-name", "labels": { "ko": "한글명", "en": "English Name" } }
  ]
}`;

    log.info(`AI recommend: classifying ${coreSkills.length} core + ${labelOnlySkills.length} label-only skills for plugin ${pluginId}`);

    try {
      const { query } = await import('@anthropic-ai/claude-code');
      let aiText = '';

      const conversation = query({
        prompt: aiPrompt,
        options: {
          model: getDefaultSdkModel(),
          maxTurns: 1,
          systemPrompt: 'You are a JSON-only responder. Return only valid JSON without any markdown formatting or explanation.',
          permissionMode: 'bypassPermissions' as const,
        },
      });

      for await (const msg of conversation) {
        const message = msg as Record<string, unknown>;
        if (message.type === 'assistant' && message.message) {
          const m = message.message as { content?: Array<{ type: string; text?: string }> };
          if (m.content) {
            for (const block of m.content) {
              if (block.type === 'text' && block.text) aiText += block.text;
            }
          }
        }
        if (message.type === 'result') {
          const content = message.content as Array<{ type: string; text?: string }> | undefined;
          if (content) {
            for (const block of content) {
              if (block.type === 'text' && block.text) aiText += block.text;
            }
          }
        }
      }

      // Parse JSON from AI response (strip markdown fences if present)
      const jsonStr = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(jsonStr) as {
        subcategories: Array<{ id: string; labels: { ko: string; en: string }; skills: MenuSkillItem[] }>;
        labelOnly?: MenuSkillItem[];
      };

      // core 서브카테고리
      const core: MenuSubcategory[] = (parsed.subcategories || []).map(sub => ({
        id: sub.id,
        labels: sub.labels,
        skills: sub.skills,
      }));

      // AI가 추천한 라벨을 name으로 매핑
      const aiLabelMap = new Map<string, { ko: string; en: string }>();
      for (const item of parsed.labelOnly || []) {
        aiLabelMap.set(item.name, item.labels);
      }

      // utility: 고정 순서 + AI 추천 라벨 적용된 비고정 스킬
      const utility: MenuSkillItem[] = [...fixedUtility];
      for (const s of nonFixedUtility) {
        const aiLabels = aiLabelMap.get(s.name);
        utility.push({ name: s.name, labels: aiLabels || { ko: s.koName, en: s.enName } });
      }

      // external: AI 추천 라벨 적용
      const external: MenuSkillItem[] = externalSkills
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => {
          const aiLabels = aiLabelMap.get(s.name);
          return { name: s.name, labels: aiLabels || { ko: s.koName, en: s.enName } };
        });

      log.info(`AI recommend: created ${core.length} subcategories, ${aiLabelMap.size} label-only for ${pluginId}`);
      res.json({ core, utility, external });
    } catch (aiError) {
      // AI 분류 실패 시 규칙 기반 폴백
      log.warn('AI recommend failed, using default menu:', aiError);
      const core: MenuSubcategory[] = coreSkills.length > 0
        ? [{
            id: 'default',
            labels: { ko: '기본', en: 'Default' },
            skills: coreSkills.map(s => ({ name: s.name, labels: { ko: s.koName, en: s.enName } })),
          }]
        : [];
      const utility: MenuSkillItem[] = [...fixedUtility, ...nonFixedUtility.map(s => ({ name: s.name, labels: { ko: s.koName, en: s.enName } }))];
      const external: MenuSkillItem[] = externalSkills
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => ({ name: s.name, labels: { ko: s.koName, en: s.enName } }));
      res.json({ core, utility, external });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PATCH /api/plugins/:id - 작업 디렉토리(workingDir) 변경
pluginsRouter.patch('/:id', async (req, res) => {
  const { workingDir } = req.body as { workingDir?: string };
  if (!workingDir) {
    res.status(400).json({ error: 'workingDir is required' });
    return;
  }
  try {
    await updateWorkingDir(req.params.id, workingDir);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = (error as Error).message;
    const status = msg === 'not_found' ? 404
      : msg === 'cannot_update_default' ? 403
      : msg === 'already_registered' ? 409 : 400;
    res.status(status).json({ error: msg });
  }
});

// DELETE /api/plugins/:id - Remove a plugin
pluginsRouter.delete('/:id', async (req, res) => {
  try {
    await removePlugin(req.params.id);
    // Auto-remove registered agents
    try { removeRegisteredPlugin(req.params.id); } catch { /* ignore */ }
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = (error as Error).message;
    const status = msg === 'cannot_remove_default' ? 403 : 404;
    res.status(status).json({ error: msg });
  }
});
