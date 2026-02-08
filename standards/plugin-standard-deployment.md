# 배포 표준

> **교차 참조**: 아래 상황에서 추가 문서를 로드할 것.
> - setup 스킬 작성이 필요하면 → `standards/plugin-standard-skill.md`의 "Setup" 유형
> - install.yaml 작성이 필요하면 → `standards/plugin-standard-gateway.md`
> - 전체 플러그인 구조 확인 → `standards/plugin-standard.md`

## 목차

- [한 줄 정의](#한-줄-정의)
- [배포 가능 플러그인 요건](#배포-가능-플러그인-요건)
- [배포 방식](#배포-방식)
- [마켓플레이스 배포](#마켓플레이스-배포)
  - [STEP 1 marketplacejson 작성](#step-1-marketplacejson-작성)
  - [STEP 2 마켓플레이스 등록](#step-2-마켓플레이스-등록)
  - [STEP 3 플러그인 설치](#step-3-플러그인-설치)
  - [실제 예시 Abra 플러그인](#실제-예시-abra-플러그인)
- [로컬 경로 배포](#로컬-경로-배포)
- [설치 흐름](#설치-흐름)
- [README 작성 표준](#readme-작성-표준)
- [MUST 규칙](#must-규칙)
- [검증 체크리스트](#검증-체크리스트)

---

## 한 줄 정의

플러그인 배포는 마켓플레이스 등록(영구) 또는 로컬 경로 지정(세션 단위) 방식으로 이루어지며, 배포 전 필수 요건 충족과 매니페스트 검증이 필요함.

[Top](#배포-표준)

---

## 배포 가능 플러그인 요건

플러그인이 외부에 배포되어 다른 환경에서 설치·사용되려면 다음 요건을 충족해야 함.

| 요건 | 파일 | 설명 |
|------|------|------|
| 플러그인 매니페스트 | `.claude-plugin/plugin.json` | 플러그인 식별 정보 (name, version, description) |
| 마켓플레이스 매니페스트 | `.claude-plugin/marketplace.json` | 마켓플레이스 등록 정보 (name, plugins 배열) |
| 설치 스킬 | `skills/setup/SKILL.md` | 설치 절차를 안내하는 프롬프트 |
| 설치 매니페스트 | `gateway/install.yaml` | 설치할 도구 목록 (MCP, LSP, 커스텀) |
| 라우팅 선언 | setup 스킬 내 정의 | 런타임 상주 파일에 추가할 활성화 조건 |

[Top](#배포-표준)

---

## 배포 방식

| 방식 | 설명 | 예시 | 영구 등록 |
|------|------|------|:---------:|
| **마켓플레이스 (GitHub)** | GitHub 저장소를 마켓플레이스로 등록 후 설치 | 아래 예시 참조 | ✅ |
| **마켓플레이스 (로컬)** | 로컬 경로를 마켓플레이스로 등록 후 설치 | 아래 예시 참조 | ✅ |
| **로컬 경로** | `--plugin-dir` 플래그로 세션 단위 로드 | `claude --plugin-dir ./my-plugin` | ❌ |

**마켓플레이스 (GitHub) 예시:**

```bash
# 1. GitHub 저장소를 마켓플레이스로 등록
claude plugin marketplace add cna-bootcamp/aistudy

# 2. 플러그인 설치 (형식: {플러그인명}@{마켓플레이스명})
claude plugin install abra@unicorn
```

**마켓플레이스 (로컬) 예시:**

```bash
# 1. 로컬 경로를 마켓플레이스로 등록
claude plugin marketplace add ./develop-agent/plugin/abra

# 2. 플러그인 설치
claude plugin install abra@unicorn

# 3. 설치 확인
claude plugin list
```

[Top](#배포-표준)

---

## 마켓플레이스 배포

플러그인을 **영구 등록**하여 Claude Code 재시작 후에도 유지되는 공식 배포 방법.
`marketplace.json`을 작성하고, 마켓플레이스로 등록한 뒤, 플러그인을 설치하는 3단계로 진행.

### STEP 1. `marketplace.json` 작성

`.claude-plugin/` 디렉토리에 `marketplace.json`을 생성함.
기존 `plugin.json`과 함께 위치시킨다.

```
my-plugin/
├── .claude-plugin/
│   ├── plugin.json          # 플러그인 매니페스트 (기존)
│   └── marketplace.json     # 마켓플레이스 매니페스트 (추가)
├── skills/
├── agents/
└── ...
```

**`marketplace.json` 형식:**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "my-marketplace",
  "description": "마켓플레이스 설명",
  "owner": {
    "name": "팀명",
    "email": "team@example.com"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "description": "플러그인 설명",
      "version": "1.0.0",
      "author": { "name": "팀명" },
      "source": "./",
      "category": "development",
      "homepage": "https://github.com/user/repo",
      "tags": ["keyword1", "keyword2"]
    }
  ]
}
```

**필수 필드:**

| 필드 | 설명 |
|------|------|
| `name` | 마켓플레이스 이름 (플러그인 설치 시 `@` 뒤에 사용) |
| `plugins` | 포함된 플러그인 배열 |
| `plugins[].name` | 플러그인 이름 (설치 시 `@` 앞에 사용) |
| `plugins[].source` | 플러그인 루트 디렉토리 경로 (보통 `"./"`) |

**`source` 유형:**

| 유형 | 형식 | 설명 |
|------|------|------|
| 상대 경로 | `"./"` | 마켓플레이스 루트에 플러그인이 위치 |
| 하위 경로 | `"./plugins/my-plugin"` | 마켓플레이스 내 하위 디렉토리 |
| Git URL | `{ "source": "url", "url": "https://github.com/user/repo.git" }` | 외부 Git 저장소 참조 |

### STEP 2. 마켓플레이스 등록

```bash
# 로컬 경로로 등록
claude plugin marketplace add ./path/to/my-plugin

# GitHub 저장소로 등록 (owner/repo 형식)
claude plugin marketplace add owner/repo

# Git URL로 등록
claude plugin marketplace add https://github.com/user/repo.git
```

**등록 확인:**

```bash
claude plugin marketplace list
```

**마켓플레이스 관리 명령어:**

| 명령어 | 설명 |
|--------|------|
| `claude plugin marketplace list` | 등록된 마켓플레이스 목록 조회 |
| `claude plugin marketplace add <source>` | 마켓플레이스 추가 (경로, GitHub, Git URL) |
| `claude plugin marketplace remove <name>` | 마켓플레이스 제거 |
| `claude plugin marketplace update [name]` | 마켓플레이스 업데이트 (이름 생략 시 전체) |

### STEP 3. 플러그인 설치

```bash
# 형식: claude plugin install {플러그인명}@{마켓플레이스명}
claude plugin install my-plugin@my-marketplace

# 설치 확인
claude plugin list
```

설치 후 Claude Code를 재시작하면 플러그인 스킬이 활성화됨.

**플러그인 관리 명령어:**

| 명령어 | 설명 |
|--------|------|
| `claude plugin install <name>@<marketplace>` | 플러그인 설치 |
| `claude plugin list` | 설치된 플러그인 목록 |
| `claude plugin enable <name>` | 플러그인 활성화 |
| `claude plugin disable <name>` | 플러그인 비활성화 |
| `claude plugin uninstall <name>` | 플러그인 제거 |
| `claude plugin update <name>` | 플러그인 업데이트 |
| `claude plugin validate <path>` | 플러그인 매니페스트 검증 |

**설치 scope 옵션:**

| Scope | 플래그 | 적용 범위 | 설정 파일 |
|-------|--------|-----------|-----------|
| `user` | `-s user` (기본값) | 모든 프로젝트 | `~/.claude/settings.json` |
| `project` | `-s project` | 팀 공유 (VCS 포함) | `.claude/settings.json` |
| `local` | `-s local` | 현재 프로젝트만 (gitignore) | `.claude/settings.local.json` |

```bash
# 프로젝트 scope로 설치 (팀 공유)
claude plugin install abra@abra -s project

# 로컬 scope로 설치 (개인용)
claude plugin install abra@abra -s local
```

### 실제 예시: Abra 플러그인

```bash
# 1. marketplace.json 작성 (위 형식 참고)
# 2. 마켓플레이스 등록
claude plugin marketplace add ./develop-agent/plugin/abra

# 3. 플러그인 설치
claude plugin install abra@abra

# 4. 설치 확인
claude plugin list
# 출력:
#   ❯ abra@abra
#     Version: 1.0.0
#     Scope: user
#     Status: ✔ enabled
```

[Top](#배포-표준)

---

## 로컬 경로 배포

개발 중이거나 비공개 플러그인을 **마켓플레이스 등록 없이** 세션 단위로 바로 사용하는 방법.
Claude Code의 `--plugin-dir` 플래그로 로컬 플러그인 디렉토리를 지정하면, 해당 플러그인의 스킬·에이전트·훅이 자동 인식됨.

> **공식 문서 출처**:
> [Claude Code Plugin Development](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md)

### 실행 방법

```bash
# 로컬 플러그인을 로드하여 Claude Code 실행
claude --plugin-dir /path/to/my-plugin
```

Claude Code가 지정된 디렉토리의 `.claude-plugin/plugin.json`을 읽고, `skills/`, `agents/`, `hooks/` 디렉토리를 자동 탐색하여 컴포넌트를 로드함.

### 필수 디렉토리 구조

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # [필수] 플러그인 매니페스트
├── skills/                  # [선택] 스킬 디렉토리 — 자동 탐색
│   ├── setup/
│   │   └── SKILL.md
│   └── ...
├── agents/                  # [선택] 에이전트 디렉토리
├── hooks/                   # [선택] 이벤트 핸들러
├── .mcp.json                # [선택] 외부 도구 설정
├── gateway/                 # [선택] 게이트웨이 도구
└── README.md
```

> **필수 조건**: `.claude-plugin/plugin.json`이 존재해야 플러그인으로 인식됨.
> `plugin.json`의 최소 구성은 `name` 필드만 있으면 됨:
> ```json
> { "name": "my-plugin" }
> ```
> `skills` 배열을 선언하지 않아도 `skills/` 디렉토리를 자동 탐색함.

### 사전 검증 (필수)

로컬 플러그인을 로드하기 전에 반드시 `claude plugin validate`로 매니페스트를 검증함.
검증에 실패하면 플러그인이 로드되지 않음.

```bash
# 플러그인 구조·매니페스트 검증
claude plugin validate /path/to/my-plugin
```

**검증 통과 예시:**

```
Validating plugin manifest: /path/to/my-plugin/.claude-plugin/plugin.json
✔ Validation passed
```

**검증 실패 예시:**

```
Validating plugin manifest: /path/to/my-plugin/.claude-plugin/plugin.json
✘ Found 1 error:
  ❯ author: Invalid input: expected object, received string
✘ Validation failed
```

**자주 발생하는 검증 오류:**

| 오류 | 원인 | 해결 |
|------|------|------|
| `author: expected object, received string` | `"author": "이름"` (문자열) | `"author": { "name": "이름" }` (객체로 변경) |
| `name: Required` | `name` 필드 누락 | `plugin.json`에 `"name"` 추가 |
| 파일 없음 | `.claude-plugin/plugin.json` 미존재 | 디렉토리 구조 확인 |

> **`plugin.json` 필드 스키마 참고:**
> ```json
> {
>   "name": "my-plugin",                          // [필수] 문자열 (kebab-case)
>   "version": "1.0.0",                           // [선택] 문자열
>   "description": "플러그인 설명",                // [선택] 문자열
>   "author": { "name": "팀명", "email": "..." }, // [선택] 객체 (문자열 불가)
>   "license": "MIT"                              // [선택] 문자열
> }
> ```

### 실제 예시: Abra 플러그인 로컬 실행

```bash
# aistudy 프로젝트에서 Abra 플러그인을 로드하여 실행
cd /path/to/aistudy
claude --plugin-dir develop-agent/plugin/abra

# 실행 후 스킬 사용
/abra:setup
/abra:scenario
/abra:core
```

### 디버그 모드와 함께 사용

```bash
# 플러그인 로드 과정을 디버그 로그로 확인
claude --plugin-dir develop-agent/plugin/abra --debug
```

훅 동작이나 스킬 인식 문제를 진단할 때 유용함.

### 여러 플러그인 동시 로드

```bash
# 복수의 로컬 플러그인을 동시에 로드
claude --plugin-dir ./plugin-a --plugin-dir ./plugin-b
```

### 주의사항

| 항목 | 설명 |
|------|------|
| 세션 단위 적용 | `--plugin-dir`는 해당 세션에서만 유효, 영구 등록이 아님 |
| 영구 등록 필요 시 | 마켓플레이스 배포 방식 사용 (`marketplace.json` 작성 → 마켓플레이스 등록 → 설치) |
| 자동 탐색 | `skills/`, `agents/`, `hooks/` 디렉토리를 자동 탐색 — `plugin.json`에 목록 선언 불필요 |
| 경로 지정 | 상대 경로·절대 경로 모두 사용 가능 |

[Top](#배포-표준)

---

## 설치 흐름

플러그인 설치 시 런타임이 수행하는 과정:

```
① 마켓플레이스 등록
   ├── GitHub: claude plugin marketplace add owner/repo
   ├── Git URL: claude plugin marketplace add https://github.com/user/repo.git
   └── 로컬: claude plugin marketplace add ./path/to/plugin

② 매니페스트 검증
   ├── .claude-plugin/marketplace.json 존재 및 형식 확인
   └── .claude-plugin/plugin.json 존재 및 필수 필드 확인

③ 플러그인 설치
   ├── claude plugin install {plugin}@{marketplace}
   ├── 플러그인 캐시 디렉토리에 복사 (~/.claude/plugins/cache/)
   └── settings.json의 enabledPlugins에 등록

④ 사용자에게 setup 스킬 실행 안내
   └── 예: "설치 완료. /my-plugin:setup 을 실행하여 초기 설정을 진행하세요"

⑤ setup 스킬 실행 (사용자가 명시적으로 호출)
   ├── gateway/install.yaml 읽기
   ├── MCP/LSP/커스텀 도구 설치
   ├── 사용자에게 적용 범위 질문 (모든 프로젝트 / 이 프로젝트만)
   └── 런타임 상주 파일에 라우팅 테이블 추가
```

[Top](#배포-표준)

---

## README 작성 표준

플러그인 README는 사용자가 처음 접하는 문서이자 플러그인의 **첫인상**임.
배포 플러그인에는 반드시 루트에 `README.md`를 포함해야 함.

### 섹션 구성

| 구분 | 섹션 | 필수 | 설명 |
|------|------|:----:|------|
| **필수** | 헤더 (제목 + 배지) | ✅ | 플러그인명, npm/GitHub 배지, 라이선스 배지 |
| | 한줄 소개 (태그라인) | ✅ | 플러그인의 핵심 가치를 한 문장으로 요약 |
| | 빠른 시작 (Quick Start) | ✅ | **3단계 이내**의 설치-설정-사용 가이드 |
| | 주요 기능 (Features) | ✅ | 핵심 기능 목록 (테이블 또는 불릿) |
| | 요구 사항 (Requirements) | ✅ | 필수/선택 의존성, 지원 환경 |
| | 라이선스 (License) | ✅ | 오픈소스 라이선스 명시 |
| **권장** | 왜 이 플러그인? (Why) | | 경쟁 대비 차별점, 사용자에게 주는 가치 |
| | 사용법 상세 (Usage) | | 주요 명령어/키워드 테이블 |
| | 업데이트 방법 (Updating) | | 버전 업그레이드 절차 |
| | 문서 링크 (Documentation) | | 상세 문서, 아키텍처, 마이그레이션 가이드 링크 |
| **선택** | 크레딧 / 영감 (Credits) | | 영감을 받은 프로젝트, 기여자 |
| | 후원 / Star History | | 프로젝트 지원 방법, 성장 그래프 |

### 섹션별 작성 가이드

#### (1) 헤더 — 신뢰감과 프로젝트 상태 전달

```markdown
# {플러그인명}

[![npm version](https://img.shields.io/npm/v/{패키지명})](https://www.npmjs.com/package/{패키지명})
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**{핵심 가치를 한 문장으로}**

[빠른 시작](#quick-start) • [문서](링크) • [마이그레이션 가이드](링크)
```

**권장 배지 목록:**

| 배지 | 목적 | 우선순위 |
|------|------|----------|
| npm version | 최신 버전 확인 | 필수 |
| License | 라이선스 명시 | 필수 |
| npm downloads | 인기도/신뢰도 | 권장 |
| GitHub stars | 커뮤니티 관심도 | 권장 |
| CI status | 빌드 안정성 | 선택 |

#### (2) 빠른 시작 — 3단계 원칙

사용자가 README를 읽고 **3분 이내에 동작을 확인**할 수 있어야 함.
각 단계는 복사-붙여넣기 가능한 코드 블록으로 제공:

```markdown
## Quick Start

**Step 1: Install**
\```bash
{설치 명령어}
\```

**Step 2: Setup**
\```bash
{설정 명령어}
\```

**Step 3: Use**
\```
{첫 사용 예시}
\```
```

**작성 원칙:**

| 원칙 | 설명 |
|------|------|
| 3단계 이내 | Install → Setup → Use (예외 없음) |
| 복사-붙여넣기 가능 | 각 단계에 실행 가능한 코드 블록 포함 |
| 환경 가정 최소화 | 사전 설치가 필요하면 Requirements에서 안내 |
| 성공 확인 포함 | 마지막 단계에서 "동작한다"를 확인할 수 있는 예시 |

#### (3) 주요 기능 — 한눈에 파악 가능한 구조

테이블 형식을 권장. 긴 설명보다 핵심 키워드 위주로 작성:

```markdown
## Features

| 기능 | 설명 |
|------|------|
| **기능A** | 한 줄 설명 |
| **기능B** | 한 줄 설명 |
```

기능이 많으면 카테고리별 하위 섹션으로 분리:

```markdown
### 실행 모드
| 모드 | 속도 | 용도 |
|------|------|------|
| Autopilot | 빠름 | 완전 자율 워크플로우 |

### 개발자 경험
- **매직 키워드** — 명시적 제어용 단축키
- **HUD 상태바** — 실시간 오케스트레이션 지표
```

#### (4) 요구 사항 — 필수/선택 구분

필수 의존성과 선택 의존성을 명확히 분리:

```markdown
## Requirements

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- Claude Max/Pro 구독 또는 Anthropic API 키

### 선택: 추가 기능

| 제공자 | 설치 | 활성화되는 기능 |
|--------|------|-----------------|
| [Gemini CLI](링크) | `npm install -g @google/gemini-cli` | 디자인 리뷰 |
```

#### (5) 사용법 상세 — 키워드/명령어 테이블

파워 유저를 위한 명시적 제어 수단을 테이블로 정리:

```markdown
## Usage

| 키워드 | 효과 | 예시 |
|--------|------|------|
| `autopilot` | 완전 자율 실행 | `autopilot: build a todo app` |
| `plan` | 계획 인터뷰 | `plan the API` |
```

#### (6) 문서 링크 — 허브 역할

README는 상세 문서의 진입점 역할. 관련 문서를 모아서 안내:

```markdown
## Documentation

- **[전체 레퍼런스](docs/REFERENCE.md)** — 전체 기능 문서
- **[아키텍처](docs/ARCHITECTURE.md)** — 내부 동작 원리
- **[마이그레이션 가이드](docs/MIGRATION.md)** — 이전 버전에서 업그레이드
```

### OMC README 구조 분석 (레퍼런스)

실제 OMC 플러그인의 README 섹션 구성:

| 순서 | 섹션 | 구분 | 특징 |
|------|------|------|------|
| 1 | 헤더 + 배지 5개 | 필수 | npm, downloads, stars, license, sponsor |
| 2 | 태그라인 | 필수 | "Multi-agent orchestration for Claude Code. Zero learning curve." |
| 3 | Quick Start (3단계) | 필수 | Install → Setup → Build something |
| 4 | Updating | 권장 | 업데이트 + 트러블슈팅(`/doctor`) |
| 5 | Why oh-my-claudecode? | 권장 | 7개 차별점 불릿 |
| 6 | Features (3카테고리) | 필수 | Execution Modes 테이블, Orchestration, DX |
| 7 | Magic Keywords | 권장 | 6개 키워드 테이블 |
| 8 | Utilities | 선택 | Rate Limit Wait CLI |
| 9 | Documentation | 권장 | 5개 문서 링크 |
| 10 | Requirements | 필수 | 필수 1개 + 선택(Gemini, Codex) 테이블 |
| 11 | License | 필수 | MIT |
| 12 | Credits | 선택 | 영감 프로젝트 4개 |
| 13 | Star History | 선택 | 성장 그래프 |
| 14 | Support/Sponsor | 선택 | GitHub Sponsors 링크 |

[Top](#배포-표준)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | `.claude-plugin/plugin.json` 필수 (name 필드 필수) |
| 2 | 배포 시 `.claude-plugin/marketplace.json` 필수 |
| 3 | setup 스킬 반드시 포함 (`skills/setup/SKILL.md`) |
| 4 | `claude plugin validate`로 사전 검증 통과 |
| 5 | author 필드는 객체 형식 `{ "name": "...", "email": "..." }` (문자열 불가) |
| 6 | README.md에 Quick Start 3단계 이내 포함 |

[Top](#배포-표준)

---

## 검증 체크리스트

### 배포 검증

- [ ] `.claude-plugin/plugin.json` 존재 및 name 필드 포함
- [ ] `.claude-plugin/marketplace.json` 존재 (배포 시)
- [ ] `claude plugin validate` 통과
- [ ] author 필드가 객체 형식
- [ ] setup 스킬 존재 (`skills/setup/SKILL.md`)
- [ ] gateway/install.yaml 존재
- [ ] commands/ 디렉토리에 진입점 파일 존재

### README 검증

| # | 항목 | 확인 |
|---|------|------|
| 1 | 플러그인명과 한줄 소개가 명확한가? | ☐ |
| 2 | Quick Start가 3단계 이내이고 복사-붙여넣기로 동작하는가? | ☐ |
| 3 | 주요 기능이 테이블/불릿으로 한눈에 파악 가능한가? | ☐ |
| 4 | 필수/선택 요구 사항이 구분되어 있는가? | ☐ |
| 5 | 라이선스가 명시되어 있는가? | ☐ |
| 6 | 배지가 올바른 패키지/저장소를 가리키는가? | ☐ |
| 7 | 모든 링크(문서, 설치, 저장소)가 유효한가? | ☐ |
| 8 | 영문 README와 다국어 README가 모두 제공되는가? (국제 배포 시) | ☐ |

[Top](#배포-표준)
