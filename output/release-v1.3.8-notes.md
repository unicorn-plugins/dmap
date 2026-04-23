# v1.3.8 - Codex Routing & Skill Standard Refinement

**Release Date**: 2026-04-23

---

## Highlights

- **Codex 플러그인 실행 규칙 추가**: `/{plugin}:{skill}` 슬래시 명령을 Codex에서 일관되게 플러그인 실행으로 해석하는 기준 추가
- **스킬 표준 정교화**: 섹션 구조, 환경변수 로드, 진행상황 관리, 에이전트 호출 규칙을 더 구체적으로 표준화
- **에이전트 프롬프트 조립 경로 명확화**: FQN 기반 에이전트 디렉토리 해석 기준을 분명히 해 런타임 간 혼선을 줄임
- **개발 워크플로우 보강**: DMAP 플러그인 개발 시 Codex 런타임 대응 절차와 문서 규칙을 강화

[Top](#v138---codex-routing--skill-standard-refinement)

---

## Added

### Codex 실행 지침

- **Codex 플러그인 슬래시 명령 규칙 추가**: develop-plugin 스킬에 `~/.codex/AGENTS.md`용 슬래시 명령 처리 지침을 추가하여 Codex에서도 플러그인 marketplace 기반 실행 흐름을 일관되게 적용 (`HEAD`)

### 스킬 표준 가이드

- **작업 환경 변수 로드 섹션 정식화**: Router, Orchestrator, Setup 스킬에서 `AGENTS.md` 기반 환경변수 로드 규칙을 명시 (`HEAD`)
- **진행상황 업데이트 및 재개 규칙 추가**: Setup 및 Orchestrator 스킬이 `AGENTS.md`에 진행 상태를 기록하고 재개할 수 있는 표준 추가 (`HEAD`)
- **서브 역할 및 스킬 부스팅 표기 강화**: `sub_role` 표기와 스킬 부스팅 활용 규칙을 예시와 함께 보강 (`HEAD`)

[Top](#v138---codex-routing--skill-standard-refinement)

---

## Changed

- **플러그인 버전 업데이트**: `.claude-plugin/plugin.json` 버전을 `1.3.8`로 상향 (`HEAD`)
- **combine-prompt 경로 설명 개선**: FQN에서 에이전트 디렉토리를 해석할 때 `{PLUGIN_DIR}/agents/{에이전트 디렉토리}`를 기준으로 삼도록 문구 정리 (`HEAD`)
- **스킬 표준 문서 재구성**: 필수 섹션 표, 섹션별 작성 가이드, Setup/Router/Orchestrator 예시, 상태 기록 규칙을 전반적으로 재정비 (`HEAD`)
- **develop-plugin 워크플로우 보강**: Codex용 글로벌 AGENTS 지침 추가 절차를 포함해 플러그인 생성 후속 작업을 더 명확히 안내 (`HEAD`)

[Top](#v138---codex-routing--skill-standard-refinement)

---

## Fixed

- **에이전트 호출 규칙 표현 정리**: 에이전트 위임 표기와 예시 섹션을 최신 `Agent` 기반 흐름에 맞게 다듬어 표준 문서 해석 오류 가능성 감소 (`HEAD`)
- **런타임 지침 혼선 완화**: `AGENTS.md` 기준 환경변수 로드와 진행상황 기록 방식을 구체화해 런타임별 실행 편차 축소 (`HEAD`)

[Top](#v138---codex-routing--skill-standard-refinement)

---

## Breaking Changes

### 스킬 표준 문서 구조 강화

- **이전 동작**: 스킬 표준 섹션 구성이 상대적으로 느슨하고 프로젝트별로 해석 여지가 있었음
- **새로운 동작**: `작업 환경 변수 로드`, `진행상황 업데이트 및 재개`, `에이전트 호출 규칙` 등 목적별 표준 섹션을 더 엄격히 요구
- **마이그레이션 방법**: 기존 SKILL.md를 최신 표준 섹션명과 순서에 맞춰 정리하고, 필요한 경우 진행상황 기록 규칙을 추가
  ```markdown
  ## 작업 환경 변수 로드
  ## 진행상황 업데이트 및 재개
  ## 워크플로우
  ```

(`HEAD`)

### Codex 플러그인 실행 규칙 도입

- **이전 동작**: Codex에서 `/{plugin}:{skill}` 패턴이 전역 시스템 프롬프트 기준으로 일관되게 정의되지 않았음
- **새로운 동작**: Codex는 marketplace 조회 후 플러그인 루트 또는 캐시 버전을 따라 `SKILL.md`를 읽어 수행하는 기준을 사용
- **마이그레이션 방법**: Codex 기반 플러그인 개발 시 글로벌 `AGENTS.md`에 새 슬래시 명령 규칙을 반영
  ```markdown
  - `/{plugin}:{skill}` 형태의 슬래시 명령이 들어오면 플러그인 수행으로 간주함
  ```

(`HEAD`)

[Top](#v138---codex-routing--skill-standard-refinement)

---

## Upgrade Guide

### From v1.3.7 to v1.3.8

1. **버전 갱신**:
   `.claude-plugin/plugin.json`의 버전을 `1.3.8`로 업데이트

2. **스킬 표준 문서 반영**:
   기존 SKILL.md가 최신 필수 섹션 구조를 따르는지 점검

3. **Codex 대응 규칙 추가**:
   Codex 런타임을 지원하는 경우 글로벌 `AGENTS.md`에 플러그인 슬래시 명령 규칙 반영

4. **에이전트 경로 해석 확인**:
   FQN에서 에이전트 디렉토리를 찾는 기준이 `{PLUGIN_DIR}/agents/` 기반으로 설명되어 있는지 검토

### 주의사항

- **런타임별 검증 필요**: Claude Code와 Codex 모두에서 슬래시 명령 라우팅이 기대대로 동작하는지 확인 필요
- **문서 동기화 필요**: 표준 문서 변경 후 기존 스킬 예제와 생성 결과물도 함께 점검 권장

[Top](#v138---codex-routing--skill-standard-refinement)

---

## Contributors

We'd like to thank the following people for their contributions to this release:

- @hiondal - Codex 슬래시 명령 규칙 추가, 스킬 표준 재정비, 플러그인 개발 워크플로우 보강

And special thanks to all contributors who reported issues and provided feedback!

(전체 1명의 기여자)

[Top](#v138---codex-routing--skill-standard-refinement)
