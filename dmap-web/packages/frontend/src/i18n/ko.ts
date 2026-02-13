import type { Translations } from './types.js';

const ko: Translations = {
  // Common
  'common.send': '전송',
  'common.close': '닫기',
  'common.cancel': '종료',
  'common.prev': '이전',
  'common.next': '다음',

  // Sidebar
  'sidebar.subtitle': '선언형 멀티에이전트 플러그인 빌더',

  // Chat
  'chat.selectSkill': '왼쪽 사이드바에서 실행할 스킬을 선택하세요',
  'chat.inputPlaceholder': '입력값 (선택사항)',
  'chat.run': '실행 (Ctrl+Enter)',
  'chat.startPrompt': "'실행' 버튼을 눌러 스킬을 시작하세요",
  'chat.processing': '처리 중...',
  'chat.reply': '답글...',
  'chat.reset': '초기화',
  'chat.stop': '중지',
  'chat.complete': '작업 완료',
  'chat.sendCtrlEnter': '전송 (Ctrl+Enter)',
  'chat.attachFile': '파일 또는 이미지 추가',

  // Approval
  'approval.title': '승인 요청',
  'approval.approve': '승인',
  'approval.customInput': '직접 입력...',
  'approval.customPlaceholder': '직접 응답을 입력하세요...',
  'approval.feedbackPlaceholder': '추가 의견이 있으면 입력 후 승인 (Enter)',

  // Question Form
  'question.filled': '{{filled}}/{{total}} 항목 입력됨',
  'question.submit': '제출 ({{filled}}/{{total}})',
  'question.customInput': '직접 입력',
  'question.customPlaceholder': '직접 입력하세요',
  'question.inputPlaceholder': '{{question}}을(를) 입력하세요',
  'question.notFilled': '(미입력)',

  // Settings
  'settings.title': '설정',
  'settings.theme': '테마 변경',
  'settings.language': '언어 변경',
  'settings.about': 'About Me',
  'settings.systemCheck': '시스템 점검',
  'settings.back': '뒤로',

  // About
  'about.description1':
    'DMAP(Declarative Multi-Agent Plugin)은 마크다운과 YAML만으로 멀티에이전트 플러그인을 만드는 노코드 빌더입니다.',
  'about.description2':
    '요구사항 정의서 작성부터 플러그인 개발, GitHub 배포까지 End-to-End 워크플로우를 제공합니다.',
  'about.footer': 'Developed by Unicorn Inc. | MIT License',

  // Stream
  'stream.respond': '응답을 입력해주세요.',
  'stream.error': '오류:',

  // Startup
  'startup.title': '시스템 점검',
  'startup.subtitle': '사용 준비 상태를 확인하고 있습니다',
  'startup.checking': '확인 중...',
  'startup.allPassed': '모든 점검을 통과했습니다!',
  'startup.hasFails': '일부 항목을 해결해야 합니다',
  'startup.fixing': '설치 중...',
  'startup.fixSuccess': '설치 완료',
  'startup.fixFail': '설치 실패',
  'startup.fix': '자동 설치',
  'startup.retry': '다시 점검',
  'startup.continue': '시작하기',
  'startup.runInTerminal': '터미널에서 실행 필요',

  // Categories
  'category.core': '핵심',
  'category.setup': '설정',
  'category.utility': '유틸리티',
  'category.external': '외부 연동',

  // Skill names
  'skill.develop-plugin.name': '플러그인 개발',
  'skill.develop-plugin.desc': '4-Phase 워크플로우로 DMAP 플러그인 전체 개발',
  'skill.requirement-writer.name': '요구사항 작성',
  'skill.requirement-writer.desc': 'AI 기반 요구사항 정의서 자동 완성',
  'skill.publish.name': 'GitHub 배포',
  'skill.publish.desc': '개발 완료된 플러그인을 GitHub에 배포',
  'skill.setup.name': '빌더 설정',
  'skill.setup.desc': 'DMAP 빌더 초기 설정 및 상태 확인',
  'skill.help.name': '도움말',
  'skill.help.desc': '사용 가능한 명령어 및 사용법 안내',
  'skill.add-ext-skill.name': '플러그인 추가',
  'skill.add-ext-skill.desc': '외부 플러그인 연동 추가',
  'skill.remove-ext-skill.name': '플러그인 제거',
  'skill.remove-ext-skill.desc': '외부 플러그인 연동 제거',
  'skill.ext-abra.name': 'Abra 연동',
  'skill.ext-abra.desc': 'Dify AI Agent 개발 자동화 (abra 플러그인)',
  'skill.ext-github-release-manager.name': 'Release 관리',
  'skill.ext-github-release-manager.desc': 'GitHub Release 자동화 (github-release-manager 플러그인)',

  // Plugin
  'plugin.add': '플러그인 추가',
  'plugin.remove': '플러그인 제거',
  'plugin.name': '플러그인 이름',
  'plugin.projectDir': '프로젝트 경로',
  'plugin.browse': '찾아보기',
  'plugin.select': '선택',
  'plugin.cancel': '취소',
  'plugin.addBtn': '추가',
  'plugin.validating': '확인 중...',
  'plugin.error.notFound': '디렉토리를 찾을 수 없습니다',
  'plugin.error.noPluginJson': 'plugin.json이 없습니다',
  'plugin.error.noSkillsDir': 'skills 디렉토리가 없습니다',
  'plugin.error.alreadyRegistered': '이미 등록된 플러그인입니다',
  'plugin.error.cannotRemoveDefault': '기본 플러그인은 제거할 수 없습니다',
  'plugin.removeConfirm': '이 플러그인을 제거하시겠습니까?',
  'plugin.dirBrowser.title': '디렉토리 선택',
  'plugin.dirBrowser.parent': '상위 폴더',
  'plugin.dirBrowser.empty': '하위 디렉토리가 없습니다',

  // File Browser
  'fileBrowser.title': '파일 선택',
  'fileBrowser.select': '선택',
  'fileBrowser.cancel': '취소',
  'fileBrowser.empty': '파일이 없습니다',
  'fileBrowser.selectedCount': '{{count}}개 선택됨',
  'fileBrowser.unsupportedType': '허용 파일: png, jpg, gif, webp, pdf, txt, md, csv, json, yaml, xml',

  // Activity Panel
  'activity.idle': '대기 중',
  'activity.running': '실행 중...',
  'activity.complete': '완료',
  'activity.error': '오류',
  'activity.toggle': '활동 패널',
  'activity.progress': '진행상황',
  'activity.progress.elapsed': '경과: {{time}}',
  'activity.progress.completedIn': '{{time}} 만에 완료',
  'activity.progress.inProgress': '실행 중',
  'activity.progress.ready': '실행 준비됨',
  'activity.progress.selectSkill': '스킬을 선택하세요',
  'activity.progress.failed': '실행 실패',
  'activity.agents': '에이전트',
  'activity.tools': '도구',
  'activity.tools.summary': '요약',
  'activity.tools.feed': '피드',
  'activity.skillInfo': '스킬 정보',
  'activity.skillInfo.plugin': '플러그인',
  'activity.skillInfo.skill': '스킬',
  'activity.skillInfo.session': '세션',
  'activity.skillInfo.category': '카테고리',
  'activity.usage': '사용량',
  'activity.agents.model': '모델',
  'activity.agents.tier': '등급',
  'activity.agents.empty': '에이전트 활동 없음',
  'activity.usage.tokens': '토큰',
  'activity.usage.cost': '비용',
  'activity.usage.duration': '소요 시간',
  'activity.usage.turns': '턴',
  'activity.usage.input': '입력',
  'activity.usage.output': '출력',
  'activity.usage.cacheRead': '캐시',

  // Agent Sync
  'agentSync.label': '에이전트 갱신',
  'agentSync.tooltip': 'DMAP에 플러그인 에이전트를 갱신합니다.\n에이전트 내용 갱신 시 반드시 수행해 주세요.',
  'agentSync.syncing': '갱신 중...',
  'agentSync.success': '에이전트 {{count}}개 갱신 완료',
  'agentSync.fail': '에이전트 갱신 실패',
  'agentSync.noAgents': '갱신할 에이전트가 없습니다',
};

export default ko;
