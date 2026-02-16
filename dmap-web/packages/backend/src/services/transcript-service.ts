import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createReadStream } from 'fs';
import readline from 'readline';
import { DMAP_PROJECT_DIR } from '../config.js';

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
 * Returns the transcript directory path for the dmap project
 */
export function getTranscriptDir(): string {
  const projectKey = pathToProjectKey(DMAP_PROJECT_DIR);
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
 * List all transcript sessions from the Claude Code projects directory
 * Sorted by lastModified descending (newest first)
 */
export async function listTranscriptSessions(): Promise<TranscriptSession[]> {
  const transcriptDir = getTranscriptDir();

  try {
    // Check if directory exists
    await fs.access(transcriptDir);
  } catch {
    // Directory doesn't exist, return empty array
    return [];
  }

  try {
    const files = await fs.readdir(transcriptDir);
    const jsonlFiles = files.filter((f: string) => f.endsWith('.jsonl'));

    const sessions: TranscriptSession[] = [];

    for (const file of jsonlFiles) {
      try {
        const filePath = path.join(transcriptDir, file);
        const stats = await fs.stat(filePath);

        // Read first 20 lines to find first user message (like Claude Code /resume)
        const lines = await readFirstLines(filePath, 20);
        const userMessage = extractFirstUserMessage(lines);

        // Use first user message as summary; fall back to summary field
        let summary = userMessage || 'Untitled Session';
        if (!userMessage) {
          const firstRecord = lines.length > 0 ? parseJsonLine(lines[0]) : null;
          if (firstRecord?.summary) summary = firstRecord.summary;
        }
        // Truncate long summaries
        if (summary.length > 120) summary = summary.slice(0, 117) + '...';

        sessions.push({
          id: path.parse(file).name,
          summary,
          lastModified: stats.mtime.toISOString(),
          fileSize: stats.size,
          messageCount: -1, // Placeholder - will count when viewing individual session
        });
      } catch (err) {
        // Skip files that can't be read
        console.error(`[TranscriptService] Failed to read ${file}:`, err);
      }
    }

    // Sort by lastModified descending (newest first)
    sessions.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return sessions;
  } catch (err) {
    console.error('[TranscriptService] Failed to list sessions:', err);
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
 * Extract the first user message text from JSONL lines.
 * Claude Code /resume shows the first user input, so we do the same.
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
      if (text) return text;
    }
    // Try plain string content
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
  }
  return null;
}

/**
 * Delete a specific transcript session JSONL file
 */
export async function deleteTranscriptSession(sessionId: string): Promise<boolean> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const transcriptDir = getTranscriptDir();
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
export async function deleteBatchTranscriptSessions(ids: string[]): Promise<number> {
  const transcriptDir = getTranscriptDir();
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
export async function getTranscriptMessages(sessionId: string): Promise<TranscriptMessage[]> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const transcriptDir = getTranscriptDir();
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
