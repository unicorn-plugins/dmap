import { useState, useRef, useCallback } from 'react';
import { useT } from '../i18n/index.js';

const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.txt', '.md', '.csv', '.json',
  '.yaml', '.yml', '.xml',
]);

export function useFileAttachment() {
  const [attachedPaths, setAttachedPaths] = useState<string[]>([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useT();

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const uploadFiles = useCallback(async (files: { name: string; data: string }[]) => {
    if (files.length === 0) return;
    try {
      const res = await fetch('/api/filesystem/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      if (res.ok) {
        const { paths } = await res.json();
        setAttachedPaths((prev) => [...prev, ...paths.filter((p: string) => !prev.includes(p))]);
      }
    } catch {
      // ignore upload errors
    }
  }, []);

  const fileToBase64 = useCallback(async (file: Blob, name: string) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return { name, data: btoa(binary) };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const allowed: File[] = [];
    let hasRejected = false;

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        allowed.push(file);
      } else {
        hasRejected = true;
      }
    }

    if (hasRejected) {
      showToast(t('fileBrowser.unsupportedType'));
    }

    if (allowed.length === 0) return;

    const fileData = await Promise.all(
      allowed.map((file) => fileToBase64(file, file.name)),
    );
    await uploadFiles(fileData);
  }, [showToast, t, fileToBase64, uploadFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return; // text paste — let default behavior happen

    e.preventDefault(); // prevent image data from being pasted as text

    const fileData = await Promise.all(
      imageItems.map(async (item) => {
        const blob = item.getAsFile();
        if (!blob) return null;
        const ext = item.type.split('/')[1] || 'png';
        const name = `clipboard-${Date.now()}.${ext}`;
        return fileToBase64(blob, name);
      }),
    );

    const validFiles = fileData.filter((f): f is { name: string; data: string } => f !== null);
    await uploadFiles(validFiles);
  }, [fileToBase64, uploadFiles]);

  const handleFilesSelected = useCallback((filePaths: string[]) => {
    setAttachedPaths((prev) => [...prev, ...filePaths.filter((p) => !prev.includes(p))]);
    setShowFileBrowser(false);
  }, []);

  const removePath = useCallback((index: number) => {
    setAttachedPaths((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachedPaths([]);
  }, []);

  return {
    attachedPaths,
    showFileBrowser,
    setShowFileBrowser,
    isDragging,
    toast,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    handlePaste,
    handleFilesSelected,
    removePath,
    clearAttachments,
    getFileName: (filePath: string) => filePath.split(/[\\/]/).pop() || filePath,
  };
}
