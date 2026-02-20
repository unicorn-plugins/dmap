/**
 * 플러그인 관리자 - DMAP 플러그인의 등록/해제/조회를 관리
 *
 * 플러그인 구조:
 * - 기본 DMAP 플러그인: DMAP_PROJECT_DIR (항상 첫 번째, 삭제 불가)
 * - 외부 플러그인: plugins.json에 등록된 프로젝트 경로 목록
 *
 * 플러그인 디렉토리 요구사항:
 * - .claude-plugin/plugin.json (name, version, description)
 * - skills/ 디렉토리 (SKILL.md 파일 포함)
 * - .dmap/setup-completed (설정 완료 마커)
 *
 * @module plugin-manager
 */
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import path from 'path';
import { DMAP_PROJECT_DIR, DATA_DIR } from '../config.js';
import type { PluginInfo } from '@dmap-web/shared';
import { runCommand } from '../utils/cli-runner.js';

const PLUGINS_FILE = path.join(DATA_DIR, 'plugins.json');

/** plugins.json에 저장되는 플러그인 엔트리 - 플러그인 소스 경로 + 작업 디렉토리 + 다국어 표시명 */
interface StoredPlugin {
  projectDir: string;
  workingDir?: string;
  displayNames: { ko: string; en: string };
}

/** 플러그인 디렉토리에서 .claude-plugin/plugin.json 읽기 - 메타데이터(name, version, description) 추출 */
// Read plugin.json from a plugin directory
async function readPluginJson(projectDir: string): Promise<{ name: string; version: string; description: string } | null> {
  try {
    const raw = await readFile(path.join(projectDir, '.claude-plugin', 'plugin.json'), 'utf-8');
    const json = JSON.parse(raw);
    return {
      name: json.name || path.basename(projectDir),
      version: json.version || '0.0.0',
      description: json.description || '',
    };
  } catch {
    return null;
  }
}

/** 플러그인 디렉토리 유효성 검증 - 디렉토리 존재 + plugin.json + skills/ 디렉토리 확인 */
// Validate a plugin directory
export async function validatePluginDir(projectDir: string): Promise<{ valid: boolean; error?: string; name?: string }> {
  try {
    await access(projectDir);
  } catch {
    return { valid: false, error: 'directory_not_found' };
  }

  const pluginJson = await readPluginJson(projectDir);
  if (!pluginJson) {
    return { valid: false, error: 'no_plugin_json' };
  }

  try {
    await access(path.join(projectDir, 'skills'));
  } catch {
    return { valid: false, error: 'no_skills_dir' };
  }

  return { valid: true, name: pluginJson.name };
}

/** 플러그인 목록을 plugins.json에서 로드 - 구 형식(string[]) → 신 형식(StoredPlugin[]) 자동 마이그레이션 */
// Load registered plugins from plugins.json
async function loadRegisteredPlugins(): Promise<StoredPlugin[]> {
  try {
    const raw = await readFile(PLUGINS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // Migrate old format (string[]) to new format (StoredPlugin[])
    return data.map((item: unknown) =>
      typeof item === 'string'
        ? { projectDir: item, displayNames: { ko: path.basename(item), en: path.basename(item) } }
        : item as StoredPlugin,
    );
  } catch {
    return [];
  }
}

/** 플러그인 목록을 plugins.json에 저장 */
// Save registered plugins
async function saveRegisteredPlugins(plugins: StoredPlugin[]): Promise<void> {
  await writeFile(PLUGINS_FILE, JSON.stringify(plugins, null, 2), 'utf-8');
}

/** 전체 플러그인 목록 반환 - DMAP 기본 플러그인(항상 첫 번째) + 등록된 외부 플러그인 */
// Get all plugins (DMAP default + registered)
export async function getAllPlugins(): Promise<PluginInfo[]> {
  const plugins: PluginInfo[] = [];

  // Default DMAP plugin (always first)
  const dmapJson = await readPluginJson(DMAP_PROJECT_DIR);
  plugins.push({
    id: dmapJson?.name || 'dmap',
    name: dmapJson?.name || 'dmap',
    displayNames: { ko: 'DMAP 빌더', en: 'DMAP Builder' },
    description: dmapJson?.description || '',
    version: dmapJson?.version || '0.0.0',
    projectDir: DMAP_PROJECT_DIR,
  });

  // Registered plugins
  const registeredPlugins = await loadRegisteredPlugins();
  for (const entry of registeredPlugins) {
    // Skip if same as DMAP dir
    if (path.resolve(entry.projectDir) === path.resolve(DMAP_PROJECT_DIR)) continue;

    const json = await readPluginJson(entry.projectDir);
    const fallbackName = path.basename(entry.projectDir);
    plugins.push({
      id: json?.name || fallbackName,
      name: json?.name || fallbackName,
      displayNames: entry.displayNames,
      description: json?.description || '',
      version: json?.version || '0.0.0',
      projectDir: entry.projectDir,
      workingDir: entry.workingDir,
    });
  }

  return plugins;
}

/** 새 플러그인 등록 - 유효성 검증 + 중복 체크(경로 및 이름) + plugins.json에 추가 */
// Add a plugin
export async function addPlugin(
  projectDir: string,
  displayNames: { ko: string; en: string },
): Promise<PluginInfo> {
  const resolved = path.resolve(projectDir);

  // Validate
  const validation = await validatePluginDir(resolved);
  if (!validation.valid) {
    throw new Error(validation.error || 'invalid_plugin');
  }

  // Check duplicate directory
  const existing = await getAllPlugins();
  if (existing.some((p) => path.resolve(p.projectDir) === resolved)) {
    throw new Error('already_registered');
  }

  // Check duplicate name
  const json = await readPluginJson(resolved);
  if (!json) throw new Error('no_plugin_json');
  if (existing.some((p) => p.id === json.name)) {
    throw new Error('already_registered');
  }

  // Save
  const storedPlugins = await loadRegisteredPlugins();
  storedPlugins.push({ projectDir: resolved, displayNames });
  await saveRegisteredPlugins(storedPlugins);

  return {
    id: json.name,
    name: json.name,
    displayNames,
    description: json.description,
    version: json.version,
    projectDir: resolved,
  };
}

/** 플러그인 등록 해제 - 기본 DMAP 플러그인은 삭제 불가 */
// Remove a plugin
export async function removePlugin(pluginId: string): Promise<void> {
  const plugins = await getAllPlugins();
  const plugin = plugins.find((p) => p.id === pluginId);

  if (!plugin) throw new Error('not_found');
  if (path.resolve(plugin.projectDir) === path.resolve(DMAP_PROJECT_DIR)) {
    throw new Error('cannot_remove_default');
  }

  const storedPlugins = await loadRegisteredPlugins();
  const filtered = storedPlugins.filter((p) => path.resolve(p.projectDir) !== path.resolve(plugin.projectDir));
  await saveRegisteredPlugins(filtered);
}

/** 외부 플러그인의 workingDir 변경 - projectDir(플러그인 소스)은 변경하지 않음 */
export async function updateWorkingDir(pluginId: string, newWorkingDir: string): Promise<void> {
  const resolved = path.resolve(newWorkingDir);

  const plugins = await getAllPlugins();
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) throw new Error('not_found');
  if (path.resolve(plugin.projectDir) === path.resolve(DMAP_PROJECT_DIR)) {
    throw new Error('cannot_update_default');
  }

  const storedPlugins = await loadRegisteredPlugins();
  const idx = storedPlugins.findIndex((p) => path.resolve(p.projectDir) === path.resolve(plugin.projectDir));
  if (idx === -1) throw new Error('not_found');

  storedPlugins[idx].workingDir = resolved;
  await saveRegisteredPlugins(storedPlugins);
}

/** pluginId → projectDir 변환 (플러그인 소스 경로) - 스킬/메뉴/에이전트 조회용 */
export async function resolveProjectDir(pluginId?: string): Promise<string> {
  if (!pluginId) return DMAP_PROJECT_DIR;

  const plugins = await getAllPlugins();
  const plugin = plugins.find((p) => p.id === pluginId);
  return plugin?.projectDir || DMAP_PROJECT_DIR;
}

/** pluginId → workingDir 변환 (작업 디렉토리) - Claude SDK cwd, 트랜스크립트 저장 등 실행용 */
export async function resolveWorkingDir(pluginId?: string): Promise<string> {
  if (!pluginId) return DMAP_PROJECT_DIR;

  const plugins = await getAllPlugins();
  const plugin = plugins.find((p) => p.id === pluginId);
  return plugin?.workingDir || plugin?.projectDir || DMAP_PROJECT_DIR;
}

/** 플러그인 초기 설정 완료 여부 확인 - .dmap/setup-completed 마커 파일 존재 여부 */
// Check if plugin setup has been completed
export async function isSetupCompleted(projectDir: string): Promise<boolean> {
  try {
    await access(path.join(projectDir, '.dmap', 'setup-completed'));
    return true;
  } catch {
    return false;
  }
}

/** 플러그인 초기 설정 완료 마킹 - .dmap/setup-completed 파일 생성 */
// Mark plugin setup as completed
export async function markSetupCompleted(projectDir: string): Promise<void> {
  const dmapDir = path.join(projectDir, '.dmap');
  await mkdir(dmapDir, { recursive: true });
  await writeFile(path.join(dmapDir, 'setup-completed'), new Date().toISOString(), 'utf-8');
}

// --- CLI 기반 플러그인 설치 ---

/** GitHub org/repo 형식 검증 - CLI 인젝션 방지 */
const GITHUB_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function validateOrgRepo(orgRepo: string): boolean {
  return GITHUB_REPO_PATTERN.test(orgRepo);
}

export interface InstallStep {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface InstallResult {
  success: boolean;
  pluginName: string;
  projectDir?: string;
  steps: InstallStep[];
  error?: string;
  warning?: string;
}

/**
 * known_marketplaces.json에서 marketplace 이름과 installLocation 탐색
 * - GitHub: source.repo 매칭
 * - 로컬: source.path 매칭
 */
async function findMarketplaceEntry(
  type: 'github' | 'local',
  source: string,
): Promise<{ marketplaceName: string; installLocation: string } | null> {
  try {
    const HOME = process.env.HOME || process.env.USERPROFILE || '';
    const knownPath = path.join(HOME, '.claude', 'plugins', 'known_marketplaces.json');
    const raw = await readFile(knownPath, 'utf-8');
    const known: Record<string, { source: { source: string; repo?: string; path?: string }; installLocation: string }> = JSON.parse(raw);

    for (const [name, entry] of Object.entries(known)) {
      if (type === 'github' && entry.source.source === 'github' && entry.source.repo === source) {
        return { marketplaceName: name, installLocation: entry.installLocation };
      }
      if (type === 'local' && entry.source.source === 'directory' && entry.source.path) {
        if (path.resolve(entry.source.path) === path.resolve(source)) {
          return { marketplaceName: name, installLocation: entry.installLocation };
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * marketplace.json에서 plugin name 추출
 * {installLocation}/.claude-plugin/marketplace.json → plugins[0].name
 */
async function readMarketplacePluginName(installLocation: string): Promise<string | null> {
  try {
    const mjPath = path.join(installLocation, '.claude-plugin', 'marketplace.json');
    const raw = await readFile(mjPath, 'utf-8');
    const mj: { name: string; plugins: Array<{ name: string; source: string }> } = JSON.parse(raw);
    return mj.plugins?.[0]?.name || null;
  } catch { /* ignore */ }
  return null;
}

/** CLI를 통한 플러그인 설치 - marketplace add → 이름 탐색 → plugin install 순차 실행 */
export async function installPluginViaCli(
  type: 'github' | 'local',
  source: string,
): Promise<InstallResult> {
  const steps: InstallStep[] = [];

  // Step A: marketplace add (또는 update)
  // 로컬: cwd를 플러그인 디렉토리로 설정하고 ./ 사용 (Windows 경로 호환성)
  const addSource = type === 'github' ? source : './';
  const addCwd = type === 'local' ? source : undefined;

  const addCmd = `claude plugin marketplace add ${addSource}`;
  const addResult = await runCommand(addCmd, 30000, addCwd);
  steps.push({ command: addCmd, ...addResult });

  const alreadyRegistered = addResult.stderr.includes('already') || addResult.stdout.includes('already');

  if (addResult.exitCode !== 0 && !alreadyRegistered) {
    return { success: false, pluginName: '', steps, error: addResult.stderr || 'marketplace add failed' };
  }

  // Step B: known_marketplaces.json에서 marketplace 이름 + installLocation 탐색
  const entry = await findMarketplaceEntry(type, source);
  const marketplaceName = entry?.marketplaceName || (type === 'github' ? source.split('/')[1] || '' : '');

  // already registered인 경우 → marketplace update
  if (alreadyRegistered) {
    const updateCmd = `claude plugin marketplace update ${marketplaceName}`;
    const updateResult = await runCommand(updateCmd, 30000);
    steps.push({ command: updateCmd, ...updateResult });
  }

  // Step C: marketplace.json에서 plugin name 탐색
  let pluginName = '';
  if (entry?.installLocation) {
    pluginName = await readMarketplacePluginName(entry.installLocation) || '';
  }
  // 폴백: 로컬은 plugin.json에서, GitHub은 repo 이름에서
  if (!pluginName) {
    if (type === 'local') {
      const json = await readPluginJson(source);
      pluginName = json?.name || path.basename(source);
    } else {
      pluginName = source.split('/')[1] || '';
    }
  }

  // Step D: plugin install (또는 update)
  const installCmd = `claude plugin install ${pluginName}@${marketplaceName}`;
  const installResult = await runCommand(installCmd, 60000);
  steps.push({ command: installCmd, ...installResult });

  const alreadyInstalled = installResult.stderr.includes('already') || installResult.stdout.includes('already');

  if (installResult.exitCode !== 0 && !alreadyInstalled) {
    return { success: false, pluginName, steps, error: installResult.stderr || 'plugin install failed' };
  }

  // already installed인 경우 → plugin update
  if (alreadyInstalled) {
    const updateInstallCmd = `claude plugin update ${pluginName}@${marketplaceName}`;
    const updateInstallResult = await runCommand(updateInstallCmd, 60000);
    steps.push({ command: updateInstallCmd, ...updateInstallResult });
  }

  return { success: true, pluginName, projectDir: entry?.installLocation, steps };
}
