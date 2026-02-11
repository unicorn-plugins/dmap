# github-release-manager 플러그인 명세

- [github-release-manager 플러그인 명세](#github-release-manager-플러그인-명세)
  - [기본 정보](#기본-정보)
  - [제공 스킬](#제공-스킬)
  - [실행 경로](#실행-경로)
  - [ARGS 스키마](#args-스키마)
    - [recommend-template 스킬 ARGS](#recommend-template-스킬-args)
    - [create-release 스킬 ARGS](#create-release-스킬-args)
    - [edit-release 스킬 ARGS](#edit-release-스킬-args)
    - [delete-release 스킬 ARGS](#delete-release-스킬-args)
  - [선행 요구사항](#선행-요구사항)
  - [도메인 컨텍스트 수집 가이드](#도메인-컨텍스트-수집-가이드)
  - [호출 예시](#호출-예시)
    - [구성 추천 후 생성 (Recommend → Create)](#구성-추천-후-생성-recommend--create)
    - [단일 생성 (Direct Create)](#단일-생성-direct-create)

---

## 기본 정보

| 항목 | 값 |
|------|---|
| 플러그인명 | github-release-manager |
| 설명 | GitHub Release 문서 자동 생성·수정·삭제 및 구성 추천 |
| 설치 | `claude plugin marketplace add unicorn-plugins/github-release-manager`, `claude plugin install github-release-manager@github-release-manager` |
| 저장소 | https://github.com/unicorn-plugins/github-release-manager |

[Top](#github-release-manager-플러그인-명세)

---

## 제공 스킬

| 스킬 | FQN | 유형 | 설명 |
|------|-----|------|------|
| recommend-template | `github-release-manager:recommend-template` | Orchestrator | 프로젝트 특성 분석 기반 Release 문서 구성 추천 |
| create-release | `github-release-manager:create-release` | Orchestrator | 커밋·PR·이슈 분석 후 Release 문서 자동 생성 |
| edit-release | `github-release-manager:edit-release` | Orchestrator | 기존 Release 문서 분석 및 수정 |
| delete-release | `github-release-manager:delete-release` | Orchestrator | Release 문서 삭제 및 태그 관리 |

[Top](#github-release-manager-플러그인-명세)

---

## 실행 경로

| 경로명 | 설명 | 스킬 체인 | 조건 |
|--------|------|----------|------|
| Recommend → Create | 구성 추천 후 Release 생성 | recommend-template → create-release | 처음 Release를 작성하거나 구성 변경 필요 시 |
| Direct Create | Release 직접 생성 | create-release | 기존 구성이 있거나 버전만 지정하여 생성 시 |
| Direct Edit | Release 직접 수정 | edit-release | 기존 Release 내용 수정 시 |
| Direct Delete | Release 직접 삭제 | delete-release | Release 삭제 시 |

[Top](#github-release-manager-플러그인-명세)

---

## ARGS 스키마

External 스킬이 이 플러그인의 스킬을 호출할 때 전달 가능한 ARGS 키.
Skill→Skill 입력 전달 규약에 따라 `ARGS` 루트 키 아래에 JSON 구조로 전달.

### recommend-template 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 |

### create-release 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 |
| version | 선택 | 릴리스 버전 (예: v1.0.0) |
| base_ref | 선택 | 비교 기준 태그/커밋 (기본: 이전 태그) |

### edit-release 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 |
| version | ✅ | 수정 대상 릴리스 버전 |
| changes | 선택 | 수정할 내용 설명 |

### delete-release 스킬 ARGS

| 키 | 필수 | 설명 |
|----|------|------|
| source_plugin | ✅ | 호출자 플러그인 식별 |
| project_dir | ✅ | 프로젝트 디렉토리 |
| version | ✅ | 삭제 대상 릴리스 버전 |
| delete_tag | 선택 | 태그 함께 삭제 여부 (기본: false) |

[Top](#github-release-manager-플러그인-명세)

---

## 선행 요구사항

- github-release-manager 플러그인 설치 필수 (`claude plugin marketplace add unicorn-plugins/github-release-manager`, `claude plugin install github-release-manager@github-release-manager`)
- GitHub CLI (gh) 설치 및 인증 완료
- Context7 MCP 서버 설치 (공식 문서 조회용)

[Top](#github-release-manager-플러그인-명세)

---

## 도메인 컨텍스트 수집 가이드

External 스킬이 이 플러그인에 위임하기 전에 수집해야 할 도메인 컨텍스트.
호출자 플러그인은 아래 테이블의 수집 대상을 Phase 1(도메인 컨텍스트 수집)에서 확보한 뒤,
ARGS 스키마에 맞춰 전달함.

| 수집 대상 | 소스 | 용도 | 대응 ARGS 키 |
|----------|------|------|-------------|
| 프로젝트 디렉토리 | 현재 작업 디렉토리 (cwd) | 모든 스킬의 필수 입력 | `project_dir` |
| 기존 릴리스 목록 | `gh release list --limit 10` | 경로 분기 판단 (첫 릴리스 여부, 수정/삭제 대상 선택) | — |
| Git 태그 목록 | `git tag --sort=-v:refname` | 버전 결정, base_ref 추론 | `version`, `base_ref` |
| 최근 커밋 이력 | `git log {last_tag}..HEAD --oneline` | Release 본문 자동 생성 소스 | — |
| 릴리스 구성 파일 | `.github/release.yml` 존재 여부 | Recommend→Create vs Direct Create 경로 분기 | — |
| 패키지 버전 | `package.json`, `pyproject.toml` 등 버전 필드 | 릴리스 버전 자동 추론 | `version` |

### 경로 분기 판단 기준

수집된 컨텍스트로 실행 경로를 결정하는 기준:

| 조건 | 경로 | 근거 |
|------|------|------|
| 기존 릴리스 0건 또는 `.github/release.yml` 미존재 | Recommend → Create | 구성 추천이 선행되어야 함 |
| 기존 릴리스 1건 이상 + `.github/release.yml` 존재 | Direct Create | 기존 구성을 재사용하여 즉시 생성 |
| 사용자가 특정 릴리스 수정 요청 | Direct Edit | 대상 버전을 ARGS에 전달 |
| 사용자가 특정 릴리스 삭제 요청 | Direct Delete | 대상 버전과 태그 삭제 여부를 ARGS에 전달 |

[Top](#github-release-manager-플러그인-명세)

---

## 호출 예시

### 구성 추천 후 생성 (Recommend → Create)

**Phase 1: recommend-template 호출**

→ Skill: github-release-manager:recommend-template

- **INTENT**: 프로젝트 분석 후 Release 문서 구성 추천
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}"
  }
- **RETURN**: Release 구성 추천안 (버전 네이밍 규칙, 섹션 구조, 작성 가이드)

**Phase 2: create-release 호출**

→ Skill: github-release-manager:create-release

- **INTENT**: 추천 구성 기반 Release 문서 생성
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}",
    "version": "{릴리스 버전}"
  }
- **RETURN**: Release 문서 생성 완료

### 단일 생성 (Direct Create)

**Phase 1: create-release 호출**

→ Skill: github-release-manager:create-release

- **INTENT**: Release 문서 직접 생성
- **ARGS**: {
    "source_plugin": "{호출자 플러그인명}",
    "project_dir": "{프로젝트 디렉토리}",
    "version": "v1.2.0"
  }
- **RETURN**: Release 문서 생성 완료

[Top](#github-release-manager-플러그인-명세)
