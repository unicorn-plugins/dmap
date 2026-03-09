import { useState, useRef, useCallback } from 'react';
import { useT } from '../i18n/index.js';

const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.txt', '.md', '.csv', '.json',
  '.yaml', '.yml', '.xml',
]);

export function useFileAttachment() {
  const [attachedPaths, setAttachedPaths] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
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

  /** 파일 업로드 후 서버 경로 반환 */
  const uploadFiles = useCallback(async (files: { name: string; data: string }[]): Promise<string[]> => {
    if (files.length === 0) return [];
    try {
      const res = await fetch('/api/filesystem/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      if (res.ok) {
        const { paths } = await res.json();
        setAttachedPaths((prev) => [...prev, ...paths.filter((p: string) => !prev.includes(p))]);
        return paths as string[];
      }
    } catch {
      // ignore upload errors
    }
    return [];
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

    // 이미지 파일은 미리보기 URL 생성
    const previewUrls = allowed.map((file) =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    );

    const fileData = await Promise.all(
      allowed.map((file) => fileToBase64(file, file.name)),
    );
    const paths = await uploadFiles(fileData);

    if (paths.length > 0) {
      setImagePreviews((prev) => {
        const next = { ...prev };
        paths.forEach((path, i) => {
          if (previewUrls[i]) next[path] = previewUrls[i]!;
        });
        return next;
      });
    } else {
      previewUrls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
    }
  }, [showToast, t, fileToBase64, uploadFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    // 1) clipboardData.files: drag-and-drop 방식으로 접근 (일부 브라우저/OS에서 더 신뢰적)
    let imageFiles = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));

    // 2) files가 비어있으면 items API로 fallback (macOS 스크린샷 등)
    if (imageFiles.length === 0) {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.kind === 'file' && item.type.startsWith('image/'));
      if (imageItems.length === 0) return; // 이미지 없음 → 텍스트 붙여넣기 허용
      imageFiles = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
    }

    if (imageFiles.length === 0) return;

    e.preventDefault();

    const blobs = imageFiles.map((file) => {
      const subtype = file.type.split(';')[0].trim().split('/')[1] || 'png';
      const ext = subtype === 'tiff' ? 'png' : subtype;
      return { blob: file, ext };
    });

    if (blobs.length === 0) {
      showToast(t('fileBrowser.unsupportedType'));
      return;
    }

    const previewUrls = blobs.map(({ blob }) => URL.createObjectURL(blob));

    const fileData = await Promise.all(
      blobs.map(({ blob, ext }, i) => {
        const name = `clipboard-${Date.now()}-${i}.${ext}`;
        return fileToBase64(blob, name);
      }),
    );

    const paths = await uploadFiles(fileData);

    if (paths.length > 0) {
      setImagePreviews((prev) => {
        const next = { ...prev };
        paths.forEach((path, i) => {
          if (previewUrls[i]) next[path] = previewUrls[i];
        });
        return next;
      });
    } else {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      showToast(t('fileBrowser.unsupportedType'));
    }
  }, [fileToBase64, uploadFiles, showToast, t]);

  const handleFilesSelected = useCallback((filePaths: string[]) => {
    setAttachedPaths((prev) => [...prev, ...filePaths.filter((p) => !prev.includes(p))]);
    setShowFileBrowser(false);
  }, []);

  const removePath = useCallback((index: number) => {
    setAttachedPaths((prev) => {
      const path = prev[index];
      setImagePreviews((prevPreviews) => {
        const url = prevPreviews[path];
        if (url) URL.revokeObjectURL(url);
        const next = { ...prevPreviews };
        delete next[path];
        return next;
      });
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setImagePreviews((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
    setAttachedPaths([]);
  }, []);

  return {
    attachedPaths,
    imagePreviews,
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
