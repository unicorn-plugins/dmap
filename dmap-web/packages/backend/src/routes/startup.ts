import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { DMAP_PROJECT_DIR } from '../config.js';
import { initSSE } from '../middleware/sse-handler.js';

const execAsync = promisify(exec);

export const startupRouter = Router();

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
const LOCAL_BIN = path.join(HOME_DIR, '.local', 'bin');

const SHELL = process.env.SHELL || '/bin/sh';
const extendedEnv = {
  ...process.env,
  PATH: `${LOCAL_BIN}${path.delimiter}${process.env.PATH || ''}`,
};

async function runCommand(cmd: string, timeoutMs = 10000, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execAsync(cmd, { timeout: timeoutMs, shell: SHELL, env: extendedEnv, ...(cwd && { cwd }) });
  } catch (error: unknown) {
    const e = error as Record<string, unknown>;
    return { stdout: (e.stdout as string) || '', stderr: (e.stderr as string) || (e instanceof Error ? e.message : String(error)) || '' };
  }
}

// Parse `claude plugin list` output into plugin names + CLI availability
async function getInstalledPlugins(): Promise<{ plugins: string[]; cliAvailable: boolean }> {
  const { stdout, stderr } = await runCommand('claude plugin list', 15000);
  const notFound = stderr.includes('not found') || stderr.includes('not recognized') ||
    stdout.includes('not found') || stdout.includes('not recognized');
  const matches = [...stdout.matchAll(/❯\s+(\S+)/g)];
  return { plugins: matches.map((m) => m[1]), cliAvailable: !notFound };
}

// Parse `claude plugin marketplace list` output into marketplace names
async function getMarketplaces(): Promise<string[]> {
  const { stdout } = await runCommand('claude plugin marketplace list', 15000);
  const matches = [...stdout.matchAll(/❯\s+(\S+)/g)];
  return matches.map((m) => m[1]);
}

// --- Check functions ---

async function checkNodeVersion(): Promise<CheckResult> {
  const { stdout } = await runCommand('node --version');
  const version = stdout.trim().replace('v', '');
  const major = parseInt(version.split('.')[0], 10);
  if (major >= 18) {
    return { id: 'node', label: 'Node.js', status: 'pass', detail: `v${version}`, fixable: false };
  }
  return { id: 'node', label: 'Node.js', status: 'fail', detail: `v${version} — requires 18+ (https://nodejs.org)`, fixable: false };
}

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

function checkClaudeCli(cliAvailable: boolean): CheckResult {
  if (cliAvailable) {
    return { id: 'claude_cli', label: 'Claude Code CLI', status: 'pass', detail: 'Installed', fixable: false };
  }
  return { id: 'claude_cli', label: 'Claude Code CLI', status: 'fail', detail: 'Not installed', fixable: true, fixAction: 'install_claude' };
}

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

async function checkOmc(): Promise<CheckResult> {
  const { stdout, stderr } = await runCommand('oh-my-claudecode --version');
  const output = (stdout || stderr).trim();
  if (output && !output.includes('not found') && !output.includes('not recognized')) {
    return { id: 'omc', label: 'Oh My Claudecode', status: 'pass', detail: output.split('\n')[0], fixable: false };
  }
  return { id: 'omc', label: 'Oh My Claudecode', status: 'fail', detail: 'Not installed', fixable: true, fixAction: 'setup_omc' };
}

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

function checkDmap(marketplaces: string[], plugins: string[]): CheckResult {
  const marketplaceName = 'unicorn';
  const pluginName = 'dmap@unicorn';

  const hasMarketplace = marketplaces.includes(marketplaceName);
  const hasPlugin = plugins.includes(pluginName);

  if (hasMarketplace && hasPlugin) {
    return { id: 'dmap', label: 'DMAP Plugin', status: 'pass', detail: 'Installed', fixable: false };
  }
  if (!hasMarketplace) {
    return { id: 'dmap', label: 'DMAP Plugin', status: 'fail', detail: 'Marketplace not registered', fixable: true, fixAction: 'setup_dmap' };
  }
  return { id: 'dmap', label: 'DMAP Plugin', status: 'fail', detail: 'Not installed', fixable: true, fixAction: 'install_dmap' };
}

// --- Routes ---

// GET /api/startup-check (SSE streaming, ordered)
startupRouter.get('/', async (_req, res) => {
  initSSE(res);

  // Fixed order: checks are emitted in this sequence regardless of completion order
  const TOTAL = 7;
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
  const marketplacePromise = getMarketplaces();

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
    // 4: Oh My Claudecode
    checkOmc().then((c) => setSlot(4, c)),
    // 5: OMC Setup
    checkOmcSetup().then((c) => setSlot(5, c)),
    // 6: DMAP Plugin (depends on both marketplace + plugin list)
    Promise.all([marketplacePromise, pluginPromise]).then(([mp, { plugins }]) => setSlot(6, checkDmap(mp, plugins))),
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
