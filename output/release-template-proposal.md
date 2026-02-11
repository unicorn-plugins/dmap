# GitHub Release 문서 구성안

## 목차

- [시나리오 요약](#시나리오-요약)
- [수집된 외부 사례](#수집된-외부-사례)
  - [React (Facebook)](#react-facebook)
  - [Visual Studio Code (Microsoft)](#visual-studio-code-microsoft)
  - [Kubernetes](#kubernetes)
  - [Keep a Changelog](#keep-a-changelog)
- [Release 문서 구성안](#release-문서-구성안)
  - [필수 섹션](#필수-섹션)
  - [권장 섹션](#권장-섹션)
  - [선택 섹션](#선택-섹션)
- [섹션별 상세 가이드](#섹션별-상세-가이드)
  - [1 버전 및 날짜](#1-버전-및-날짜)
  - [2 주요 변경사항 요약](#2-주요-변경사항-요약)
  - [3 새로운 기능](#3-새로운-기능)
  - [4 개선사항](#4-개선사항)
  - [5 버그 수정](#5-버그-수정)
  - [6 Breaking Changes](#6-breaking-changes)
  - [7 업그레이드 가이드](#7-업그레이드-가이드)
  - [8 기여자 목록](#8-기여자-목록)
  - [9 보안 업데이트](#9-보안-업데이트)
  - [10 Deprecation 알림](#10-deprecation-알림)
- [권장 사항](#권장-사항)
  - [프로젝트 특성별 적용 가이드](#프로젝트-특성별-적용-가이드)
  - [작성 원칙](#작성-원칙)
  - [배포 및 커뮤니케이션](#배포-및-커뮤니케이션)

---

## 시나리오 요약

### 분석 목적

DMAP(선언형 멀티에이전트 플러그인) 프로젝트의 GitHub Release 문서 작성을 위한 최적의 구성안을 도출함.
외부 유명 오픈소스 프로젝트(React, VS Code, Kubernetes 등)의 Release 문서 모범 사례를 분석하여, 사용자 친화적이고 정보 전달력이 높은 Release 문서 템플릿을 제시함.

### 분석 범위

- **대상 프로젝트**: React, Visual Studio Code, Kubernetes, Keep a Changelog 표준
- **분석 항목**: Release 문서 구조, 섹션 구성, 내용 스타일, 사용자 경험
- **산출물**: Release 문서 구성안 및 섹션별 작성 가이드

[Top](#github-release-문서-구성안)

---

## 수집된 외부 사례

### React (Facebook)

**출처**: https://github.com/facebook/react/releases, https://github.com/facebook/react/blob/main/CHANGELOG.md

**구조적 특징**:
- 버전 및 날짜를 명확히 표시 (예: `## 19.2.1 (Dec 3, 2025)`)
- Release 블로그 포스트 링크 제공으로 상세 설명 보완
- 컴포넌트/기능별 섹션 분류 (React, React DOM, React Server Components 등)
- 각 변경사항에 PR 번호와 기여자 멘션 포함

**주요 섹션**:
1. 버전 및 날짜
2. 새로운 기능 (New React Features / New React DOM Features)
3. 주목할 변경사항 (Notable changes)
4. 전체 변경사항 목록 (All Changes)
5. 기여자 목록 (Contributors)

**예시**:
```markdown
## 19.2.1 (Dec 3, 2025)

### React Server Components

- Bring React Server Component fixes to Server Actions (@sebmarkbage #35277)

## 19.2.0 (October 1st, 2025)

Below is a list of all new features, APIs, and bug fixes.

Read the [React 19.2 release post] for more information.

### New React Features

- `<Activity>`: A new API to hide and restore the UI and internal state of its children.
- `useEffectEvent` is a React Hook that lets you extract non-reactive logic into an Effect Event.

### Notable changes

- React DOM now batches suspense boundary reveals, matching the behavior of client side rendering.
```

**강점**:
- 기술적 정확성과 상세함
- PR 링크로 추적 가능성 확보
- 컴포넌트별 분류로 사용자가 관심 영역을 빠르게 찾을 수 있음

[Top](#github-release-문서-구성안)

---

### Visual Studio Code (Microsoft)

**출처**: https://code.visualstudio.com/updates

**구조적 특징**:
- Release 날짜와 버전을 헤더에 명시
- Update 버전(예: 1.109.1, 1.109.2)을 별도로 표시하여 보안 이슈 대응 이력 공개
- 다운로드 링크를 상단에 배치하여 즉시 접근 가능
- 릴리스 테마와 로고를 활용한 브랜딩
- 기능 영역별 섹션 분류 (Chat UX, Agent Session Management, Workbench, Terminal 등)
- 스크린샷 및 GIF 이미지를 활용한 시각적 설명

**주요 섹션**:
1. 버전 및 날짜
2. Update 이력 (보안 이슈 등)
3. 다운로드 링크
4. Welcome 메시지 및 주요 테마 소개
5. 기능별 새로운 기능 및 개선사항 (구체적 하위 섹션으로 분류)
6. 시각 자료 (스크린샷, GIF)

**예시**:
```markdown
# January 2026 (version 1.109)

*Release date: February 4, 2026*

**Update 1.109.1**: The update addresses these security issues.
**Update 1.109.2**: The update addresses these issues.

Downloads: Windows: x64 Arm64 | Mac: Universal Intel silicon | Linux: deb rpm tarball Arm snap

Welcome to the January 2026 release of Visual Studio Code. In this release, we are further evolving VS Code to make it the home for multi-agent development.

- Chat UX - chat just feels better and snappier with faster streaming
- Agent Session Management - it's now easier to delegate tasks to agents
- Agent Customization - build your own workflows using agent orchestrations
```

**강점**:
- 사용자 중심의 스토리텔링 (Welcome 메시지로 릴리스 의도 전달)
- 다운로드 링크 제공으로 즉시 사용 가능
- 시각 자료로 이해도 향상
- Update 이력으로 신뢰성 확보

[Top](#github-release-문서-구성안)

---

### Kubernetes

**출처**: https://kubernetes.io/blog/2025/12/17/kubernetes-v1-35-release/

**구조적 특징**:
- Release 테마와 로고를 활용한 브랜딩 (예: "Timbernetes: The World Tree Release")
- 릴리스 통계 요약 (총 개선사항 수, Stable/Beta/Alpha 단계별 분류)
- Deprecation 및 제거 알림을 별도 섹션으로 강조
- 기능 단계별 분류 (Stable, Beta, Alpha)
- 업그레이드 가이드 링크 제공

**주요 섹션**:
1. 릴리스 테마 및 로고
2. 릴리스 통계 (총 개선사항 수, 단계별 분류)
3. Deprecation 및 제거 알림
4. 주요 기능 (Game-Changing Features)
5. Stable로 승격된 기능
6. Beta로 승격된 기능
7. 새로운 Alpha 기능
8. 업그레이드 가이드 링크

**예시**:
```markdown
# Kubernetes v1.35: Timbernetes (The World Tree Release)

By Kubernetes v1.35 Release Team | Wednesday, December 17, 2025

This release consists of 60 enhancements, including 17 stable, 19 beta, and 22 alpha features.

There are also some deprecations and removals in this release; make sure to read about those.

## Release theme and logo

![Kubernetes v1.35 Timbernetes logo]

2025 began in the shimmer of Octarine: The Color of Magic (v1.33) and rode the gusts Of Wind & Will (v1.34). We close the year with our hands on the World Tree...

## Deprecations and removals for Kubernetes v1.35

### cgroup v1 support

The removal of cgroup v1 support will only impact cluster administrators running nodes on older Linux distributions...

## Game-Changing Features

### 1. In-Place Pod Resource Updates: Finally GA!

After years of development and testing (alpha in v1.27, beta in v1.33), the ability to update Pod resources without restarting containers is finally graduating to General Availability in v1.35.
```

**강점**:
- 릴리스 테마로 커뮤니티 참여 유도
- 통계 요약으로 릴리스 규모 전달
- Deprecation 정보를 명확히 하여 운영자 대비 가능
- 기능 단계별 분류로 안정성 정보 제공

[Top](#github-release-문서-구성안)

---

### Keep a Changelog

**출처**: https://keepachangelog.com/en/1.1.0/

**구조적 특징**:
- Changelog 작성을 위한 표준 가이드라인 제공
- 변경사항을 카테고리별로 분류: Added, Changed, Deprecated, Removed, Fixed, Security
- Semantic Versioning 준수
- Unreleased 섹션으로 향후 변경사항 예고

**주요 카테고리**:
1. Added (새로운 기능)
2. Changed (기존 기능 변경)
3. Deprecated (곧 제거될 예정)
4. Removed (제거된 기능)
5. Fixed (버그 수정)
6. Security (보안 관련)

**예시**:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- v1.1 Brazilian Portuguese translation.

### Changed
- Use frontmatter title & description in each language version template

### Removed
- Trademark sign previously shown after the project description

## [1.1.1] - 2023-03-05

### Added
- Arabic translation (#444).

### Fixed
- Improve French translation (#377).
```

**강점**:
- 명확한 카테고리 분류로 변경사항 파악 용이
- 표준화된 포맷으로 일관성 유지
- Semantic Versioning으로 버전 의미 명확화

[Top](#github-release-문서-구성안)

---

## Release 문서 구성안

외부 사례 분석을 바탕으로 다음과 같은 Release 문서 구성안을 제안함.

### 필수 섹션

모든 Release 문서에 반드시 포함되어야 하는 섹션:

| 섹션 | 설명 |
|------|------|
| 버전 및 날짜 | 릴리스 버전과 배포 날짜를 명시 |
| 주요 변경사항 요약 | 이번 릴리스의 핵심 내용을 요약 (3-5개 항목) |
| 변경사항 상세 | Added, Changed, Fixed 등 카테고리별 변경사항 목록 |

### 권장 섹션

프로젝트 특성에 따라 포함을 권장하는 섹션:

| 섹션 | 설명 | 적용 대상 |
|------|------|-----------|
| Breaking Changes | 기존 사용 방식을 변경하는 호환성 변경사항 | Major 버전 업그레이드 시 필수 |
| 업그레이드 가이드 | 이전 버전에서 업그레이드하는 방법 | Breaking Changes가 있는 경우 |
| Deprecation 알림 | 향후 제거 예정인 기능 안내 | 안정적인 API를 제공하는 라이브러리/프레임워크 |
| 기여자 목록 | 이번 릴리스에 기여한 사람들 | 오픈소스 프로젝트 |

### 선택 섹션

필요에 따라 추가할 수 있는 섹션:

| 섹션 | 설명 | 적용 대상 |
|------|------|-----------|
| 릴리스 테마/로고 | 릴리스의 브랜딩 요소 | 커뮤니티 참여가 활발한 대형 프로젝트 |
| 릴리스 통계 | 개선사항 수, PR 수, 기여자 수 등 | 릴리스 규모를 강조하고 싶은 경우 |
| 다운로드 링크 | 바이너리 다운로드 링크 | 컴파일된 배포판을 제공하는 프로젝트 |
| 보안 업데이트 | 보안 취약점 수정 내역 | 보안 이슈가 포함된 경우 |
| 알려진 이슈 | 현재 버전에서 발견된 문제 | 중대한 미해결 이슈가 있는 경우 |

[Top](#github-release-문서-구성안)

---

## 섹션별 상세 가이드

### 1. 버전 및 날짜

**목적**: 릴리스를 명확히 식별하고 시간적 맥락 제공

**구조**:
```markdown
# v{Major}.{Minor}.{Patch} - {Release Name (선택)}

**Release Date**: YYYY-MM-DD
```

**예시**:
```markdown
# v0.3.0 - Multi-Agent Orchestration

**Release Date**: 2026-02-15
```

**작성 팁**:
- Semantic Versioning 준수 (Major.Minor.Patch)
- 날짜 형식은 ISO 8601 (YYYY-MM-DD) 권장
- Release Name은 선택 사항이나, 대형 릴리스의 경우 테마를 부여하면 기억하기 쉬움

[Top](#github-release-문서-구성안)

---

### 2. 주요 변경사항 요약

**목적**: 사용자가 릴리스의 핵심 내용을 빠르게 파악

**구조**:
```markdown
## Highlights

- 핵심 기능 1
- 핵심 기능 2
- 핵심 기능 3
```

**예시**:
```markdown
## Highlights

- **병렬 실행 지원**: 여러 에이전트가 동시에 작업을 수행하여 실행 시간을 최대 5배 단축
- **외부 스킬 통합**: GitHub, Slack, Jira 등 외부 서비스와의 통합을 위한 External 스킬 표준 추가
- **성능 개선**: 대규모 프로젝트에서 초기 로딩 시간 60% 감소
```

**작성 팁**:
- 3-5개 항목으로 제한 (너무 많으면 초점 흐려짐)
- 사용자에게 가장 중요한 영향을 주는 변경사항 위주로 선정
- 각 항목은 한 문장으로 요약하되, 볼드체로 키워드 강조
- 기술적 세부사항보다는 사용자 가치(User Value) 중심으로 작성

[Top](#github-release-문서-구성안)

---

### 3. 새로운 기능

**목적**: 이번 릴리스에서 새롭게 추가된 기능 소개

**구조**:
```markdown
## Added

### 기능 카테고리 1

- **기능 이름**: 기능 설명 (#PR번호, @기여자)
  - 상세 설명 (필요 시)
  - 사용 예시 (필요 시)

### 기능 카테고리 2

- **기능 이름**: 기능 설명 (#PR번호, @기여자)
```

**예시**:
```markdown
## Added

### Agent Orchestration

- **Parallel Execution**: 여러 에이전트가 독립적인 작업을 동시에 실행할 수 있는 병렬 실행 엔진 추가 (#45, @user1)
  - 작업 의존성 그래프를 자동으로 분석하여 병렬화 가능한 작업 식별
  - 최대 5개 에이전트 동시 실행 지원
  - 예시: `/dmap:develop-plugin --parallel`

### External Integration

- **External Skill Standard**: 외부 서비스 통합을 위한 표준 스킬 인터페이스 정의 (#52, @user2)
  - GitHub, Slack, Jira 등 주요 서비스 지원
  - 커스텀 External 스킬 개발 가이드 제공
```

**작성 팁**:
- Keep a Changelog의 "Added" 카테고리 활용
- 기능을 카테고리별로 그룹화하여 가독성 향상
- PR 번호와 기여자를 명시하여 추적 가능성 확보
- 중요한 기능은 사용 예시나 상세 설명 추가
- 사용자 관점에서 "무엇을 할 수 있게 되었는가" 중심으로 작성

[Top](#github-release-문서-구성안)

---

### 4. 개선사항

**목적**: 기존 기능의 향상 내용 전달

**구조**:
```markdown
## Changed

- **개선 항목**: 변경 내용 설명 (#PR번호, @기여자)
```

**예시**:
```markdown
## Changed

- **에이전트 응답 속도**: Haiku 모델 사용 시 응답 속도 40% 개선 (#48, @user3)
- **에러 메시지**: 사용자 친화적인 에러 메시지로 개선하여 문제 해결 시간 단축 (#50, @user4)
- **문서 구조**: skills/ 디렉토리 구조를 표준화하여 플러그인 개발 편의성 향상 (#53, @user5)
```

**작성 팁**:
- 성능 개선은 구체적인 수치로 표현 (%, 배수 등)
- 사용자 경험(UX) 개선사항 강조
- Breaking Change가 아닌 하위 호환성 유지 변경사항만 포함

[Top](#github-release-문서-구성안)

---

### 5. 버그 수정

**목적**: 해결된 문제 목록 제공

**구조**:
```markdown
## Fixed

- **버그 설명**: 수정 내용 (#Issue번호, #PR번호, @기여자)
```

**예시**:
```markdown
## Fixed

- **Windows 경로 처리 오류**: Windows 환경에서 파일 경로가 올바르게 처리되지 않던 문제 수정 (#42, #47, @user6)
- **메모리 누수**: 장시간 실행 시 메모리 사용량이 계속 증가하던 문제 해결 (#44, #49, @user7)
- **YAML 파싱 오류**: 특수 문자가 포함된 YAML 파일 파싱 실패 문제 수정 (#46, #51, @user8)
```

**작성 팁**:
- 버그의 증상과 영향을 명확히 설명
- Issue 번호와 PR 번호를 모두 명시 (추적 가능성)
- 사용자에게 영향이 큰 버그부터 나열
- 기술적 세부사항보다는 사용자가 경험했던 문제 중심으로 작성

[Top](#github-release-문서-구성안)

---

### 6. Breaking Changes

**목적**: 하위 호환성을 깨는 변경사항을 명확히 알려 사용자가 대비

**구조**:
```markdown
## Breaking Changes

### 변경 항목

- **이전 동작**: 기존 동작 설명
- **새로운 동작**: 변경된 동작 설명
- **마이그레이션 방법**: 코드 변경 방법

(#PR번호, @기여자)
```

**예시**:
```markdown
## Breaking Changes

### 스킬 디렉토리 구조 변경

- **이전 동작**: 스킬은 `.claude/skills/` 디렉토리에 위치
- **새로운 동작**: 스킬은 `skills/` 디렉토리에 위치 (`.claude/skills/`는 Deprecated)
- **마이그레이션 방법**:
  ```bash
  # 기존 스킬을 새 위치로 이동
  mv .claude/skills/* skills/
  ```

(#55, @user9)

### Agent Card 필수 필드 추가

- **이전 동작**: `agentcard.yaml`에 `name`, `role`, `tier`만 필수
- **새로운 동작**: `capabilities` 필드 추가 필수
- **마이그레이션 방법**:
  ```yaml
  # agentcard.yaml에 capabilities 추가
  capabilities:
    - file_operations
    - code_execution
  ```

(#58, @user10)
```

**작성 팁**:
- Breaking Change는 반드시 별도 섹션으로 명확히 강조
- 이전 동작과 새로운 동작을 명확히 비교
- 마이그레이션 방법을 구체적인 코드 예시와 함께 제공
- Major 버전 업그레이드 시에만 Breaking Change 허용 (Semantic Versioning 준수)

[Top](#github-release-문서-구성안)

---

### 7. 업그레이드 가이드

**목적**: 이전 버전에서 새 버전으로 업그레이드하는 절차 안내

**구조**:
```markdown
## Upgrade Guide

### From v{이전버전} to v{새버전}

1. 단계 1
2. 단계 2
3. 단계 3

### 주의사항

- 주의사항 1
- 주의사항 2
```

**예시**:
```markdown
## Upgrade Guide

### From v0.2.x to v0.3.0

1. **의존성 업데이트**:
   ```bash
   npm install @dmap/cli@latest
   ```

2. **스킬 디렉토리 이동** (Breaking Change 대응):
   ```bash
   # .claude/skills/ → skills/
   mv .claude/skills/* skills/
   ```

3. **Agent Card 업데이트**:
   - 모든 `agentcard.yaml` 파일에 `capabilities` 필드 추가
   - 예시:
     ```yaml
     capabilities:
       - file_operations
       - code_execution
     ```

4. **설정 파일 마이그레이션**:
   ```bash
   # 자동 마이그레이션 스크립트 실행
   dmap migrate-config
   ```

### 주의사항

- **백업 권장**: 업그레이드 전 프로젝트 전체 백업 수행
- **테스트 환경 우선**: 프로덕션 환경에 적용하기 전 테스트 환경에서 검증
- **플러그인 호환성**: 기존 커스텀 플러그인이 있는 경우 호환성 확인 필요
```

**작성 팁**:
- 순차적인 단계로 작성하여 따라하기 쉽게 구성
- 자동화 스크립트가 있다면 제공
- 백업 및 테스트 권장사항 명시
- 예상 소요 시간 안내 (선택 사항)

[Top](#github-release-문서-구성안)

---

### 8. 기여자 목록

**목적**: 오픈소스 커뮤니티에 감사 표시 및 참여 유도

**구조**:
```markdown
## Contributors

We'd like to thank the following people for their contributions to this release:

- @contributor1
- @contributor2
- @contributor3

(전체 N명의 기여자)
```

**예시**:
```markdown
## Contributors

We'd like to thank the following people for their contributions to this release:

- @user1 - Parallel execution engine
- @user2 - External skill standard
- @user3 - Performance optimization
- @user4 - Documentation improvements
- @user5 - Bug fixes

And special thanks to all contributors who reported issues and provided feedback!

(전체 12명의 기여자)
```

**작성 팁**:
- GitHub 자동 생성 기능 활용 가능 (Releases → "Generate release notes")
- 주요 기여자는 기여 내용과 함께 명시
- 이슈 리포팅, 문서 작성, 코드 리뷰 등 다양한 기여 유형 인정
- 오픈소스 프로젝트에 특히 중요 (커뮤니티 참여 유도)

[Top](#github-release-문서-구성안)

---

### 9. 보안 업데이트

**목적**: 보안 취약점 수정 내역을 명확히 전달하여 사용자의 빠른 업그레이드 유도

**구조**:
```markdown
## Security

### CVE-YYYY-NNNNN: 취약점 제목

- **심각도**: Critical / High / Medium / Low
- **영향 범위**: 영향 받는 버전 및 컴포넌트
- **설명**: 취약점 설명
- **해결 방법**: 업그레이드 권장 버전

(#PR번호, @기여자)
```

**예시**:
```markdown
## Security

### CVE-2026-12345: Command Injection in External Skill Execution

- **심각도**: High
- **영향 범위**: v0.1.0 ~ v0.2.5의 External 스킬 실행 모듈
- **설명**: 외부 스킬 실행 시 사용자 입력을 충분히 검증하지 않아 임의 명령어 실행 가능
- **해결 방법**: v0.3.0 이상으로 즉시 업그레이드 권장

(#60, @security-team)

### Dependency Update: Lodash XSS Vulnerability

- **심각도**: Medium
- **영향 범위**: 모든 버전 (Lodash 의존성)
- **설명**: Lodash 라이브러리의 XSS 취약점으로 인한 보안 이슈
- **해결 방법**: Lodash 4.17.21 → 4.17.22 업데이트

(#62, @user11)
```

**작성 팁**:
- CVE 번호가 있으면 명시 (공식 취약점 데이터베이스 연동)
- 심각도(Severity)를 명확히 표시
- 영향 범위를 구체적으로 명시하여 사용자가 자신의 환경이 영향 받는지 판단 가능하게 함
- 즉시 업그레이드가 필요한 경우 강조
- 보안 취약점은 별도 섹션으로 분리하여 눈에 띄게 배치

[Top](#github-release-문서-구성안)

---

### 10. Deprecation 알림

**목적**: 향후 제거 예정인 기능을 미리 알려 사용자가 대비할 시간 제공

**구조**:
```markdown
## Deprecated

### 기능/API 이름

- **Deprecated 버전**: vX.Y.Z
- **제거 예정 버전**: vX.Y.Z
- **사유**: Deprecation 이유
- **대안**: 대체 기능/API

(#PR번호)
```

**예시**:
```markdown
## Deprecated

### .claude/skills/ 디렉토리

- **Deprecated 버전**: v0.3.0
- **제거 예정 버전**: v1.0.0
- **사유**: 표준화된 디렉토리 구조 적용을 위해 `skills/` 디렉토리로 통합
- **대안**: `skills/` 디렉토리 사용
  ```bash
  # 마이그레이션 방법
  mv .claude/skills/* skills/
  ```

(#55)

### Legacy Agent Protocol

- **Deprecated 버전**: v0.3.0
- **제거 예정 버전**: v0.5.0
- **사유**: 새로운 Agent Card 표준으로 대체
- **대안**: `agentcard.yaml` 형식으로 변환
  - 마이그레이션 가이드: [Agent Card 마이그레이션](docs/migration.md)

(#57)
```

**작성 팁**:
- Deprecation은 제거 전 최소 1개 Major 버전 이전에 알림 (예: v0.3에서 Deprecated → v1.0에서 제거)
- 대안을 반드시 제공하여 사용자가 마이그레이션 가능하게 함
- 제거 예정 버전을 명확히 명시
- 자동 마이그레이션 도구 제공 시 안내

[Top](#github-release-문서-구성안)

---

## 권장 사항

### 프로젝트 특성별 적용 가이드

#### 1. 라이브러리/프레임워크 프로젝트

**포함 필수 섹션**:
- 버전 및 날짜
- Breaking Changes (Major 버전 시)
- Added / Changed / Fixed
- Deprecation 알림
- 업그레이드 가이드
- 기여자 목록

**특징**:
- API 변경사항에 대한 상세한 설명 필요
- 코드 예시를 많이 포함하여 개발자가 즉시 적용 가능하게 함
- Breaking Change 최소화 (Semantic Versioning 엄격히 준수)

#### 2. CLI 도구 프로젝트

**포함 필수 섹션**:
- 버전 및 날짜
- 주요 변경사항 요약
- Added / Changed / Fixed
- 다운로드 링크 (바이너리 제공 시)

**특징**:
- 새로운 명령어나 옵션 추가 시 사용 예시 제공
- 설치 방법 업데이트 (패키지 매니저별)
- 플랫폼별 차이점 명시 (Windows, macOS, Linux)

#### 3. 애플리케이션/서비스 프로젝트

**포함 필수 섹션**:
- 버전 및 날짜
- 주요 변경사항 요약 (Highlights)
- Added / Changed / Fixed
- 알려진 이슈

**특징**:
- 사용자 관점의 기능 설명 (기술적 세부사항 최소화)
- 스크린샷이나 GIF를 활용한 시각적 설명
- 사용자 경험(UX) 개선사항 강조

#### 4. DMAP 프로젝트 (본 프로젝트)

**포함 권장 섹션**:
- 버전 및 날짜
- 주요 변경사항 요약
- Added (새 스킬, 새 에이전트 등)
- Changed (성능 개선, 사용성 개선 등)
- Fixed (버그 수정)
- Breaking Changes (스킬 인터페이스 변경 시)
- 업그레이드 가이드 (Breaking Changes 있는 경우)
- 기여자 목록

**특징**:
- 플러그인/스킬 개발자를 위한 API 변경사항 상세 설명
- 예제 플러그인 링크 제공
- 에이전트 추가/변경 시 역할 및 사용 사례 명시

[Top](#github-release-문서-구성안)

---

### 작성 원칙

#### 1. 사용자 중심 작성

**DO**:
- ✅ "이제 여러 에이전트가 동시에 작업을 수행하여 실행 시간이 5배 빨라졌습니다"
- ✅ "에러 메시지가 더 명확해져서 문제 해결이 쉬워졌습니다"

**DON'T**:
- ❌ "TaskExecutor 클래스에 parallel_mode 파라미터 추가"
- ❌ "refactored error handling module"

**원칙**:
- 기술적 세부사항보다는 사용자 가치(User Value) 중심
- "무엇이 가능해졌는가", "무엇이 개선되었는가" 초점
- 전문 용어 사용 시 설명 추가

#### 2. 명확하고 간결하게

**DO**:
- ✅ "Windows 환경에서 파일 경로 처리 오류 수정"
- ✅ "대규모 프로젝트(1000+ 파일)에서 로딩 시간 60% 감소"

**DON'T**:
- ❌ "Fixed some bugs"
- ❌ "Performance improvements"

**원칙**:
- 모호한 표현 지양 ("some", "various", "several" 등)
- 구체적인 수치 제시 (%, 배수, 절대값 등)
- 한 문장에 한 가지 내용만

#### 3. 구조화 및 계층화

**DO**:
- ✅ 카테고리별 분류 (Added, Changed, Fixed 등)
- ✅ 하위 섹션으로 기능 영역 그룹화
- ✅ 중요도 순으로 나열

**DON'T**:
- ❌ 모든 변경사항을 한 리스트에 나열
- ❌ 시간순으로만 나열

**원칙**:
- 사용자가 관심 있는 부분을 빠르게 찾을 수 있도록 구조화
- 계층적 구조(h2, h3 등)를 활용한 가독성 향상

#### 4. 추적 가능성 확보

**DO**:
- ✅ PR 번호 명시: `(#123)`
- ✅ 기여자 멘션: `(@username)`
- ✅ Issue 번호 링크: `Fixes #456`

**DON'T**:
- ❌ 출처 정보 없이 변경사항만 나열

**원칙**:
- 모든 변경사항에 PR 번호 포함
- 주요 기여자 명시로 오픈소스 커뮤니티 활성화
- GitHub 자동 링크 기능 활용

#### 5. 일관성 유지

**DO**:
- ✅ 동일한 포맷과 스타일 유지
- ✅ Semantic Versioning 준수
- ✅ Keep a Changelog 가이드 참고

**DON'T**:
- ❌ 릴리스마다 다른 구조 사용
- ❌ 버전 번호 규칙 불일치

**원칙**:
- 템플릿을 정하고 모든 릴리스에 일관되게 적용
- 팀 내 Release Notes 작성 가이드라인 문서화

[Top](#github-release-문서-구성안)

---

### 배포 및 커뮤니케이션

#### 1. GitHub Release 활용

- **자동 생성 기능**: GitHub Releases의 "Generate release notes" 기능으로 PR 목록 자동 생성 후 편집
- **Assets 첨부**: 바이너리, 소스코드, 문서 등 다운로드 가능한 파일 첨부
- **Pre-release 표시**: 베타 버전이나 RC 버전은 "Pre-release" 체크

#### 2. 다채널 배포

Release Notes를 다양한 채널에 배포하여 도달률 향상:

| 채널 | 목적 |
|------|------|
| GitHub Releases | 공식 릴리스 기록 (개발자 대상) |
| CHANGELOG.md | 저장소 내 이력 관리 |
| 블로그 포스트 | 상세 설명 및 튜토리얼 (일반 사용자 대상) |
| 소셜 미디어 | 요약 및 Highlights 공유 |
| 이메일 뉴스레터 | 구독자 대상 직접 알림 |
| Slack/Discord | 커뮤니티 즉시 알림 |

#### 3. 타이밍

- **정기 릴리스**: 일정한 주기(예: 매월, 분기별) 유지
- **긴급 패치**: 보안 이슈나 치명적 버그는 즉시 릴리스
- **공지 기간**: 주요 Breaking Change가 있는 경우 사전 공지 (베타 릴리스 등)

#### 4. 피드백 수집

Release Notes 배포 후 피드백 수집:
- GitHub Discussions 또는 Issues를 통한 질문 접수
- 사용자 설문조사 (릴리스 만족도, 문서 품질 등)
- 커뮤니티 채널(Slack, Discord)에서 반응 모니터링

[Top](#github-release-문서-구성안)

---

## 결론

본 구성안은 React, Visual Studio Code, Kubernetes, Keep a Changelog 등 업계 선도 프로젝트의 Release 문서 모범 사례를 분석하여 도출됨.

**핵심 요약**:
1. **필수 섹션**: 버전/날짜, 주요 변경사항 요약, Added/Changed/Fixed
2. **사용자 중심**: 기술 세부사항보다 사용자 가치 전달에 초점
3. **명확성**: 구체적이고 측정 가능한 표현 사용
4. **추적 가능성**: PR 번호, 기여자 명시
5. **일관성**: 템플릿 기반 작성으로 프로젝트 전반에 일관된 경험 제공

DMAP 프로젝트에 본 구성안을 적용하여 사용자 친화적이고 정보 전달력이 높은 Release 문서를 작성할 것을 권장함.

[Top](#github-release-문서-구성안)
