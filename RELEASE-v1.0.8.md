# DMAP v1.0.8 Release Notes

## 📋 릴리스 정보 (Release Information)

- **버전 (Version)**: v1.0.8
- **릴리스 날짜 (Release Date)**: 2026-02-16
- **이전 버전 (Previous Version)**: v1.0.7 (2026-02-15)
- **변경 사항 (Change Type)**: 패치 (Patch) - 기능 개선 및 UI 업데이트

## 🚀 주요 변경 사항 (Major Changes)

### 🔄 세션 관리 기능 개선 (Session Management Improvements)
- **새로운 SessionList 컴포넌트**: 이전 대화 내역을 더욱 직관적으로 관리할 수 있는 새로운 UI 컴포넌트 추가
- **세션 재개 기능**: 이전 대화 세션을 클릭하여 쉽게 재개할 수 있는 기능 구현
- **세션 삭제 기능**: 불필요한 대화 세션을 삭제할 수 있는 기능 추가
- **실시간 세션 상태 표시**: 완료, 대기, 오류, 실행 중 등 세션 상태를 시각적으로 표시

### 🎨 UI/UX 개선 (UI/UX Enhancements)
- **향상된 세션 히스토리 표시**: 시간 정보, 토큰 사용량, 비용 정보를 포함한 상세 정보 표시
- **다크 모드 최적화**: 다크 테마에서 더욱 자연스러운 색상 및 스타일 적용
- **반응형 디자인**: 다양한 화면 크기에 최적화된 레이아웃 구현
- **사용자 경험 개선**: 호버 효과 및 트랜지션 애니메이션으로 더욱 부드러운 인터랙션

### 🌐 다국어 지원 확장 (Extended Internationalization)
- **세션 관련 번역 추가**: 한국어, 영어 세션 관리 관련 모든 텍스트 번역 추가
- **시간 표시 현지화**: "방금", "N분 전", "N시간 전", "N일 전" 등 시간 정보 현지화
- **상태 메시지 번역**: 세션 상태별 메시지 다국어 지원

### 🔧 백엔드 개선 (Backend Improvements)
- **Claude SDK 클라이언트 강화**: 새로운 Claude SDK 클라이언트 서비스 구현으로 더욱 안정적인 API 통신
- **세션 매니저 업데이트**: 세션 생명주기 관리 및 상태 추적 기능 개선
- **API 엔드포인트 최적화**: 세션, 스킬, 스타트업 관련 API 성능 및 안정성 향상

## 📊 변경 통계 (Change Statistics)

```
16 files changed, 626 insertions(+), 665 deletions(-)
```

### 추가된 파일 (New Files)
- `dmap-web/packages/frontend/src/components/SessionList.tsx` - 새로운 세션 목록 컴포넌트

### 제거된 파일 (Removed Files)
- `resources/plugins/office/claude-skills.md` - 오래된 플러그인 문서 정리

### 주요 수정된 파일 (Modified Files)
- **백엔드**:
  - `dmap-web/packages/backend/src/routes/sessions.ts` - 세션 라우팅 개선
  - `dmap-web/packages/backend/src/routes/skills.ts` - 스킬 관리 API 강화
  - `dmap-web/packages/backend/src/services/claude-sdk-client.ts` - Claude SDK 클라이언트 구현
  - `dmap-web/packages/backend/src/services/session-manager.ts` - 세션 매니저 업그레이드

- **프론트엔드**:
  - `dmap-web/packages/frontend/src/components/ChatPanel.tsx` - 채팅 패널 UI 개선
  - `dmap-web/packages/frontend/src/components/Sidebar.tsx` - 사이드바 레이아웃 최적화
  - `dmap-web/packages/frontend/src/stores/appStore.ts` - 상태 관리 로직 개선

- **다국어 지원**:
  - `dmap-web/packages/frontend/src/i18n/ko.ts` - 한국어 번역 확장
  - `dmap-web/packages/frontend/src/i18n/en.ts` - 영어 번역 확장
  - `dmap-web/packages/frontend/src/i18n/types.ts` - 번역 타입 정의 추가

## 🔄 호환성 정보 (Compatibility)

- **Node.js**: 18.x 이상 권장
- **브라우저**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **이전 버전과의 호환성**: 완전 호환 (Breaking Changes 없음)

## 🐛 버그 수정 (Bug Fixes)

- 세션 상태 동기화 문제 해결
- UI 컴포넌트 렌더링 최적화
- 다크 모드에서 텍스트 가독성 개선
- 메모리 누수 방지를 위한 컴포넌트 정리 로직 추가

## ⚡ 성능 개선 (Performance Improvements)

- 세션 목록 렌더링 최적화
- 번들 크기 최적화 (package-lock.json 정리)
- API 응답 시간 개선
- 컴포넌트 리렌더링 최소화

## 🏗️ 개발자 경험 (Developer Experience)

- TypeScript 타입 안전성 강화
- 컴포넌트 재사용성 개선
- 코드 구조 최적화 및 모듈화
- 에러 핸들링 로직 개선

## 📖 사용법 (Usage)

### 새로운 SessionList 컴포넌트 사용
```tsx
import { SessionList } from './components/SessionList';

// 모든 세션 표시
<SessionList />

// 특정 스킬의 세션만 필터링
<SessionList skillName="dmap:develop-plugin" />
```

### 세션 관리 기능
- **세션 재개**: 세션 목록에서 원하는 세션을 클릭하여 대화 재개
- **세션 삭제**: 세션 카드 우측 상단의 X 버튼으로 세션 삭제
- **세션 상태 확인**: 색상별 상태 표시 (완료: 초록색, 대기: 노란색, 오류: 빨간색, 실행 중: 파란색)

## 🔮 다음 버전 계획 (Next Version Plans)

- 세션 검색 및 필터링 기능 강화
- 세션 내보내기/가져오기 기능
- 세션별 태그 및 카테고리 관리
- 세션 성능 분석 대시보드

## 👥 기여자 (Contributors)

- **ondal** (hiondal@gmail.com) - 주요 개발
- **Claude** (noreply@anthropic.com) - AI 어시스턴트 협업

## 🔗 관련 링크 (Related Links)

- **GitHub Repository**: https://github.com/dreamondal/dmap
- **이슈 트래커**: https://github.com/dreamondal/dmap/issues
- **문서**: https://github.com/dreamondal/dmap/wiki
- **이전 릴리스**: [v1.0.7](https://github.com/dreamondal/dmap/releases/tag/v1.0.7)

---

**Full Changelog**: [v1.0.7...v1.0.8](https://github.com/dreamondal/dmap/compare/v1.0.7...v1.0.8)

## English Summary

### What's New in v1.0.8

- **Enhanced Session Management**: New SessionList component with resume/delete capabilities
- **Improved UI/UX**: Better session history display with status indicators, token usage, and cost information
- **Extended i18n Support**: Added comprehensive translations for session management features
- **Backend Improvements**: New Claude SDK client and enhanced session manager
- **Performance Optimizations**: Reduced bundle size and improved rendering performance

This patch release focuses on improving session management capabilities while maintaining full backward compatibility.