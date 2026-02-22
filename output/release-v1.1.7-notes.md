# v1.1.7 - Claude Agent SDK 마이그레이션 및 dmap-web 개선

**Release Date**: 2026-02-21

---

## Highlights

- **Claude Agent SDK 마이그레이션**: `@anthropic-ai/claude-code`에서 `@anthropic-ai/claude-agent-sdk`로 전환하여 안정적인 SDK 기반 에이전트 실행 환경 확보
- **dmap-web 대규모 개선**: GitHub 플러그인 설치, 작업경로 관리, API 키 의존성 제거 등 웹 인터페이스 전반의 품질 향상
- **Bash 권한 자동 승인**: `canUseTool` → `allowedTools` 전환 및 PermissionDialog 인프라 추가로 Bash 도구 권한 관리 자동화
- **Docker 컨테이너 배포 지원**: dmap-web에 Docker 컨테이너 배포 설정을 추가하여 컨테이너 환경 배포 지원

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)

---

## Added

### 배포 환경

- **Docker 컨테이너 배포 설정**: dmap-web에 Docker 컨테이너 배포 설정을 추가하여 컨테이너 환경에서의 배포 지원 (@hiondal)
  - `docker-compose.yml` 및 관련 Dockerfile 구성 추가
  - 컨테이너 환경에서 dmap-web 백엔드/프론트엔드 통합 배포 지원

### 플러그인 마켓플레이스

- **NPD 플러그인 마켓플레이스 등록**: NPD 플러그인 명세서 추가 및 플러그인 목록 업데이트 (@hiondal)
  - `dmap-web/plugins/npd.json` 최신 agentcard 내용으로 재동기화
  - utility/external 카테고리 관리 추가 및 AI 추천 라벨 생성 확장

### 보안

- **publish 스킬 원격 URL 보안 검증**: Step 2.5로 원격 URL 보안 검증 단계 추가 (@hiondal)
  - publish 실행 전 원격 저장소 URL의 유효성 및 보안 검증

### 권한 관리

- **PermissionDialog 인프라 추가**: Bash 도구 권한 요청 처리를 위한 PermissionDialog 컴포넌트 인프라 구축 (@hiondal)

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)

---

## Changed

### Claude SDK 마이그레이션

- **Claude Agent SDK 전환**: `@anthropic-ai/claude-code` → `@anthropic-ai/claude-agent-sdk` 패키지로 전환 (@hiondal)
  - `appendSystemPrompt` → `systemPrompt` preset+append 방식으로 변경
  - `tsx watch` → `node --import tsx/esm` 실행 방식으로 변경 (SDK 동적 import 호환성)
  - `CLAUDECODE` 환경변수 제거로 중첩 세션 방지
  - SDK 에러 로깅 강화
- **Bash 권한 자동 승인**: `canUseTool` → `allowedTools` 전환으로 Bash 도구 권한 자동 승인 처리 개선 (@hiondal)
- **startup 점검 개선**: Node Modules 체크 대상을 `claude-agent-sdk`로 변경 (@hiondal)

### dmap-web 개선

- **GitHub 플러그인 설치 지원**: dmap-web에서 GitHub 플러그인을 직접 설치할 수 있는 기능 추가 (@hiondal)
- **작업경로 관리 개선**: 작업경로(workspace) 설정 및 관리 기능 향상 (@hiondal)
- **API 키 의존성 제거**: 불필요한 API 키 의존성 제거로 설정 간소화 (@hiondal)
- **백엔드/프론트엔드 개선**: routes, services, utils(백엔드) 및 components, stores(프론트엔드) 전반 개선 (@hiondal)

### 메뉴 관리 개선

- **utility/external 카테고리 관리 추가**: 런타임 메뉴에 utility 및 external 카테고리 관리 기능 추가 (@hiondal)
- **AI 추천 라벨 생성 확장**: 메뉴 항목의 AI 추천 라벨 생성 기능 확장 (@hiondal)
- **npd.json 런타임 메뉴 편집**: `ext-github-release-manager` 등록 반영 (@hiondal)

### plugin-standard-agent 개선

- **persona 필드 필수화**: plugin-standard-agent에서 `persona` 필드를 필수 항목으로 지정 (@hiondal)
- **role 필드 추가**: 에이전트 역할 명시를 위한 `role` 필드 추가 (@hiondal)

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)

---

## Fixed

없음 (이번 릴리스에서 별도 버그 수정 없음)

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)

---

## Breaking Changes

### Claude SDK 패키지 변경

- **이전 동작**: `@anthropic-ai/claude-code` 패키지를 사용하여 에이전트 실행
- **새로운 동작**: `@anthropic-ai/claude-agent-sdk` 패키지를 사용하여 에이전트 실행
- **영향 범위**: dmap 내부 SDK 사용 코드 및 관련 환경 설정
- **마이그레이션 방법**:
  ```bash
  # 기존 패키지 제거 후 신규 패키지 설치
  npm uninstall @anthropic-ai/claude-code
  npm install @anthropic-ai/claude-agent-sdk
  ```

(@hiondal)

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)

---

## Upgrade Guide

### From v1.1.6 to v1.1.7

1. **저장소 최신화**:
   ```bash
   git pull origin main
   ```

2. **Claude Agent SDK 패키지 전환** (Breaking Change 대응):
   ```bash
   # 기존 claude-code 패키지가 설치된 경우 제거
   npm uninstall @anthropic-ai/claude-code

   # 신규 claude-agent-sdk 설치
   npm install @anthropic-ai/claude-agent-sdk
   ```

3. **Node Modules 재설치** (권장):
   ```bash
   # 기존 node_modules 정리 후 재설치
   rm -rf node_modules
   npm install
   ```

4. **환경변수 확인**:
   - `CLAUDECODE` 환경변수가 설정되어 있다면 제거 (중첩 세션 방지 목적으로 SDK에서 처리)

5. **dmap-web 재시작** (dmap-web 사용 시):
   ```bash
   # Docker 환경
   docker-compose down && docker-compose up -d

   # 일반 환경
   npm run dev
   ```

### 주의사항

- **백업 권장**: 업그레이드 전 프로젝트 전체 백업 수행
- **테스트 환경 우선**: 프로덕션 환경에 적용하기 전 테스트 환경에서 검증
- **SDK 호환성**: `claude-agent-sdk`로 전환 후 기존 에이전트 동작을 반드시 검증

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)

---

## Contributors

We'd like to thank the following people for their contributions to this release:

- @hiondal - Claude Agent SDK 마이그레이션, dmap-web 대규모 개선, Bash 권한 자동 승인, Docker 배포 지원, NPD 플러그인 마켓플레이스 등록, publish 보안 강화, 메뉴 관리 개선

And special thanks to all contributors who reported issues and provided feedback!

(전체 1명의 기여자)

[Top](#v117---claude-agent-sdk-마이그레이션-및-dmap-web-개선)
