/**
 * 중앙 모델 버전 관리 서비스
 *
 * 모든 Claude 모델 ID를 한곳에서 관리하고, dmap-web 시작 시 Anthropic API를 통해
 * 최신 버전으로 자동 갱신한다.
 *
 * 설정 파일: DATA_DIR/model-versions.json
 *
 * @module services/model-versions
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('ModelVersions');

const MODEL_VERSIONS_FILE = path.join(DATA_DIR, 'model-versions.json');

export interface ModelVersions {
  models: {
    opus: string;
    sonnet: string;
    haiku: string;
  };
  lastRefreshed: string;
  source: 'default' | 'api' | 'cached';
}

const DEFAULT_VERSIONS: ModelVersions = {
  models: {
    opus: 'opus',
    sonnet: 'sonnet',
    haiku: 'haiku',
  },
  lastRefreshed: new Date().toISOString(),
  source: 'default',
};

/** JSON 파일에서 모델 버전 읽기 (없으면 기본값 반환) */
export function loadModelVersions(): ModelVersions {
  try {
    if (fs.existsSync(MODEL_VERSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MODEL_VERSIONS_FILE, 'utf-8'));
      return data as ModelVersions;
    }
  } catch (err) {
    log.warn(`Failed to load model-versions.json: ${err}`);
  }
  return { ...DEFAULT_VERSIONS, lastRefreshed: new Date().toISOString() };
}

/** JSON 파일에 모델 버전 저장 */
export function saveModelVersions(versions: ModelVersions): void {
  try {
    fs.writeFileSync(MODEL_VERSIONS_FILE, JSON.stringify(versions, null, 2), 'utf-8');
  } catch (err) {
    log.warn(`Failed to save model-versions.json: ${err}`);
  }
}

/** 단축명(opus/sonnet/haiku) → 전체 모델 ID */
export function getFullModelId(shortName: 'opus' | 'sonnet' | 'haiku'): string {
  const versions = loadModelVersions();
  return versions.models[shortName] || shortName;
}

/** SDK 기본 모델 전체 ID 반환 (현재 sonnet). 실패 시 'sonnet' 반환 (SDK 자동 해석) */
export function getDefaultSdkModel(): string {
  try {
    const versions = loadModelVersions();
    return versions.models.sonnet || 'sonnet';
  } catch {
    return 'sonnet';
  }
}

/** 현재 설정 반환 (API 응답용) */
export function getAllModelVersions(): ModelVersions {
  return loadModelVersions();
}

/**
 * 모델 버전 갱신 - 기본값 저장 (API 키 불필요)
 *
 * Claude SDK는 단축명('sonnet', 'opus', 'haiku')을 자체 해석하므로
 * Anthropic API로 전체 모델 ID를 조회할 필요 없음.
 * 기본값이 변경되면 DEFAULT_VERSIONS를 수동 업데이트.
 */
export async function refreshModelVersions(): Promise<ModelVersions> {
  const current = loadModelVersions();
  if (current.source === 'default') {
    saveModelVersions(current);
  }
  log.info(`Model versions: opus=${current.models.opus}, sonnet=${current.models.sonnet}, haiku=${current.models.haiku} (source=${current.source})`);
  return current;
}

