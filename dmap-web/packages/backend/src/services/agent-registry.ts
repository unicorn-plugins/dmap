/**
 * 에이전트 레지스트리 - 플러그인 에이전트의 스캔/등록/로드/메뉴 관리
 *
 * 핵심 기능:
 * 1. scanLocalAgents(): 플러그인 agents/ 디렉토리에서 AGENT.md + agentcard.yaml 파싱
 * 2. skillAgentMap: SKILL.md에서 에이전트 참조를 추출하여 스킬별 필요 에이전트 매핑
 * 3. 선택적 로딩: 현재 실행 스킬에 필요한 에이전트만 full prompt, 나머지는 description-only
 * 4. 메뉴 자동 생성: 스킬을 core/utility/external로 분류하여 MenuConfig 구성
 *
 * 저장소: DATA_DIR/plugins/{pluginId}.json
 *
 * @module agent-registry
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';
import type { OmcAgentDef } from './omc-integration.js';
import type { MenuConfig, MenuSkillItem, MenuSubcategory, SkillMeta } from '@dmap-web/shared';
import { TIER_MODEL_MAP, parseFrontmatterField, parseYamlTier } from './agent-utils.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('AgentRegistry');

const PLUGINS_DIR = path.join(DATA_DIR, 'plugins');

/**
 * 플러그인 레지스트리 데이터 구조 (plugins/{pluginId}.json)
 * @property agents - FQN(pluginId:agentName:agentName) → 에이전트 정의 맵
 * @property skillAgentMap - 스킬명 → 해당 스킬에서 참조하는 에이전트명 배열
 * @property menus - 프론트엔드 사이드바 메뉴 구성
 */
interface RegisteredPlugin {
  pluginName: string;
  registeredAt: string;
  agents: Record<string, { description: string; prompt: string; model: string; disallowedTools?: string[] }>;
  skillAgentMap?: Record<string, string[]>;
  menus?: MenuConfig;
}

/**
 * SKILL.md 본문에서 에이전트 참조를 3중 조건으로 추출.
 * 검출 규칙:
 *   1. 헤딩(#{1,6})에 "Agent: {name}" 존재
 *   2. 해당 섹션 본문에 "**TASK**" 존재
 *   3. 해당 섹션 본문에 "**EXPECTED OUTCOME**" 존재
 * 반환값: pluginId 접두사 없는 에이전트 이름 배열 (예: ["spec-generator"])
 */
function parseAgentReferences(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n');
  const agents: string[] = [];

  const headingPattern = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; index: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(normalized)) !== null) {
    headings.push({ level: match[1].length, text: match[2], index: match.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const agentMatch = heading.text.match(/Agent:\s*(\S+)/);
    if (!agentMatch) continue;

    const agentName = agentMatch[1].replace(/[`()\r,;:]/g, '');

    const sectionStart = heading.index + normalized.slice(heading.index).indexOf('\n') + 1;
    let sectionEnd = normalized.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) {
        sectionEnd = headings[j].index;
        break;
      }
    }
    const sectionBody = normalized.slice(sectionStart, sectionEnd);

    const hasTask = /\*\*TASK\*\*/.test(sectionBody);
    const hasExpectedOutcome = /\*\*EXPECTED OUTCOME\*\*/.test(sectionBody);

    // 3중 조건 충족: 헤딩에 Agent 표기 + 본문에 TASK + EXPECTED OUTCOME
    if (hasTask && hasExpectedOutcome) {
      agents.push(agentName);
    }
  }

  return [...new Set(agents)];
}

/**
 * skills/ 디렉토리의 SKILL.md 파일들을 스캔하여 스킬별 에이전트 참조 맵을 구축.
 */
function extractSkillAgentMap(projectDir: string): Record<string, string[]> {
  const skillsDir = path.join(projectDir, 'skills');
  if (!existsSync(skillsDir)) return {};

  // 각 스킬 디렉토리의 SKILL.md를 읽어 에이전트 참조 추출
  const map: Record<string, string[]> = {};
  const skillSubDirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const dir of skillSubDirs) {
    const skillMdPath = path.join(skillsDir, dir.name, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    const skillContent = readFileSync(skillMdPath, 'utf-8');
    const refs = parseAgentReferences(skillContent);
    if (refs.length > 0) {
      map[dir.name] = refs;
    }
  }

  if (Object.keys(map).length > 0) {
    log.info(`Built skillAgentMap for ${Object.keys(map).length} skills`);
  }

  return map;
}

/**
 * Scan agents from a local plugin project directory.
 * Reads {projectDir}/agents/{agent-name}/AGENT.md + agentcard.yaml
 */
function scanLocalAgents(projectDir: string, pluginId: string): Record<string, OmcAgentDef> {
  const agents: Record<string, OmcAgentDef> = {};
  const agentsDir = path.join(projectDir, 'agents');
  if (!existsSync(agentsDir)) return agents;

  const agentSubDirs = readdirSync(agentsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const agentDir of agentSubDirs) {
    const agentPath = path.join(agentsDir, agentDir.name);
    const agentMd = path.join(agentPath, 'AGENT.md');

    if (!existsSync(agentMd)) continue;

    const mdContent = readFileSync(agentMd, 'utf-8');
    const description = parseFrontmatterField(mdContent, 'description') || agentDir.name;

    let model = 'sonnet';
    const agentCard = path.join(agentPath, 'agentcard.yaml');
    const cardContent = existsSync(agentCard) ? readFileSync(agentCard, 'utf-8') : null;

    if (cardContent) {
      const tier = parseYamlTier(cardContent);
      if (tier && TIER_MODEL_MAP[tier]) {
        model = TIER_MODEL_MAP[tier];
      }
    }

    // Build full prompt: AGENT.md content + agentcard.yaml (if exists)
    let prompt = mdContent;
    if (cardContent) {
      prompt += `\n\n--- agentcard.yaml ---\n${cardContent}`;
    }

    // FQN(Fully Qualified Name): {pluginId}:{agentName}:{agentName} - SDK agents 옵션의 키
    // FQN: {pluginId}:{agent-name}:{agent-name}
    const fqn = `${pluginId}:${agentDir.name}:${agentDir.name}`;
    agents[fqn] = {
      description,
      prompt,
      model,
    };
  }

  return agents;
}

/**
 * 플러그인 에이전트를 로컬 레지스트리에 동기화
 *
 * 흐름: agents/ 디렉토리 스캔 → skillAgentMap 구축 → 메뉴 생성/보존 → JSON 저장
 * 기존 에이전트 파일이 있고 로컬 스캔 결과가 없으면 기존 데이터 보존 (원격 전용 플러그인 지원)
 */
/**
 * Sync plugin agents to local registry.
 * Scans local project directory ({projectDir}/agents/) and saves to dmap-web/plugins/{pluginId}.json
 */
export function syncPluginAgents(pluginId: string, projectDir: string): { count: number; agents: string[] } {
  const scanned = scanLocalAgents(projectDir, pluginId);

  // Skip overwrite if scan found nothing but plugins/{pluginId}.json already exists
  if (Object.keys(scanned).length === 0) {
    const existingFile = path.join(PLUGINS_DIR, `${pluginId}.json`);
    if (existsSync(existingFile)) {
      const existing = loadRegisteredPlugin(pluginId);
      const names = Object.keys(existing);
      log.info(`No local agents found for ${pluginId}, keeping existing ${names.length} agents`);
      return { count: names.length, agents: names };
    }
    return { count: 0, agents: [] };
  }

  const agentEntries: RegisteredPlugin['agents'] = {};
  for (const [fqn, def] of Object.entries(scanned)) {
    agentEntries[fqn] = {
      description: def.description,
      prompt: def.prompt || def.description,
      model: def.model || 'sonnet',
      ...(def.disallowedTools && def.disallowedTools.length > 0 ? { disallowedTools: def.disallowedTools } : {}),
    };
  }

  mkdirSync(PLUGINS_DIR, { recursive: true });

  // skillAgentMap 구축: skills/ 디렉토리에서 SKILL.md 파싱
  const skillAgentMap = extractSkillAgentMap(projectDir);

  // Preserve existing menus or generate default
  const existing = loadPluginData(pluginId);
  const menus = existing?.menus || generateDefaultMenus(projectDir);

  const data: RegisteredPlugin = {
    pluginName: pluginId,
    registeredAt: new Date().toISOString(),
    agents: agentEntries,
    ...(Object.keys(skillAgentMap).length > 0 ? { skillAgentMap } : {}),
    menus,
  };

  writeFileSync(path.join(PLUGINS_DIR, `${pluginId}.json`), JSON.stringify(data, null, 2), 'utf-8');

  const agentNames = Object.keys(agentEntries);
  log.info(`Synced ${agentNames.length} agents for ${pluginId}: ${agentNames.join(', ')}`);
  return { count: agentNames.length, agents: agentNames };
}

/**
 * Load registered agents for a specific plugin from the local registry.
 * Returns SDK-compatible agent definitions.
 *
 * skillName이 주어지면:
 *   - skillAgentMap[skillName]에 해당하는 에이전트만 full prompt 반환
 *   - 나머지 에이전트는 description-only (prompt = description)
 * skillName이 없거나 skillAgentMap에 해당 스킬이 없으면:
 *   - 전체 에이전트를 description-only로 반환 (fallback)
 */
export function loadRegisteredPlugin(pluginId: string, skillName?: string): Record<string, OmcAgentDef> {
  // Primary path: plugins/{pluginId}.json
  const filePath = path.join(PLUGINS_DIR, `${pluginId}.json`);

  // Legacy fallback paths
  const legacyPath1 = path.join(PLUGINS_DIR, pluginId, 'agents.json');
  const legacyPath2 = path.join(DATA_DIR, 'agents', pluginId, 'agents.json');

  let actualPath: string | null = null;
  let isLegacy = false;

  if (existsSync(filePath)) {
    actualPath = filePath;
  } else if (existsSync(legacyPath1)) {
    actualPath = legacyPath1;
    isLegacy = true;
    log.info(`Migrating ${pluginId} from legacy path: plugins/${pluginId}/agents.json → plugins/${pluginId}.json`);
  } else if (existsSync(legacyPath2)) {
    actualPath = legacyPath2;
    isLegacy = true;
    log.info(`Migrating ${pluginId} from legacy path: agents/${pluginId}/agents.json → plugins/${pluginId}.json`);
  }

  if (!actualPath) return {};

  try {
    const raw = readFileSync(actualPath, 'utf-8');
    const data: RegisteredPlugin = JSON.parse(raw);

    // Migrate if loaded from legacy path
    if (isLegacy) {
      mkdirSync(PLUGINS_DIR, { recursive: true });
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      log.info(`Migrated agents for ${pluginId} to new path`);

      // Clean up legacy directories
      const legacyDir1 = path.join(PLUGINS_DIR, pluginId);
      const legacyDir2 = path.join(DATA_DIR, 'agents', pluginId);
      if (existsSync(legacyDir1)) {
        rmSync(legacyDir1, { recursive: true, force: true });
        log.info(`Removed legacy directory: plugins/${pluginId}/`);
      }
      if (existsSync(legacyDir2)) {
        rmSync(legacyDir2, { recursive: true, force: true });
        log.info(`Removed legacy directory: agents/${pluginId}/`);
      }
    }

    const agents: Record<string, OmcAgentDef> = {};

    // 현재 스킬에 필요한 에이전트만 로드 (토큰 절약 + Windows 32KB CLI 한계 대응)
    // skillAgentMap 존재 시: 해당 스킬이 참조하는 에이전트만 full prompt로 포함, 나머지는 제외
    // skillAgentMap 미존재 시: 전체 에이전트를 description-only로 포함 (fallback)
    const skillAgents = skillName && data.skillAgentMap?.[skillName];
    const fullPromptSet = skillAgents ? new Set(skillAgents) : null;

    if (skillName && !fullPromptSet) {
      log.warn(`No skillAgentMap entry for skill "${skillName}", using description-only for all agents`);
    }

    for (const [fqn, entry] of Object.entries(data.agents)) {
      // FQN에서 에이전트명 추출: "pluginId:agentName:agentName" → "agentName"
      const agentName = fqn.split(':')[1] || fqn;

      if (fullPromptSet) {
        // skillAgentMap 있음: 해당 스킬이 참조하는 에이전트만 포함 (나머지 완전 제외)
        if (!fullPromptSet.has(agentName)) continue;
        agents[fqn] = {
          description: entry.description,
          prompt: entry.prompt || entry.description,
          model: entry.model,
          disallowedTools: entry.disallowedTools,
        };
      } else {
        // skillAgentMap 없음: 전체 에이전트를 description-only로 포함 (fallback)
        agents[fqn] = {
          description: entry.description,
          prompt: entry.description,
          model: entry.model,
          disallowedTools: entry.disallowedTools,
        };
      }
    }

    const totalAgents = Object.keys(data.agents).length;
    const loadedAgents = Object.keys(agents).length;
    if (skillName && fullPromptSet) {
      log.info(`Selective load for skill "${skillName}": ${loadedAgents} agents loaded (${totalAgents - loadedAgents} excluded)`);
    }

    return agents;
  } catch (error) {
    log.error(`Failed to load agents for ${pluginId}:`, error);
    return {};
  }
}

/**
 * Remove registered agents for a plugin (called on plugin deletion).
 */
export function removeRegisteredPlugin(pluginId: string): void {
  // Remove primary file: plugins/{pluginId}.json
  const filePath = path.join(PLUGINS_DIR, `${pluginId}.json`);
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
    log.info(`Removed agents file for ${pluginId}: plugins/${pluginId}.json`);
  }

  // Clean up legacy directories if they still exist
  const legacyDir1 = path.join(PLUGINS_DIR, pluginId);
  const legacyDir2 = path.join(DATA_DIR, 'agents', pluginId);

  if (existsSync(legacyDir1)) {
    rmSync(legacyDir1, { recursive: true, force: true });
    log.info(`Removed legacy directory: plugins/${pluginId}/`);
  }
  if (existsSync(legacyDir2)) {
    rmSync(legacyDir2, { recursive: true, force: true });
    log.info(`Removed legacy directory: agents/${pluginId}/`);
  }
}

// ── Menu Management ────────────────────────────────────────────────

/**
 * Parse SKILL.md frontmatter from a skill directory (reused from skills.ts logic).
 */
function parseSkillFrontmatter(skillDir: string): Record<string, unknown> | null {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return null;
  try {
    const content = readFileSync(skillMdPath, 'utf-8').replace(/\r\n/g, '\n');
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

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].obj;

      if (value === '' || value === undefined) {
        const child: Record<string, unknown> = {};
        parent[key] = child;
        stack.push({ obj: child, indent });
      } else {
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
 * 플러그인의 skills/ 디렉토리를 스캔하여 메뉴 분류
 *
 * 분류 규칙:
 * - core: SKILL.md frontmatter type이 core/planning/orchestrator (또는 기본값)
 * - utility: type이 utility/setup 또는 well-known 유틸리티 스킬(setup, help 등)
 * - external: ext- 접두사 또는 type이 external
 * - core 스킬 중 'core'(시스템 레벨)는 메뉴에서 제외
 *
 * 라벨 우선순위: i18n > description > 스킬 디렉토리명
 */
/**
 * Discover skills from a plugin project directory and return SkillMeta-like info.
 */
/**
 * Discover skills from a plugin and classify into menu categories.
 *
 * Category rules (from SKILL.md frontmatter type):
 * - core, planning, orchestrator → core
 * - utility, setup → utility (fixed order: setup, add-ext-skill, remove-ext-skill, help)
 * - external (or ext-* prefix) → external (alphabetical)
 *
 * Labels: i18n > description > skill name
 */
function discoverSkillsForMenus(projectDir: string): Array<{
  name: string;
  category: 'core' | 'utility' | 'external';
  labels: { ko: string; en: string };
}> {
  const skillsDir = path.join(projectDir, 'skills');
  if (!existsSync(skillsDir)) return [];

  const dirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(path.join(skillsDir, d.name, 'SKILL.md')));

  const skills: Array<{
    name: string;
    category: 'core' | 'utility' | 'external';
    labels: { ko: string; en: string };
  }> = [];

  // Well-known utility skills (always go to utility regardless of frontmatter type)
  const UTILITY_SKILLS = new Set(['setup', 'add-ext-skill', 'remove-ext-skill', 'help']);
  // Types that map to core category
  const CORE_TYPES = new Set(['core', 'planning', 'orchestrator']);

  for (const dir of dirs) {
    if (dir.name === 'core') continue; // skip system-level core skill

    const fm = parseSkillFrontmatter(path.join(skillsDir, dir.name));
    const i18n = fm?.i18n as Record<string, Record<string, string>> | undefined;
    if (fm?.['user-invocable'] === false) continue;

    const isExt = dir.name.startsWith('ext-');
    const fmType = (fm?.type || fm?.category) as string | undefined;
    const description = (fm?.description as string) || '';

    // Determine category
    let category: 'core' | 'utility' | 'external';
    if (UTILITY_SKILLS.has(dir.name)) {
      category = 'utility';
    } else if (isExt || fmType === 'external') {
      category = 'external';
    } else if (fmType && CORE_TYPES.has(fmType)) {
      category = 'core';
    } else if (fmType === 'utility' || fmType === 'setup') {
      category = 'utility';
    } else {
      category = 'core'; // default
    }

    // Labels: prefer i18n, fallback to description (ko) / skill name (en)
    // 메뉴 라벨은 20자 이내로 제한
    const MAX_LABEL_LENGTH = 20;
    const koName = (i18n?.ko?.name || description || dir.name).slice(0, MAX_LABEL_LENGTH);
    const enName = (i18n?.en?.name || dir.name).slice(0, MAX_LABEL_LENGTH);

    skills.push({ name: dir.name, category, labels: { ko: koName, en: enName } });
  }

  return skills;
}

/**
 * Generate default MenuConfig from discovered skills.
 *
 * Rules:
 * - core: all core skills in a single "default" subcategory (use AI recommend or manual edit to reorganize)
 * - utility: fixed order (setup → other setup/utility → add-ext-skill → remove-ext-skill → help)
 * - external: alphabetical by name
 */
export function generateDefaultMenus(projectDir: string): MenuConfig {
  const skills = discoverSkillsForMenus(projectDir);

  const coreSkills: MenuSkillItem[] = [];
  const utilityMap: MenuSkillItem[] = [];
  const externalSkills: MenuSkillItem[] = [];

  for (const skill of skills) {
    const item: MenuSkillItem = { name: skill.name, labels: skill.labels };

    switch (skill.category) {
      case 'core':
        coreSkills.push(item);
        break;
      case 'utility':
        utilityMap.push(item);
        break;
      case 'external':
        externalSkills.push(item);
        break;
    }
  }

  // Core: wrap in a single default subcategory
  const core: MenuSubcategory[] = [];
  if (coreSkills.length > 0) {
    core.push({
      id: 'default',
      labels: { ko: '기본', en: 'General' },
      skills: coreSkills,
    });
  }

  // 유틸리티 고정 라벨 (SKILL.md i18n보다 우선)
  const UTILITY_LABELS: Record<string, { ko: string; en: string }> = {
    'setup': { ko: '플러그인 초기설정', en: 'Plugin Setup' },
    'add-ext-skill': { ko: '플러그인 추가', en: 'Add Plugin' },
    'remove-ext-skill': { ko: '플러그인 제거', en: 'Remove Plugin' },
    'help': { ko: '도움말', en: 'Help' },
  };

  // 유틸리티 메뉴 고정 순서: setup → 기타 → add-ext-skill → remove-ext-skill → help
  const UTILITY_HEAD = ['setup'];
  const UTILITY_TAIL = ['add-ext-skill', 'remove-ext-skill', 'help'];
  const fixedSet = new Set([...UTILITY_HEAD, ...UTILITY_TAIL]);
  const utility: MenuSkillItem[] = [];

  for (const name of UTILITY_HEAD) {
    const found = utilityMap.find(s => s.name === name);
    if (found) utility.push({ ...found, labels: UTILITY_LABELS[name] || found.labels });
  }
  // Other utility skills (not in fixed list), alphabetically
  const others = utilityMap.filter(s => !fixedSet.has(s.name)).sort((a, b) => a.name.localeCompare(b.name));
  utility.push(...others);
  for (const name of UTILITY_TAIL) {
    const found = utilityMap.find(s => s.name === name);
    if (found) utility.push({ ...found, labels: UTILITY_LABELS[name] || found.labels });
  }

  // External: alphabetical
  externalSkills.sort((a, b) => a.name.localeCompare(b.name));

  return { core, utility, external: externalSkills };
}

/**
 * Load raw plugin data (not agent defs).
 */
function loadPluginData(pluginId: string): RegisteredPlugin | null {
  const filePath = path.join(PLUGINS_DIR, `${pluginId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save raw plugin data.
 */
function savePluginData(pluginId: string, data: RegisteredPlugin): void {
  mkdirSync(PLUGINS_DIR, { recursive: true });
  writeFileSync(path.join(PLUGINS_DIR, `${pluginId}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Get menus for a plugin. Generates default if missing.
 */
export function getMenus(pluginId: string, projectDir: string): MenuConfig {
  const data = loadPluginData(pluginId);
  if (data?.menus) return data.menus;

  // Generate and persist
  const menus = generateDefaultMenus(projectDir);
  if (data) {
    data.menus = menus;
    savePluginData(pluginId, data);
    log.info(`Generated default menus for ${pluginId}`);
  }
  return menus;
}

/**
 * 외부 플러그인 메뉴 갱신 - 디스크에서 스킬을 재스캔하여 external 카테고리만 업데이트
 *
 * core/utility 카테고리는 사용자 커스터마이징을 보존하고,
 * external 카테고리만 현재 skills/ 디렉토리 상태로 동기화.
 * add-ext-skill / remove-ext-skill 실행 후 호출.
 */
export function refreshExternalMenus(pluginId: string, projectDir: string): MenuConfig {
  const data = loadPluginData(pluginId);
  const currentSkills = discoverSkillsForMenus(projectDir);

  // 기존 사용자 커스텀 라벨 보존을 위한 맵 구성
  const existingLabels = new Map(
    data?.menus?.external?.map(s => [s.name, s.labels]) || [],
  );

  // 디스크에서 현재 external 스킬 목록 구성 (기존 라벨 우선, 신규 스킬만 SKILL.md 기본 라벨 사용)
  const freshExternal: MenuSkillItem[] = currentSkills
    .filter(s => s.category === 'external')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => ({ name: s.name, labels: existingLabels.get(s.name) || s.labels }));

  if (data?.menus) {
    // core/utility 보존, external만 갱신
    data.menus.external = freshExternal;
    savePluginData(pluginId, data);
    log.info(`Refreshed external menus for ${pluginId}: ${freshExternal.map(s => s.name).join(', ') || '(none)'}`);
    return data.menus;
  }

  // 기존 메뉴 없으면 전체 기본 메뉴 생성
  const menus = generateDefaultMenus(projectDir);
  if (data) {
    data.menus = menus;
    savePluginData(pluginId, data);
    log.info(`Generated default menus for ${pluginId} (no prior menus)`);
  }
  return menus;
}

/**
 * Save menus for a plugin (preserves agents and other data).
 */
export function saveMenus(pluginId: string, menus: MenuConfig): void {
  const data = loadPluginData(pluginId);
  if (!data) {
    log.warn(`Cannot save menus: plugin ${pluginId} not found`);
    return;
  }
  data.menus = menus;
  savePluginData(pluginId, data);
  log.info(`Saved menus for ${pluginId}`);
}
