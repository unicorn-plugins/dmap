import { v4 as uuidv4 } from 'uuid';
import type { Session, SessionUsage } from '@dmap-web/shared';
import fs from 'fs';
import path from 'path';
import { DMAP_PROJECT_DIR } from '../config.js';

interface InternalSession extends Session {
  pendingResponse?: {
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
  };
}

class SessionManager {
  private sessions = new Map<string, InternalSession>();
  private readonly TIMEOUT = 60 * 60 * 1000; // 1 hour for in-memory cleanup
  private readonly sessionsDir: string;

  constructor() {
    this.sessionsDir = path.join(DMAP_PROJECT_DIR, '.dmap', 'sessions');
    fs.mkdirSync(this.sessionsDir, { recursive: true });
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8'));
          // Don't restore runtime-only fields
          delete data.pendingResponse;
          this.sessions.set(data.id, data);
        } catch {
          // Skip corrupted files
        }
      }
      console.log(`[SessionManager] Loaded ${files.length} sessions from disk`);
    } catch {
      // Directory might not exist yet
    }
  }

  private saveToDisk(session: InternalSession): void {
    try {
      const { pendingResponse: _, ...data } = session;
      fs.writeFileSync(
        path.join(this.sessionsDir, `${session.id}.json`),
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error(`[SessionManager] Failed to save session ${session.id}:`, err);
    }
  }

  create(skillName: string): InternalSession {
    const now = new Date().toISOString();
    const session: InternalSession = {
      id: uuidv4(),
      skillName,
      status: 'active',
      createdAt: now,
      lastActivity: now,
    };
    this.sessions.set(session.id, session);
    this.saveToDisk(session);
    this.scheduleCleanup(session.id);
    return session;
  }

  get(id: string): InternalSession | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = new Date().toISOString();
    }
    return session;
  }

  updateSdkSessionId(id: string, sdkSessionId: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.sdkSessionId = sdkSessionId;
      this.saveToDisk(session);
    }
  }

  updateMeta(id: string, meta: { preview?: string; pluginId?: string; skillIcon?: string; usage?: SessionUsage }): void {
    const session = this.sessions.get(id);
    if (!session) return;
    if (meta.preview !== undefined) session.preview = meta.preview;
    if (meta.pluginId !== undefined) session.pluginId = meta.pluginId;
    if (meta.skillIcon !== undefined) session.skillIcon = meta.skillIcon;
    if (meta.usage !== undefined) session.usage = meta.usage;
    session.lastActivity = new Date().toISOString();
    this.saveToDisk(session);
  }

  setStatus(id: string, status: Session['status']): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      session.lastActivity = new Date().toISOString();
      this.saveToDisk(session);
    }
  }

  waitForUserResponse(id: string): Promise<string> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);

    session.status = 'waiting';
    return new Promise<string>((resolve, reject) => {
      session.pendingResponse = { resolve, reject };
    });
  }

  resolveUserResponse(id: string, response: string): boolean {
    const session = this.sessions.get(id);
    if (!session?.pendingResponse) return false;

    session.status = 'active';
    session.pendingResponse.resolve(response);
    session.pendingResponse = undefined;
    return true;
  }

  delete(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    if (session.pendingResponse) {
      session.pendingResponse.reject(new Error('Session deleted'));
    }
    this.sessions.delete(id);
    // Remove from disk
    try {
      const filePath = path.join(this.sessionsDir, `${id}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignore */ }
    return true;
  }

  listAll(): Session[] {
    return Array.from(this.sessions.values())
      .map(({ pendingResponse: _pending, ...s }) => s)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  private scheduleCleanup(id: string): void {
    setTimeout(() => {
      const session = this.sessions.get(id);
      if (session) {
        const inactive =
          Date.now() - new Date(session.lastActivity).getTime();
        if (inactive > this.TIMEOUT) {
          if (session.pendingResponse) {
            session.pendingResponse.reject(new Error('Session timed out'));
          }
          this.sessions.delete(id);
          // Note: don't delete from disk - keep for history
        } else {
          this.scheduleCleanup(id);
        }
      }
    }, this.TIMEOUT);
  }
}

export const sessionManager = new SessionManager();
export type { InternalSession };
