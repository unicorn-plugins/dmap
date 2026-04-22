# npd 플러그인 명세

- [npd 플러그인 명세](#npd-플러그인-명세)
  - [기본 정보](#기본-정보)
  - [제공 스킬](#제공-스킬)
  - [실행 경로](#실행-경로)
  - [ARGS 스키마](#args-스키마)
    - [plan 스킬 ARGS](#plan-스킬-args)
    - [create 스킬 ARGS](#create-스킬-args)
    - [design 스킬 ARGS](#design-스킬-args)
    - [develop 스킬 ARGS](#develop-스킬-args)
    - [deploy 스킬 ARGS](#deploy-스킬-args)
  - [도메인 컨텍스트 수집 가이드](#도메인-컨텍스트-수집-가이드)
  - [선행 요구사항](#선행-요구사항)
  - [호출 예시](#호출-예시)
    - [Full Path (create → plan → design → develop → deploy)](#full-path-create--plan--design--develop--deploy)

---

## 기본 정보

| 항목 | 값 |
|------|---|
| 플러그인명 | npd |
| 설명 | 사람과 AI가 협업하여 새로운 프로젝트의 기획-설계-개발-배포 전 과정을 지원하는 플러그인 |
| 설치 | `claude plugin marketplace add unicorn-plugins/npd`, `claude plugin install npd@npd` |
| 저장소 | https://github.com/unicorn-plugins/npd |

[Top](#npd-플러그인-명세)

---

## 제공 스킬

| 스킬 | FQN | 유형 | 설명 |
|------|-----|------|------|
| create | `npd:create` | Core | 새 프로젝트 생성 — 모노레포 구조 초기화, domain-expert 동적 생성, GitHub 레포 자동 생성 |
| plan | `npd:plan` | Core | 기획 단계 AI 협업 — PO·서비스기획자·아키텍트·도메인전문가·AI엔지니어가 협업하여 기획 수행 |
| design | `npd:design` | Orchestrator | 설계 단계 AI 협업 — 아키텍트·AI엔지니어가 협업하여 아키텍처 패턴 선정 및 전체 설계 수행 |
| develop | `npd:develop` | Orchestrator | 개발 단계 AI 협업 — 백엔드·프론트엔드·AI엔지니어·QA가 협업하여 코드 생성 및 테스트 수행 |
| deploy | `npd:deploy` | Orchestrator | 배포 단계 AI 협업 — DevOps 엔지니어가 컨테이너 빌드·K8s 배포·CI/CD 파이프라인 구성 수행 |
| setup | `npd:setup` | Setup | NPD 플러그인 초기 설정 (MCP 서버 설치, GitHub 토큰 설정) |
| help | `npd:help` | Utility | NPD 플러그인 사용법 및 명령어 안내 |
| add-ext-skill | `npd:add-ext-skill` | Utility | 외부호출 스킬(ext-{대상플러그인}) 추가 유틸리티 |
| remove-ext-skill | `npd:remove-ext-skill` | Utility | 외부호출 스킬(ext-{대상플러그인}) 제거 유틸리티 |

[Top](#npd-플러그인-명세)

---

## 실행 경로

| 경로명 | 설명 | 스킬 체인 | 조건 |
|--------|------|----------|------|
| Full Path | NPD 전체 5단계 | create → plan → design → develop → deploy | 신규 프로젝트 전체 개발이 필요한 경우 |
| From Plan | 기획부터 시작 | plan → design → develop → deploy | 프로젝트 구조는 존재하나 기획이 필요한 경우 |
| From Design | 설계부터 시작 | design → develop → deploy | 기획 완료 후 설계·개발·배포만 필요한 경우 |
| From Develop | 개발만 | develop → deploy | 설계까지 완료 후 개발·배포만 필요한 경우 |

[Top](#npd-플러그인-명세)

---

## ARGS 스키마

External 스킬이 이 플러그인의 스킬을 호출할 때 전달 가능한 ARGS 키.
Skill→Skill 입력 전달 규약에 따라 `ARGS` 루트 키 아래에 JSON 구조로 전달.

### plan 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 경로 |
| mvp_topic | 선택 | MVP 주제 (예: "당뇨 환자 식단 관리 앱") |
| domain_context | 선택 | 도메인 컨텍스트 |
| requirement | 선택 | 추가 요구사항 |

### create 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_name | ✅ | 프로젝트명 (영문 kebab-case) |
| mvp_topic | ✅ | MVP 주제 |
| service_name | 선택 | 서비스명 (기본값: project_name) |
| backend_stack | 선택 | 백엔드 기술스택 (기본값: Spring Boot) |
| frontend_stack | 선택 | 프론트엔드 기술스택 (기본값: React) |
| create_github_repo | 선택 | GitHub 레포 자동 생성 여부 (기본값: true) |

### design 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 경로 |
| domain_context | 선택 | 도메인 컨텍스트 |
| architecture_hint | 선택 | 선호 아키텍처 패턴 힌트 |

### develop 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 경로 |
| domain_context | 선택 | 도메인 컨텍스트 |
| skip_frontend | 선택 | `true` 시 프론트엔드 개발 스킵 |
| skip_ai_engineer | 선택 | `true` 시 AI 엔지니어 단계 스킵 |

### deploy 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 경로 |
| skip_k8s | 선택 | `true` 시 Kubernetes 배포 스킵 |
| skip_cicd | 선택 | `true` 시 CI/CD 파이프라인 구성 스킵 |

[Top](#npd-플러그인-명세)

---

## 도메인 컨텍스트 수집 가이드

이 플러그인을 호출하는 External 스킬이 수집해야 할 도메인 컨텍스트:

| 수집 대상 | 소스 | 용도 |
|----------|------|------|
| 플러그인 메타데이터 | `.claude-plugin/plugin.json` | 플러그인명, 설명 |
| 프로젝트 기본 정보 | `AGENTS.md` | MVP 주제, 기술스택, 프로젝트 컨텍스트 |
| 기획 산출물 | `docs/plan/product-vision.md` | 제품 비전, MVP 기능 목록 |
| 도메인 요구사항 | `docs/plan/domain-requirements.md` | 도메인 특화 요구사항 |
| 설계 산출물 | `docs/design/` | 아키텍처, API, 데이터 설계 |

[Top](#npd-플러그인-명세)

---

## 선행 요구사항

- npd 플러그인 설치 필수 (`claude plugin marketplace add unicorn-plugins/npd`, `claude plugin install npd@npd`)
- `/npd:setup` 실행으로 GitHub 토큰 및 MCP 서버 초기 설정 완료 필요
- GitHub 레포 자동 생성 시 `create_repo` 커스텀 CLI 도구 설치 필요
- Mermaid 다이어그램 검증 시 Docker 환경 필요 (선택)

[Top](#npd-플러그인-명세)

---

## 호출 예시

### Full Path (create → plan → design → develop → deploy)

**Phase 1: create 호출**

→ Skill: npd:create

- **INTENT**: 새 프로젝트 생성
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_name": "my-healthcare-app",
    "mvp_topic": "당뇨 환자 식단 관리 앱",
    "backend_stack": "Spring Boot",
    "frontend_stack": "React",
    "create_github_repo": "true"
  }
- **RETURN**: 프로젝트 디렉토리 및 GitHub 레포 생성 완료

**Phase 2: plan 호출**

→ Skill: npd:plan

- **INTENT**: 기획 단계 수행
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}",
    "mvp_topic": "당뇨 환자 식단 관리 앱",
    "domain_context": "{수집된 도메인 컨텍스트}"
  }
- **RETURN**: 기획 산출물 생성 완료 (product-vision.md, domain-requirements.md, user-stories.md 등)

**Phase 3: design 호출**

→ Skill: npd:design

- **INTENT**: 설계 단계 수행
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}",
    "domain_context": "{수집된 도메인 컨텍스트}"
  }
- **RETURN**: 설계 산출물 생성 완료 (architecture, API, class, data 설계)

**Phase 4: develop 호출**

→ Skill: npd:develop

- **INTENT**: 개발 단계 수행
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}",
    "domain_context": "{수집된 도메인 컨텍스트}"
  }
- **RETURN**: 백엔드·프론트엔드 코드 생성 및 테스트 완료

**Phase 5: deploy 호출**

→ Skill: npd:deploy

- **INTENT**: 배포 단계 수행
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}"
  }
- **RETURN**: Dockerfile, K8s 매니페스트, CI/CD 워크플로우 생성 완료

[Top](#npd-플러그인-명세)
