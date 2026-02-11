# v{Major}.{Minor}.{Patch} - {Release Name (선택)}

**Release Date**: YYYY-MM-DD

<!--
작성 가이드:
- Semantic Versioning 준수 (Major.Minor.Patch)
- 날짜 형식은 ISO 8601 (YYYY-MM-DD) 권장
- Release Name은 선택 사항이나, 대형 릴리스의 경우 테마를 부여하면 기억하기 쉬움
예시: v0.3.0 - Multi-Agent Orchestration
-->

---

## Highlights

<!--
작성 가이드:
- 3-5개 항목으로 제한 (너무 많으면 초점 흐려짐)
- 사용자에게 가장 중요한 영향을 주는 변경사항 위주로 선정
- 각 항목은 한 문장으로 요약하되, 볼드체로 키워드 강조
- 기술적 세부사항보다는 사용자 가치(User Value) 중심으로 작성

예시:
- **병렬 실행 지원**: 여러 에이전트가 동시에 작업을 수행하여 실행 시간을 최대 5배 단축
- **외부 스킬 통합**: GitHub, Slack, Jira 등 외부 서비스와의 통합을 위한 External 스킬 표준 추가
- **성능 개선**: 대규모 프로젝트에서 초기 로딩 시간 60% 감소
-->

- **주요 기능 1**: 설명
- **주요 기능 2**: 설명
- **주요 기능 3**: 설명

[Top](#v{major}{minor}{patch}---release-name-선택)

---

## Added

<!--
작성 가이드:
- 이번 릴리스에서 새롭게 추가된 기능 소개
- 기능을 카테고리별로 그룹화하여 가독성 향상
- PR 번호와 기여자를 명시하여 추적 가능성 확보
- 중요한 기능은 사용 예시나 상세 설명 추가
- 사용자 관점에서 "무엇을 할 수 있게 되었는가" 중심으로 작성

예시:
### Agent Orchestration

- **Parallel Execution**: 여러 에이전트가 독립적인 작업을 동시에 실행할 수 있는 병렬 실행 엔진 추가 (#45, @user1)
  - 작업 의존성 그래프를 자동으로 분석하여 병렬화 가능한 작업 식별
  - 최대 5개 에이전트 동시 실행 지원
  - 예시: `/dmap:develop-plugin --parallel`
-->

### 기능 카테고리 1

- **기능 이름**: 기능 설명 (#PR번호, @기여자)
  - 상세 설명 (필요 시)
  - 사용 예시 (필요 시)

### 기능 카테고리 2

- **기능 이름**: 기능 설명 (#PR번호, @기여자)

[Top](#v{major}{minor}{patch}---release-name-선택)

---

## Changed

<!--
작성 가이드:
- 기존 기능의 향상 내용 전달
- 성능 개선은 구체적인 수치로 표현 (%, 배수 등)
- 사용자 경험(UX) 개선사항 강조
- Breaking Change가 아닌 하위 호환성 유지 변경사항만 포함

예시:
- **에이전트 응답 속도**: Haiku 모델 사용 시 응답 속도 40% 개선 (#48, @user3)
- **에러 메시지**: 사용자 친화적인 에러 메시지로 개선하여 문제 해결 시간 단축 (#50, @user4)
- **문서 구조**: skills/ 디렉토리 구조를 표준화하여 플러그인 개발 편의성 향상 (#53, @user5)
-->

- **개선 항목**: 변경 내용 설명 (#PR번호, @기여자)

[Top](#v{major}{minor}{patch}---release-name-선택)

---

## Fixed

<!--
작성 가이드:
- 해결된 문제 목록 제공
- 버그의 증상과 영향을 명확히 설명
- Issue 번호와 PR 번호를 모두 명시 (추적 가능성)
- 사용자에게 영향이 큰 버그부터 나열
- 기술적 세부사항보다는 사용자가 경험했던 문제 중심으로 작성

예시:
- **Windows 경로 처리 오류**: Windows 환경에서 파일 경로가 올바르게 처리되지 않던 문제 수정 (#42, #47, @user6)
- **메모리 누수**: 장시간 실행 시 메모리 사용량이 계속 증가하던 문제 해결 (#44, #49, @user7)
- **YAML 파싱 오류**: 특수 문자가 포함된 YAML 파일 파싱 실패 문제 수정 (#46, #51, @user8)
-->

- **버그 설명**: 수정 내용 (#Issue번호, #PR번호, @기여자)

[Top](#v{major}{minor}{patch}---release-name-선택)

---

## Breaking Changes

<!--
작성 가이드:
- 하위 호환성을 깨는 변경사항을 명확히 알려 사용자가 대비
- Breaking Change는 반드시 별도 섹션으로 명확히 강조
- 이전 동작과 새로운 동작을 명확히 비교
- 마이그레이션 방법을 구체적인 코드 예시와 함께 제공
- Major 버전 업그레이드 시에만 Breaking Change 허용 (Semantic Versioning 준수)
- Breaking Changes가 없는 경우 이 섹션 전체를 제거

예시:
### 스킬 디렉토리 구조 변경

- **이전 동작**: 스킬은 `.claude/skills/` 디렉토리에 위치
- **새로운 동작**: 스킬은 `skills/` 디렉토리에 위치 (`.claude/skills/`는 Deprecated)
- **마이그레이션 방법**:
  ```bash
  # 기존 스킬을 새 위치로 이동
  mv .claude/skills/* skills/
  ```

(#55, @user9)
-->

### 변경 항목

- **이전 동작**: 기존 동작 설명
- **새로운 동작**: 변경된 동작 설명
- **마이그레이션 방법**: 코드 변경 방법
  ```bash
  # 마이그레이션 예시
  ```

(#PR번호, @기여자)

[Top](#v{major}{minor}{patch}---release-name-선택)

---

## Upgrade Guide

<!--
작성 가이드:
- 이전 버전에서 새 버전으로 업그레이드하는 절차 안내
- 순차적인 단계로 작성하여 따라하기 쉽게 구성
- 자동화 스크립트가 있다면 제공
- 백업 및 테스트 권장사항 명시
- Breaking Changes가 없는 경우 이 섹션 전체를 제거

예시:
### From v0.2.x to v0.3.0

1. **의존성 업데이트**:
   ```bash
   npm install @dmap/cli@latest
   ```

2. **스킬 디렉토리 이동** (Breaking Change 대응):
   ```bash
   mv .claude/skills/* skills/
   ```

3. **Agent Card 업데이트**:
   - 모든 `agentcard.yaml` 파일에 `capabilities` 필드 추가
-->

### From v{이전버전} to v{새버전}

1. **단계 1**:
   ```bash
   # 명령어
   ```

2. **단계 2**:
   ```bash
   # 명령어
   ```

3. **단계 3**:
   ```bash
   # 명령어
   ```

### 주의사항

- **백업 권장**: 업그레이드 전 프로젝트 전체 백업 수행
- **테스트 환경 우선**: 프로덕션 환경에 적용하기 전 테스트 환경에서 검증
- **플러그인 호환성**: 기존 커스텀 플러그인이 있는 경우 호환성 확인 필요

[Top](#v{major}{minor}{patch}---release-name-선택)

---

## Contributors

<!--
작성 가이드:
- 오픈소스 커뮤니티에 감사 표시 및 참여 유도
- GitHub 자동 생성 기능 활용 가능 (Releases → "Generate release notes")
- 주요 기여자는 기여 내용과 함께 명시
- 이슈 리포팅, 문서 작성, 코드 리뷰 등 다양한 기여 유형 인정

예시:
We'd like to thank the following people for their contributions to this release:

- @user1 - Parallel execution engine
- @user2 - External skill standard
- @user3 - Performance optimization
- @user4 - Documentation improvements
- @user5 - Bug fixes

And special thanks to all contributors who reported issues and provided feedback!

(전체 12명의 기여자)
-->

We'd like to thank the following people for their contributions to this release:

- @contributor1 - 주요 기여 내용
- @contributor2 - 주요 기여 내용
- @contributor3 - 주요 기여 내용

And special thanks to all contributors who reported issues and provided feedback!

(전체 N명의 기여자)

[Top](#v{major}{minor}{patch}---release-name-선택)
