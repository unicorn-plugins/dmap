import type { SkillMeta } from './types.js';

export const DMAP_SKILLS: SkillMeta[] = [
  {
    name: 'team-planner',
    displayName: '팀 기획서',
    description: 'AI 기반 팀 기획서 자동 완성',
    icon: '📋',
    category: 'core',
    hasApprovalGates: true,
  },
  {
    name: 'develop-plugin',
    displayName: '플러그인 개발',
    description: '4-Phase 워크플로우로 DMAP 플러그인 전체 개발',
    icon: '🔨',
    category: 'core',
    hasApprovalGates: true,
  },
  {
    name: 'publish',
    displayName: 'GitHub 배포',
    description: '개발 완료된 플러그인을 GitHub에 배포',
    icon: '🚀',
    category: 'setup',
    hasApprovalGates: true,
  },
  {
    name: 'setup',
    displayName: '플러그인 초기설정',
    description: 'DMAP 플러그인 초기 설정 및 상태 확인',
    icon: '⚙️',
    category: 'setup',
    hasApprovalGates: false,
  },
  {
    name: 'add-ext-skill',
    displayName: '플러그인 추가',
    description: '외부 플러그인 연동 추가',
    icon: '➕',
    category: 'utility',
    hasApprovalGates: true,
  },
  {
    name: 'remove-ext-skill',
    displayName: '플러그인 제거',
    description: '외부 플러그인 연동 제거',
    icon: '➖',
    category: 'utility',
    hasApprovalGates: true,
  },
  {
    name: 'help',
    displayName: '도움말',
    description: '사용 가능한 명령어 및 사용법 안내',
    icon: '❓',
    category: 'utility',
    hasApprovalGates: false,
  },
  {
    name: 'ext-github-release-manager',
    displayName: 'Release 관리',
    description: 'GitHub Release 자동화 (github-release-manager 플러그인)',
    icon: '📦',
    category: 'external',
    hasApprovalGates: true,
  },
];

export const PROMPT_SKILL: SkillMeta = {
  name: '__prompt__',
  displayName: '프롬프트',
  description: '자유 프롬프트 실행',
  icon: '⚡',
  category: 'core',
  hasApprovalGates: true,
};

export const SKILL_CATEGORIES = {
  core: { label: '핵심', color: 'blue' },
  utility: { label: '유틸리티', color: 'gray' },
  setup: { label: '설정', color: 'green' },
  external: { label: '외부 연동', color: 'purple' },
} as const;

export const API_BASE = '/api';
export const SSE_RETRY_MS = 3000;
