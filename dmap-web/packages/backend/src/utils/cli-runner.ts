/**
 * CLI 명령어 실행 유틸리티 - startup.ts에서 추출한 공유 모듈
 * @module utils/cli-runner
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '';
const LOCAL_BIN = path.join(HOME_DIR, '.local', 'bin');

export const SHELL = process.env.SHELL || '/bin/sh';
export const extendedEnv = {
  ...process.env,
  PATH: `${LOCAL_BIN}${path.delimiter}${process.env.PATH || ''}`,
};

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCommand(cmd: string, timeoutMs = 10000, cwd?: string): Promise<RunResult> {
  try {
    const result = await execAsync(cmd, { timeout: timeoutMs, shell: SHELL, env: extendedEnv, ...(cwd && { cwd }) });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as Record<string, unknown>;
    return {
      stdout: (e.stdout as string) || '',
      stderr: (e.stderr as string) || (e instanceof Error ? e.message : String(error)) || '',
      exitCode: typeof e.code === 'number' ? e.code : 1,
    };
  }
}
