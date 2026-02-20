import { Router } from 'express';
import { readdir, stat, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export const filesystemRouter = Router();

const HOME_DIR = os.homedir();

const ALLOWED_FILE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.txt', '.md', '.csv', '.json',
  '.yaml', '.yml', '.xml',
]);

// GET /api/filesystem/list?path=...&includeFiles=true - List directories (and optionally files)
filesystemRouter.get('/list', async (req, res) => {
  const dirPath = (req.query.path as string) || HOME_DIR;
  const includeFiles = req.query.includeFiles === 'true';
  const resolved = path.resolve(dirPath);

  // Security: only allow browsing within home directory
  if (resolved !== HOME_DIR && !resolved.startsWith(HOME_DIR + path.sep)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const entries = await readdir(resolved, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(resolved, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const result: {
      current: string;
      parent: string | null;
      directories: { name: string; path: string }[];
      files?: { name: string; path: string; size: number }[];
    } = {
      current: resolved,
      parent: path.dirname(resolved) !== resolved && path.dirname(resolved).startsWith(HOME_DIR)
        ? path.dirname(resolved)
        : null,
      directories: dirs,
    };

    if (includeFiles) {
      const fileEntries = entries
        .filter((e) => e.isFile() && !e.name.startsWith('.') && ALLOWED_FILE_EXTENSIONS.has(path.extname(e.name).toLowerCase()));

      const files = await Promise.all(
        fileEntries.map(async (e) => {
          const filePath = path.join(resolved, e.name);
          try {
            const s = await stat(filePath);
            return { name: e.name, path: filePath, size: s.size };
          } catch {
            return { name: e.name, path: filePath, size: 0 };
          }
        }),
      );

      result.files = files.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json(result);
  } catch {
    res.status(400).json({ error: 'Cannot read directory' });
  }
});

// POST /api/filesystem/mkdir - Create a new directory
filesystemRouter.post('/mkdir', async (req, res) => {
  const { path: dirPath } = req.body as { path: string };
  if (!dirPath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }
  const resolved = path.resolve(dirPath);
  if (!resolved.startsWith(HOME_DIR + path.sep)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  try {
    await mkdir(resolved, { recursive: true });
    res.json({ success: true, path: resolved });
  } catch {
    res.status(400).json({ error: 'Failed to create directory' });
  }
});

// POST /api/filesystem/upload - Save dropped files to temp directory, return paths
filesystemRouter.post('/upload', async (req, res) => {
  const { files } = req.body as { files: { name: string; data: string }[] };

  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: 'No files provided' });
    return;
  }

  const MAX_FILES = 20;
  if (files.length > MAX_FILES) {
    res.status(400).json({ error: `Maximum ${MAX_FILES} files allowed` });
    return;
  }

  const uploadDir = path.join(os.tmpdir(), 'dmap-uploads', crypto.randomUUID());
  await mkdir(uploadDir, { recursive: true });

  const savedPaths: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.has(ext)) continue;

    const baseName = path.basename(file.name);
    const safeName = baseName.replace(/[<>:"/\\|?*]/g, '_').slice(0, 255);
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(file.data, 'base64');
    await writeFile(filePath, buffer);
    savedPaths.push(filePath);
  }

  res.json({ paths: savedPaths });
});
