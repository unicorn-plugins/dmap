// Shared filesystem types for AddPluginDialog and FileBrowserDialog

export interface DirEntry {
  name: string;
  path: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
}

export interface DirListing {
  current: string;
  parent: string | null;
  directories: DirEntry[];
  files?: FileEntry[];
}
