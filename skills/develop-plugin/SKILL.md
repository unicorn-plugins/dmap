---
name: develop-plugin
description: DMAP 플러그인 개발 (4-Phase 워크플로우)
type: orchestrator
user-invocable: true
---

# Develop Plugin

[DEVELOP-PLUGIN 활성화]

## 목표

사용자의 요구사항 정의서를 기반으로 DMAP 표준에 맞는 플러그인을 자동 생성함.
4-Phase 워크플로우를 순차 수행하며, 각 Phase 완료 시 사용자 승인을 받음.

## 활성화 조건

사용자가 `/dmap:develop-plugin` 호출 시 또는 "플러그인 만들어줘", "DMAP 플러그인 개발" 키워드 감지 시.

## 참조

| 문서 | 경로 | 용도 |
|------|------|------|
| 플러그인 개발 가이드 | `resources/guides/plugin/plugin-dev-guide.md` | 상세 워크플로우 참조 |
| DMAP 빌더 표준 | `standards/plugin-standard.md` | 디렉토리 구조, 배포, 네임스페이스 |
| Agent 표준 | `standards/plugin-standard-agent.md` | 에이전트 패키지 작성 규칙 |
| Skill 표준 | `standards/plugin-standard-skill.md` | 스킬 작성 규칙, 유형별 템플릿 |
| Gateway 표준 | `standards/plugin-standard-gateway.md` | install.yaml, runtime-mapping.yaml 작성 |
| 리소스 마켓플레이스 | `resources/plugin-resources.md` | 공유 자원 카탈로그 |
| README 템플릿 | `resources/templates/plugin/README-plugin-template.md` | README.md 작성 참고 |
| README 예제 | `resources/samples/plugin/README.md` | README.md 작성 예시 |
| Publish 스킬 | `skills/publish/SKILL.md` | GitHub 배포 자동화 |

## 스킬 부스팅

| 단계 | 부스팅 스킬 | 용도 |
|------|------------|------|
| Phase 2 Step 3 | `/oh-my-claudecode:ralplan` | 개발 계획서 작성 (Planner+Architect+Critic 합의) |
| Phase 3 | `/oh-my-claudecode:ralph` | 플러그인 개발 실행 (완료까지 지속) |

## 워크플로우

### Phase 1: 요구사항 수집

요구사항 정의서를 분석하고, 부족한 정보를 사용자에게 문의하여 수집함.

**Step 1. 요구사항 파악**

사용자가 제공한 요구사항 정의서의 각 항목을 분석함.

요구사항 정의서 탐색 순서:
1. `{GEN-DMAP 프로젝트}/output/requirement-{플러그인명}.md` 파일이 존재하면 자동 로드하여 사용
   (requirement-writer 스킬로 사전 작성된 정의서)
2. 사용자가 메시지에 정의서 내용을 직접 포함한 경우 해당 내용 사용
3. 위 두 경우에 해당하지 않으면 `resources/guides/plugin/plugin-dev-guide.md`의
   "요구사항 정의서 > 정의서 작성 양식"을 참고하여
   사용자에게 핵심 항목(플러그인명, 목적, 핵심기능, 사용자 플로우)을 문의함

**Step 2. 플러그인 적합여부 판단**

요구사항이 DMAP 플러그인으로 구현하기 적합한지 판단함.

| 기준 | 적합 | 부적합 |
|------|------|--------|
| 반복 가능성 | 반복 사용할 워크플로우 | 일회성 작업 |
| 역할 분리 | 2개 이상 전문가 역할 필요 | 단일 작업 수행 |
| 도구 의존성 | 외부 도구/API 연동 필요 | 순수 대화만으로 해결 |
| 도메인 지식 | 특정 도메인 가이드/참조 필요 | 범용 지식으로 충분 |

부적합 시 사용자에게 검토결과 및 보완사항 추천.

**Step 3. 사용자에게 문의하여 정보 수집**

요구사항 정의서에서 누락되거나 모호한 항목을 파악하여 AskUserQuestion 도구로 문의함.

기본 확인 항목:
- 미작성 필수 항목 (플러그인명, 목적, 핵심기능, 사용자 플로우)
- 핵심기능과 사용자 플로우 간 불일치
- 에이전트 역할 구분이 필요한 부분
- 외부 시스템 연동 여부 (API, DB, 파일 시스템 등)
- 기술 요건 (프로그래밍 언어, 프레임워크, 프로토콜, 데이터 형식 등)

**Step 4. 요구사항 정의서 업데이트**

수집된 정보를 반영하여 완성된 정의서를 `plugin-samples/{플러그인명}/requirements.md`에 저장함.

> **Phase 1 완료**: 업데이트된 요구사항 정의서를 사용자에게 보고하고 승인 요청.

### Phase 2: 설계 및 계획

수집된 요구사항을 기반으로 플러그인 구조를 설계하고 개발 계획 수립.

**Step 1. 공유 자원 선택**

`resources/plugin-resources.md`를 참조하여 플러그인에 활용할 공유 자원 선별.

| 자원 유형 | 선택 기준 |
|----------|----------|
| 가이드 | 개발에 참고할 기술 가이드 |
| 템플릿 | 산출물 생성에 활용할 템플릿 |
| 샘플 | 구현 참고용 샘플 코드/패턴 |
| 도구 | 개발/검증에 필요한 도구 |

**Step 2. 플러그인 구조 설계**

DMAP 표준에 맞춰 플러그인의 전체 구조 설계.

| 설계 항목 | 참조 표준 |
|----------|----------|
| 에이전트 구성 (이름, 티어, 도구) | `standards/plugin-standard-agent.md` |
| 스킬 구성 (목록, 유형) | `standards/plugin-standard-skill.md` |
| Gateway 설정 (티어·도구·액션 매핑) | `standards/plugin-standard-gateway.md` |
| 디렉토리 구조 | `standards/plugin-standard.md` |

**Step 3. 개발 계획 수립 (스킬 부스팅)**

`/oh-my-claudecode:ralplan` 스킬을 사용하여 개발 계획서 작성.

개발 계획서 포함 사항:
- 공유자원 마켓플레이스에서 가져갈 자원 목록
- 개발할 커스텀 앱 또는 커스텀 CLI 파악 및 개발 계획
- 공유자원 외 필요한 외부 자원 파악 및 수집 계획
- DMAP 표준 산출물 목록 및 생성 순서

결과 파일: `plugin-samples/{플러그인명}/develop-plan.md`

**Step 4. 사용자 검토 및 보완**

사용자에게 개발 계획서 검토 요청.
피드백에 따라 계획서 보완 후 재승인.

> **Phase 2 완료**: 확정된 개발 계획서를 사용자에게 보고하고 개발 착수 승인 요청.

### Phase 3: 플러그인 개발 (스킬 부스팅)

`/oh-my-claudecode:ralph` 스킬을 사용하여 개발 계획서에 따라 플러그인 개발.

개발 순서:
1. 플러그인 스켈레톤 생성 (`.claude-plugin/`, 디렉토리 구조)
2. `.gitignore` 생성 (`.dmap/secrets/`, `__pycache__/`, `.env` 등 보안·임시 파일 제외)
3. Gateway 설정 (`install.yaml`, `runtime-mapping.yaml`)
4. 공유자원 복사 (리소스 마켓플레이스 → 플러그인 디렉토리)
5. 에이전트 개발 (`AGENT.md`, `agentcard.yaml`, `tools.yaml`)
6. 스킬 개발 (setup 필수, help 권장, 기능 스킬)
7. commands/ 진입점 생성
8. 커스텀 앱/CLI 개발 (필요 시)
9. README.md 작성

> 각 단계의 상세 내용은 `resources/guides/plugin/plugin-dev-guide.md`의 Phase 3 참조.

> **Phase 3 완료**: 개발된 플러그인의 구조와 기능을 사용자에게 보고하고 검증 착수 승인 요청.

### Phase 4: 검증 및 완료

개발된 플러그인이 DMAP 표준을 준수하는지 최종 검증.

**Step 1. 전체 검증**

| 검증 항목 | 확인 내용 |
|----------|----------|
| 필수 파일 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 존재 |
| 에이전트 쌍 | 모든 에이전트에 `AGENT.md` + `agentcard.yaml` 존재 |
| 스킬 구조 | 모든 스킬에 `SKILL.md` 존재, frontmatter 포함 |
| setup 스킬 | setup 스킬 존재 |
| help 스킬 (권장) | help 유틸리티 스킬 존재, 즉시 출력 방식 |
| Gateway | `install.yaml` + `runtime-mapping.yaml` 존재 |
| 슬래시 명령 | `commands/` 진입점 파일 존재 |
| 도구 매핑 | `tools.yaml`의 추상 도구가 `runtime-mapping.yaml`에 매핑 |
| 티어 매핑 | `agentcard.yaml`의 tier가 `runtime-mapping.yaml`에 매핑 |
| README | 필수 섹션(개요, 설치, 업그레이드, 사용법, 요구사항, 라이선스) 포함 |

**Step 2. 사용자에게 개발완료 보고**

최종 산출물 요약 보고:
- 플러그인 디렉토리 구조 (트리)
- 생성된 에이전트/스킬 목록
- 슬래시 명령 목록
- 설치 방법

**Step 3. 공유자원 등록 (선택)**

플러그인 개발 과정에서 새로 만든 커스텀 앱/CLI가 범용적이면
`resources/` 마켓플레이스에 등록하여 다른 플러그인에서도 재사용 가능하게 함.

> **Phase 4 완료**: 플러그인 개발 완료. 사용자에게 최종 보고.

### 다음 단계: GitHub 배포 → Skill: publish

- **INTENT**: 개발 완료된 플러그인을 GitHub에 배포하여 마켓플레이스에 등록 가능하게 함
- **ARGS**: 플러그인 디렉토리 경로, 플러그인명
- **RETURN**: GitHub 저장소 생성 완료, 마켓플레이스 등록 명령어 안내

Phase 4 완료 보고 후 사용자에게 GitHub 배포 여부를 문의함.
사용자가 동의하면 `/dmap:publish` 스킬로 전환.

## 완료 조건

- 4-Phase 모두 사용자 승인 완료
- 검증 항목 전체 통과
- README.md 필수 섹션 포함

## 취소/재개

- 취소: `/oh-my-claudecode:cancel` 또는 사용자 요청 시 즉시 중단
- 재개: 마지막 완료된 Phase부터 재시작 가능
