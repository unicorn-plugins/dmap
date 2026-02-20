/**
 * 시작 점검 라우트 - DMAP Web 실행 환경 사전 점검
 *
 * 엔드포인트:
 * - GET /api/startup-check: SSE 스트리밍으로 8개 항목 순차 점검 결과 전송
 * - POST /api/startup-check/fix: 실패 항목 자동 수정 실행
 *
 * 점검 항목 (고정 순서):
 * 0. Node.js 버전 (18+)
 * 1. Node Modules (@anthropic-ai/claude-code)
 * 2. Claude Code CLI
 * 3. Claude 인증 상태
 * 4. Oh My Claudecode 설치
 * 5. OMC 설정 (CLAUDE.md 내 OMC 구성)
 * 6. DMAP 플러그인 (cache 디렉토리)
 * 7. Model Versions (모델 버전 자동 갱신)
 *
 * 병렬 실행 + 슬롯 기반 순서 보장: 모든 점검을 병렬로 실행하되, 결과는 고정 순서로 SSE 전송
 *
 * @module routes/startup
 */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { DMAP_PROJECT_DIR } from '../config.js';
import { initSSE } from '../middleware/sse-handler.js';
import { runCommand } from '../utils/cli-runner.js';
import { refreshModelVersions } from '../services/model-versions.js';

export const startupRouter = Router();

/** 개별 점검 결과 - fixable: true면 POST /fix로 자동 수정 가능 */
interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  fixable: boolean;
  fixAction?: string;
}

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '';
const CLAUDE_DIR = path.join(HOME_DIR, '.claude');

/** claude plugin list 명령으로 설치된 플러그인 목록 조회 + CLI 가용성 확인 */
async function getInstalledPlugins(): Promise<{ plugins: string[]; cliAvailable: boolean }> {
  const { stdout, stderr } = await runCommand('claude plugin list', 15000);
  // CLI 자체가 없는 경우만 감지 (플러그인 로드 에러의 "not found in marketplace"는 무시)
  const combined = (stderr + '\n' + stdout.split('\n').filter((l) => !l.includes('marketplace')).join('\n')).toLowerCase();
  const notFound = combined.includes('not found') || combined.includes('not recognized');
  const matches = [...stdout.matchAll(/❯\s+(\S+)/g)];
  return { plugins: matches.map((m) => m[1]), cliAvailable: !notFound };
}


// --- Check functions ---

/** Node.js 버전 점검 - 18 이상 필요 */
async function checkNodeVersion(): Promise<CheckResult> {
  const { stdout } = await runCommand('node --version');
  const version = stdout.trim().replace('v', '');
  const major = parseInt(version.split('.')[0], 10);
  if (major >= 18) {
    return { id: 'node', label: 'Node.js', status: 'pass', detail: `v${version}`, fixable: false };
  }
  return { id: 'node', label: 'Node.js', status: 'fail', detail: `v${version} — requires 18+ (https://nodejs.org)`, fixable: false };
}

/** @anthropic-ai/claude-code 패키지 설치 확인 - dmap-web/ 또는 루트 node_modules 탐색 */
async function checkNodeModules(): Promise<CheckResult> {
  const candidates = [
    path.join(DMAP_PROJECT_DIR, 'dmap-web', 'node_modules', '@anthropic-ai', 'claude-code'),
    path.join(DMAP_PROJECT_DIR, 'node_modules', '@anthropic-ai', 'claude-code'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { id: 'node_modules', label: 'Node Modules', status: 'pass', detail: '@anthropic-ai/claude-code', fixable: false };
    }
  }
  return { id: 'node_modules', label: 'Node Modules', status: 'fail', detail: '@anthropic-ai/claude-code not found', fixable: true, fixAction: 'npm_install' };
}

/** Claude Code CLI 설치 확인 */
function checkClaudeCli(cliAvailable: boolean): CheckResult {
  if (cliAvailable) {
    return { id: 'claude_cli', label: 'Claude Code CLI', status: 'pass', detail: 'Installed', fixable: false };
  }
  return { id: 'claude_cli', label: 'Claude Code CLI', status: 'fail', detail: 'Not installed', fixable: true, fixAction: 'install_claude' };
}

/** Claude 인증 상태 확인 - settings.json 존재 + claude --version 실행 가능 여부 */
async function checkClaudeAuth(): Promise<CheckResult> {
  const settingsFile = path.join(CLAUDE_DIR, 'settings.json');
  const hasSettings = fs.existsSync(settingsFile);

  if (!hasSettings) {
    return {
      id: 'claude_auth', label: 'Claude Authentication', status: 'fail',
      detail: 'Run "claude" in terminal to authenticate',
      fixable: false,
    };
  }

  // settings.json이 존재하면 CLI로 인증 상태 재확인
  const { stdout, stderr } = await runCommand('claude --version', 5000);
  const output = (stdout || stderr).trim();
  const isAuthenticated = output.length > 0 && !output.includes('not found') && !output.includes('not recognized');

  if (isAuthenticated) {
    return { id: 'claude_auth', label: 'Claude Authentication', status: 'pass', detail: 'Authenticated', fixable: false };
  }
  return {
    id: 'claude_auth', label: 'Claude Authentication', status: 'fail',
    detail: 'Run "claude" in terminal to authenticate',
    fixable: false,
  };
}

/** Oh My Claudecode 설치 확인 - CLI 또는 claude plugin list에서 감지 */
async function checkOmc(plugins: string[]): Promise<CheckResult> {
  // 1차: oh-my-claudecode CLI 확인
  const { stdout, stderr } = await runCommand('oh-my-claudecode --version');
  const output = (stdout || stderr).trim();
  if (output && !output.includes('not found') && !output.includes('not recognized')) {
    return { id: 'omc', label: 'Oh My Claudecode', status: 'pass', detail: output.split('\n')[0], fixable: false };
  }
  // 2차: claude plugin list에서 oh-my-claudecode 플러그인 존재 확인
  if (plugins.some((p) => p.startsWith('oh-my-claudecode'))) {
    return { id: 'omc', label: 'Oh My Claudecode', status: 'pass', detail: 'Installed (plugin)', fixable: false };
  }
  return { id: 'omc', label: 'Oh My Claudecode', status: 'fail', detail: 'Not installed', fixable: true, fixAction: 'setup_omc' };
}

/** OMC 설정 확인 - ~/.claude/CLAUDE.md에 OMC 구성 블록 존재 여부 */
async function checkOmcSetup(): Promise<CheckResult> {
  const claudeMd = path.join(CLAUDE_DIR, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    const content = fs.readFileSync(claudeMd, 'utf-8');
    if (content.includes('# oh-my-claudecode - Intelligent Multi-Agent Orchestration')) {
      return { id: 'omc_setup', label: 'OMC Setup', status: 'pass', detail: 'Configured', fixable: false };
    }
  }
  return {
    id: 'omc_setup', label: 'OMC Setup', status: 'fail',
    detail: 'Run "/oh-my-claudecode:omc-setup" in Claude Code',
    fixable: false,
  };
}

/** DMAP 플러그인 설치 확인 - ~/.claude/plugins/cache/unicorn/dmap 디렉토리의 버전 폴더 탐색 */
function checkDmap(): CheckResult {
  const cachePath = path.join(CLAUDE_DIR, 'plugins', 'cache', 'unicorn', 'dmap');
  if (fs.existsSync(cachePath)) {
    try {
      const entries = fs.readdirSync(cachePath, { withFileTypes: true });
      const versions = entries
        .filter((e) => e.isDirectory() && /^\d+\.\d+\.\d+/.test(e.name))
        .map((e) => e.name)
        .sort();
      if (versions.length > 0) {
        return { id: 'dmap', label: 'DMAP Plugin', status: 'pass', detail: `v${versions[versions.length - 1]}`, fixable: false };
      }
    } catch { /* ignore read errors */ }
  }
  return { id: 'dmap', label: 'DMAP Plugin', status: 'fail', detail: 'Not installed', fixable: true, fixAction: 'setup_dmap' };
}

/** 모델 버전 자동 갱신 — Anthropic API로 최신 모델 ID 감지 후 model-versions.json 저장 */
async function checkModelVersions(): Promise<CheckResult> {
  try {
    const versions = await refreshModelVersions();
    const src = versions.source === 'api' ? 'API' : versions.source === 'cached' ? 'cached' : 'default';
    const detail = `${versions.models.sonnet} (${src})`;
    return {
      id: 'model_versions', label: 'Model Versions',
      status: versions.source === 'api' ? 'pass' : 'pass',
      detail, fixable: false,
    };
  } catch {
    return {
      id: 'model_versions', label: 'Model Versions',
      status: 'warning', detail: 'Refresh failed — using defaults', fixable: false,
    };
  }
}

// --- Routes ---

// GET /api/startup-check (SSE streaming, ordered)
startupRouter.get('/', async (_req, res) => {
  initSSE(res);

  // 슬롯 기반 순서 보장: 병렬 완료되는 점검 결과를 고정 순서(0~7)로 SSE 전송
  const TOTAL = 8;
  const slots: (CheckResult | null)[] = new Array(TOTAL).fill(null);
  let nextToEmit = 0;

  const tryFlush = () => {
    while (nextToEmit < TOTAL && slots[nextToEmit] !== null) {
      res.write(`data: ${JSON.stringify({ type: 'check', check: slots[nextToEmit] })}\n\n`);
      nextToEmit++;
    }
  };

  const setSlot = (index: number, check: CheckResult) => {
    slots[index] = check;
    tryFlush();
  };

  // Data fetchers (shared by dependent checks)
  const pluginPromise = getInstalledPlugins();

  // Fire all checks in parallel, each writes to its fixed slot
  await Promise.all([
    // 0: Node.js
    checkNodeVersion().then((c) => setSlot(0, c)),
    // 1: Node Modules
    checkNodeModules().then((c) => setSlot(1, c)),
    // 2: Claude Code CLI (depends on plugin list)
    pluginPromise.then(({ cliAvailable }) => setSlot(2, checkClaudeCli(cliAvailable))),
    // 3: Claude Authentication
    checkClaudeAuth().then((c) => setSlot(3, c)),
    // 4: Oh My Claudecode (depends on plugin list)
    pluginPromise.then(({ plugins }) => checkOmc(plugins)).then((c) => setSlot(4, c)),
    // 5: OMC Setup
    checkOmcSetup().then((c) => setSlot(5, c)),
    // 6: DMAP Plugin (cache directory check)
    Promise.resolve(setSlot(6, checkDmap())),
    // 7: Model Versions (자동 갱신)
    checkModelVersions().then((c) => setSlot(7, c)),
  ]);

  const allPassed = slots.every((c) => c !== null && c.status !== 'fail');
  res.write(`data: ${JSON.stringify({ type: 'done', allPassed })}\n\n`);
  res.end();
});

// POST /api/startup-check/fix
startupRouter.post('/fix', async (req, res) => {
  const { action } = req.body as { action: string };

  switch (action) {
    case 'npm_install': {
      const cwd = path.join(DMAP_PROJECT_DIR, 'dmap-web');
      const { stdout, stderr } = await runCommand('npm install', 120000, cwd);
      res.json({ success: !stderr.includes('ERR'), detail: stdout || stderr });
      break;
    }
    case 'install_claude': {
      const { stdout, stderr } = await runCommand('npm install -g @anthropic-ai/claude-code', 120000);
      res.json({ success: !stderr.includes('ERR'), detail: stdout || stderr });
      break;
    }
    // OMC: marketplace add → plugin install
    case 'setup_omc': {
      const { stdout: out1, stderr: err1 } = await runCommand(
        'claude plugin marketplace add Yeachan-Heo/oh-my-claudecode', 30000,
      );
      const alreadyRegistered1 = err1.includes('already') || out1.includes('already');
      if (err1.includes('error') && !alreadyRegistered1) {
        res.json({ success: false, detail: err1 });
        break;
      }
      const { stdout: out2, stderr: err2 } = await runCommand(
        'claude plugin install oh-my-claudecode@omc', 60000,
      );
      res.json({ success: !err2.includes('error'), detail: (out1 + '\n' + out2).trim() || err2 });
      break;
    }
    case 'install_omc': {
      const { stdout, stderr } = await runCommand('claude plugin install oh-my-claudecode@omc', 60000);
      res.json({ success: !stderr.includes('error'), detail: stdout || stderr });
      break;
    }
    // DMAP: marketplace add → plugin install
    case 'setup_dmap': {
      const { stdout: out1, stderr: err1 } = await runCommand(
        'claude plugin marketplace add unicorn-plugins/dmap', 30000,
      );
      const alreadyRegistered2 = err1.includes('already') || out1.includes('already');
      if (err1.includes('error') && !alreadyRegistered2) {
        res.json({ success: false, detail: err1 });
        break;
      }
      const { stdout: out2, stderr: err2 } = await runCommand(
        'claude plugin install dmap@unicorn', 60000,
      );
      res.json({ success: !err2.includes('error'), detail: (out1 + '\n' + out2).trim() || err2 });
      break;
    }
    case 'install_dmap': {
      const { stdout, stderr } = await runCommand('claude plugin install dmap@unicorn', 60000);
      res.json({ success: !stderr.includes('error'), detail: stdout || stderr });
      break;
    }
    default:
      res.status(400).json({ success: false, detail: `Unknown action: ${action}` });
  }
});
