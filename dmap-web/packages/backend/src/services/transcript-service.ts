import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createReadStream } from 'fs';
import readline from 'readline';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Transcript');

// ── sessions-index.json 타입 ──

/** Claude Code sessions-index.json 엔트리 */
interface SessionsIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary?: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch?: string;
  projectPath?: string;
  isSidechain?: boolean;
}

/** Claude Code sessions-index.json 최상위 구조 */
interface SessionsIndex {
  version: number;
  entries: SessionsIndexEntry[];
}

// ── sessions-index.json 헬퍼 ──

/** sessions-index.json 경로 반환 */
function getSessionsIndexPath(projectDir: string): string {
  const transcriptDir = getTranscriptDir(projectDir);
  return path.join(transcriptDir, 'sessions-index.json');
}

/** sessions-index.json 읽기 (없으면 null 반환) */
async function loadSessionsIndex(projectDir: string): Promise<SessionsIndex | null> {
  try {
    const data = await fs.readFile(getSessionsIndexPath(projectDir), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** sessions-index.json 저장 */
async function saveSessionsIndex(projectDir: string, index: SessionsIndex): Promise<void> {
  await fs.writeFile(getSessionsIndexPath(projectDir), JSON.stringify(index, null, 2), 'utf-8');
}

// ── 타이틀 오버라이드 (dmap 전용 백업) ──

/**
 * 타이틀 오버라이드 파일 경로 반환
 * sessions-index.json이 없을 때 사용하는 dmap 전용 백업 저장소
 */
function getTitleOverridesPath(projectDir: string): string {
  return path.join(projectDir, '.dmap', 'transcript-titles.json');
}

/** 타이틀 오버라이드 맵 로드 */
async function loadTitleOverrides(projectDir: string): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(getTitleOverridesPath(projectDir), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * 타이틀 저장 - sessions-index.json의 summary 필드를 우선 수정 (Claude Code 동기화)
 * sessions-index.json이 없으면 .dmap/transcript-titles.json에 백업 저장
 */
export async function saveTitleOverride(sessionId: string, title: string, projectDir: string): Promise<void> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const trimmed = title.trim();

  // 1) sessions-index.json에 직접 수정 (Claude Code와 동기화)
  const index = await loadSessionsIndex(projectDir);
  if (index) {
    const entry = index.entries.find(e => e.sessionId === sessionId);
    if (entry) {
      if (trimmed) {
        entry.summary = trimmed;
      } else {
        // 빈 문자열이면 firstPrompt로 복원
        entry.summary = undefined;
      }
      await saveSessionsIndex(projectDir, index);
      log.info(`Title updated in sessions-index.json: ${sessionId}`);
      return;
    }
  }

  // 2) sessions-index.json이 없거나 해당 엔트리가 없으면 dmap 백업에 저장
  const overridesPath = getTitleOverridesPath(projectDir);
  await fs.mkdir(path.dirname(overridesPath), { recursive: true });

  let overrides: Record<string, string> = {};
  try {
    overrides = JSON.parse(await fs.readFile(overridesPath, 'utf-8'));
  } catch { /* new file */ }

  if (trimmed) {
    overrides[sessionId] = trimmed;
  } else {
    delete overrides[sessionId];
  }

  await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2), 'utf-8');
}

export interface TranscriptSession {
  id: string;           // filename without .jsonl
  summary: string;      // from first line summary field
  lastModified: string; // file modification time as ISO string
  fileSize: number;     // file size in bytes
  messageCount: number; // count of user text messages (not tool results)
}

export interface TranscriptMessage {
  id: string;           // uuid from the record
  role: 'user' | 'assistant';
  content: string;      // extracted text content
  timestamp: string;    // ISO timestamp
}

/**
 * Convert a file system path to Claude Code's project key format
 * Example: C:\Users\hiond\workspace\dmap → C--Users-hiond-workspace-dmap
 */
function pathToProjectKey(projectPath: string): string {
  // Normalize path to use forward slashes
  const normalized = projectPath.replace(/\\/g, '/');
  // Replace colons and path separators with dashes
  // C:\Users\hiond → C:/Users/hiond → C-/Users/hiond → C--Users-hiond
  return normalized.replace(/:/g, '-').replace(/\//g, '-');
}

/**
 * Returns the transcript directory path for the given project directory.
 * @param projectDir - 프로젝트 경로 (필수)
 */
export function getTranscriptDir(projectDir: string): string {
  const projectKey = pathToProjectKey(projectDir);
  return path.join(os.homedir(), '.claude', 'projects', projectKey);
}

/**
 * Parse a single JSONL line safely
 */
function parseJsonLine(line: string): any | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Extract text content from a message content array
 */
function extractTextContent(contentArray: any[]): string {
  if (!Array.isArray(contentArray)) return '';

  return contentArray
    .filter(item => item?.type === 'text')
    .map(item => item.text || '')
    .join('\n')
    .trim();
}

/**
 * Check if a message is a tool result (not a regular user message)
 */
function isToolResult(record: any): boolean {
  if (record.type !== 'user') return false;
  const content = record.message?.content;
  if (!Array.isArray(content)) return false;

  // Tool results have tool_result type in content
  return content.some(item => item?.type === 'tool_result');
}

/**
 * sessions-index.json에서 세션 목록 생성
 * Claude Code와 동일한 데이터소스 사용
 */
async function listFromSessionsIndex(index: SessionsIndex): Promise<TranscriptSession[]> {
  return index.entries
    .filter(e => !e.isSidechain)
    .map(e => {
      const title = e.summary || e.firstPrompt || '';
      return {
        id: e.sessionId,
        summary: title.length > 120 ? title.slice(0, 117) + '...' : title,
        lastModified: e.modified || new Date(e.fileMtime).toISOString(),
        fileSize: 0,
        messageCount: e.messageCount ?? -1,
      };
    })
    .filter(s => s.summary && s.summary !== 'No prompt')
    .sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
}

/**
 * .jsonl 파일 스캔으로 세션 목록 생성 (fallback)
 * sessions-index.json이 없을 때 사용
 */
async function listFromJsonlFiles(transcriptDir: string, projectDir: string): Promise<TranscriptSession[]> {
  const files = await fs.readdir(transcriptDir);
  const jsonlFiles = files.filter((f: string) => f.endsWith('.jsonl'));

  const sessions: TranscriptSession[] = [];

  for (const file of jsonlFiles) {
    try {
      const filePath = path.join(transcriptDir, file);
      const stats = await fs.stat(filePath);

      // Read first 200 lines to find first clean user message
      const lines = await readFirstLines(filePath, 200);
      const userMessage = extractFirstUserMessage(lines);

      // Skip sessions with no real user message (system-only sessions)
      if (!userMessage) continue;
      let summary = userMessage;
      // Truncate long summaries
      if (summary.length > 120) summary = summary.slice(0, 117) + '...';

      sessions.push({
        id: path.parse(file).name,
        summary,
        lastModified: stats.mtime.toISOString(),
        fileSize: stats.size,
        messageCount: -1,
      });
    } catch (err) {
      log.error(`Failed to read ${file}:`, err);
    }
  }

  // Apply title overrides (user-edited titles)
  const overrides = await loadTitleOverrides(projectDir);
  for (const session of sessions) {
    if (overrides[session.id]) {
      session.summary = overrides[session.id];
    }
  }

  sessions.sort((a, b) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  return sessions;
}

/**
 * 세션 목록 조회 - sessions-index.json 우선, 없으면 .jsonl 스캔 fallback
 * Sorted by lastModified descending (newest first)
 */
export async function listTranscriptSessions(projectDir: string): Promise<TranscriptSession[]> {
  const transcriptDir = getTranscriptDir(projectDir);

  try {
    await fs.access(transcriptDir);
  } catch {
    return [];
  }

  try {
    // 1) sessions-index.json 우선 사용 (Claude Code와 동일한 데이터소스)
    const index = await loadSessionsIndex(projectDir);
    if (index?.entries?.length) {
      log.info(`Loaded ${index.entries.length} sessions from sessions-index.json`);
      return listFromSessionsIndex(index);
    }

    // 2) Fallback: .jsonl 파일 직접 스캔
    log.info('sessions-index.json not found, falling back to .jsonl scan');
    return listFromJsonlFiles(transcriptDir, projectDir);
  } catch (err) {
    log.error('Failed to list sessions:', err);
    return [];
  }
}

/**
 * Validate sessionId to prevent path traversal attacks.
 * Only allows alphanumeric, hyphens, and underscores.
 */
function isValidSessionId(sessionId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(sessionId);
}

/**
 * Read the first N lines of a file efficiently
 */
async function readFirstLines(filePath: string, maxLines: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream });
    const lines: string[] = [];

    rl.on('line', (line: string) => {
      lines.push(line);
      if (lines.length >= maxLines) {
        rl.close();
        stream.destroy();
      }
    });

    rl.on('close', () => resolve(lines));
    rl.on('error', reject);
    stream.on('error', reject);
  });
}

/**
 * Patterns that indicate system-injected content (not real user input)
 */
const SYSTEM_CONTENT_PATTERNS = [
  /^<[a-z-]+>/i,                          // XML-like tags: <system-reminder>, <local-command-caveat>, etc.
  /^Implement the following plan:/i,       // Plan mode injection
  /SKILL\.md 파일을 읽고 그 지시를 따라 실행하세요/i,  // Skill invocation injection
];

/**
 * Check if text looks like system-injected content rather than real user input
 */
function isSystemContent(text: string): boolean {
  return SYSTEM_CONTENT_PATTERNS.some(pattern => pattern.test(text.trim()));
}

/**
 * Extract the first user message text from JSONL lines.
 * Skips system-injected content (tags, plan injections, etc.)
 */
function extractFirstUserMessage(lines: string[]): string | null {
  for (const line of lines) {
    const record = parseJsonLine(line);
    if (!record || record.type !== 'user') continue;
    if (isToolResult(record)) continue;

    // Try array content format: [{type:"text", text:"..."}]
    const content = record.message?.content;
    if (Array.isArray(content)) {
      const text = extractTextContent(content);
      if (text && !isSystemContent(text)) return text;
    }
    // Try plain string content
    if (typeof content === 'string' && content.trim() && !isSystemContent(content)) {
      return content.trim();
    }
  }
  return null;
}

/**
 * Delete a specific transcript session JSONL file
 */
export async function deleteTranscriptSession(sessionId: string, projectDir: string): Promise<boolean> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const transcriptDir = getTranscriptDir(projectDir);
  const filePath = path.join(transcriptDir, `${sessionId}.jsonl`);

  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete multiple transcript sessions by their IDs
 */
export async function deleteBatchTranscriptSessions(ids: string[], projectDir: string): Promise<number> {
  const transcriptDir = getTranscriptDir(projectDir);
  let deleted = 0;

  for (const id of ids) {
    if (!isValidSessionId(id)) continue;
    try {
      await fs.unlink(path.join(transcriptDir, `${id}.jsonl`));
      deleted++;
    } catch {
      // skip files that can't be deleted
    }
  }

  return deleted;
}

/**
 * Get all messages from a specific transcript session
 * Returns messages sorted by timestamp ascending
 */
export async function getTranscriptMessages(sessionId: string, projectDir: string): Promise<TranscriptMessage[]> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const transcriptDir = getTranscriptDir(projectDir);
  const filePath = path.join(transcriptDir, `${sessionId}.jsonl`);

  try {
    // Check if file exists
    await fs.access(filePath);
  } catch {
    throw new Error(`Transcript session ${sessionId} not found`);
  }

  const messages: TranscriptMessage[] = [];

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream });

    rl.on('line', (line: string) => {
      const record = parseJsonLine(line);
      if (!record) return;

      // Skip summary line
      if (record.type === 'summary') return;

      // Skip tool results (user messages that are tool results)
      if (isToolResult(record)) return;

      // Extract user text messages
      if (record.type === 'user') {
        const content = extractTextContent(record.message?.content || []);
        if (content) {
          messages.push({
            id: record.uuid || `user-${messages.length}`,
            role: 'user',
            content,
            timestamp: record.timestamp || new Date().toISOString(),
          });
        }
      }

      // Extract assistant text messages (skip pure tool_use)
      if (record.type === 'assistant') {
        const content = extractTextContent(record.message?.content || []);
        if (content) {
          messages.push({
            id: record.uuid || `assistant-${messages.length}`,
            role: 'assistant',
            content,
            timestamp: record.timestamp || new Date().toISOString(),
          });
        }
      }
    });

    rl.on('close', () => {
      // Sort by timestamp ascending
      messages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      resolve(messages);
    });

    rl.on('error', reject);
    stream.on('error', reject);
  });
}
