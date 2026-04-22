🇰🇷 [한국어](#dmap-빌더) | 🇺🇸 [English](README.en.md)

# DMAP 빌더

> 코드 없이 멀티에이전트 플러그인을 만드는 선언형 프레임워크

- [DMAP 빌더](#dmap-빌더)
  - [개요](#개요)
    - [문제: 기존 플러그인 개발의 불편함](#문제-기존-플러그인-개발의-불편함)
    - [DMAP의 해결 방식](#dmap의-해결-방식)
    - [핵심 가치](#핵심-가치)
  - [빠른 시작](#빠른-시작)
    - [사전 요구사항](#사전-요구사항)
    - [DMAP 빌더 설치](#dmap-빌더-설치)
    - [Claude Code에서 사용](#claude-code에서-사용)
  - [업그레이드](#업그레이드)
  - [핵심 개념](#핵심-개념)
    - [Skills = 부서장](#skills--부서장)
    - [Agents = 전문가](#agents--전문가)
    - [Gateway = 통역사](#gateway--통역사)
    - [리소스 마켓플레이스 = 사내 공유 드라이브](#리소스-마켓플레이스--사내-공유-드라이브)
    - [아키텍처 (Clean Architecture)](#아키텍처-clean-architecture)
  - [동작 원리](#동작-원리)
    - [프롬프트 조립](#프롬프트-조립)
    - [4-Tier 모델 매핑](#4-tier-모델-매핑)
    - [스킬 활성화 경로](#스킬-활성화-경로)
  - [플러그인 개발 워크플로우](#플러그인-개발-워크플로우)
  - [프로젝트 구조](#프로젝트-구조)
  - [표준 문서](#표준-문서)
  - [로드맵](#로드맵)
  - [라이선스](#라이선스)

---

## 개요

**DMAP (Declarative Multi-Agent Plugin)** 은
코드 없이 **Markdown(프롬프트)과 YAML(설정)만으로**
멀티에이전트 시스템을 정의하는 선언형 플러그인 아키텍처 표준임.

### 문제: 기존 플러그인 개발의 불편함

Claude Code, Codex CLI와 같은 AI CLI 플러그인을 개발할 때,
코드 기반 구현은 다음과 같은 한계가 있음:

- **높은 진입장벽** -- 각 런타임별 SDK와 API를 학습해야 함
- **런타임 강결합** -- 비즈니스 로직이 특정 런타임에 종속되어 이식성이 낮음
- **유지보수 어려움** -- 요구사항 변경 시 코드 전체를 수정해야 함

> "플러그인의 본질(비즈니스 로직)과 실행 방식(인프라)을 분리할 수는 없을까?"

### DMAP의 해결 방식

Clean 아키텍처의 관심사 분리 원칙을 적용하여 비즈니스 로직과 인프라를 분리함.

**1. 선언형 명세**
"어떻게(HOW)" 대신 "무엇을(WHAT)"만 선언하는 방식임.
택시 기사에게 경로를 일일이 지시하는 대신 "강남역이요"라고 목적지만 말하는 것과 동일함.

**2. 추상화 레이어**
에이전트는 모델 등급(`tier: HIGH`)과 툴(`file_search`, `code_edit`)을 추상적으로 선언함.
구체적인 모델 이름(Claude Opus, GPT-4 등)이나 실제 도구 API는 에이전트가 알 필요 없음.

**3. Gateway 레이어의 매핑**
Gateway가 추상 선언을 실제 런타임 환경에 맞게 자동 변환함.
- `tier: HIGH` → Claude Code에서는 `claude-opus-4`, Codex CLI에서는 `gpt-4-turbo`
- `file_search` → Claude Code에서는 `Glob` 도구, Codex CLI에서는 `ripgrep` 도구

이를 통해 에이전트 정의는 그대로 두고, Gateway 설정만 바꾸면 다른 런타임에서 실행 가능함.

### 핵심 가치

| 가치 | 설명 |
|------|------|
| **선언형 명세** | 코드 대신 Markdown + YAML로 에이전트 정의 |
| **런타임 중립** | Claude Code, Codex CLI 등 어떤 런타임에서든 동작 |
| **관심사 분리** | Skills(라우팅) -> Agents(실행) -> Gateway(매핑) 단방향 의존 |
| **비개발자 접근성** | Markdown 작성 가능하면 누구나 플러그인 구축 가능 |
| **도메인 범용** | 코드 생성, 교육, 문서화, 비즈니스 워크플로우 등 어떤 도메인에도 적용 가능 |

### 지원 런타임

DMAP이 생성하는 플러그인은 SSOT(`agents/{name}/`) + **런타임별 얇은 포인터 어댑터** 방식으로 아래 4개 런타임을 모두 지원함.
에이전트 정의는 한 번만 작성하고 `develop-plugin`이 런타임별 스텁을 자동 생성함.

| 런타임 | 어댑터 경로 | 포맷 | 모델 예시 | 호출 방법 |
|--------|------------|------|----------|----------|
| Claude Code / CoWork | `.claude/agents/{name}.md` | Markdown + YAML frontmatter | `opus`, `sonnet`, `haiku` | `Agent(subagent_type=FQN, ...)` |
| Cursor | `.cursor/agents/{name}.md` | Markdown + YAML frontmatter | `opus`, `sonnet`, `haiku` | `/{agent}` 또는 자연어 위임 |
| Codex | `.codex/agents/{name}.toml` | TOML + `developer_instructions` | `gpt-5.4`, `gpt-5.4-mini` 등 | `spawn_agents_on_csv` 또는 자연어 |
| Antigravity | `.antigravity/agents/{name}.md` | Markdown + YAML frontmatter | `opus`, `sonnet`, `haiku` | Manager UI 수동 로드 (프로그래매틱 API 불확실) |

> **핵심 설계**: SSOT는 `agents/{name}/` 한 곳에만 존재하고, 각 런타임용 어댑터 스텁은
> "SSOT 3파일을 읽어 그에 따라 행동하라"는 지시문만 포함하는 얇은 포인터임.
> 모델 버전은 `gateway/runtime-mapping.yaml`의 4런타임 tier 매핑에서 해결되어 스텁 frontmatter에 기록됨.
> 상세: [agent-runtime-adapters.md](resources/guides/agent-runtime-adapters.md)

[Top](#dmap-빌더)

---

## 빠른 시작

### 사전 요구사항

**1. 기본 툴 설치**

| 도구 | 최소 버전 | 용도 |
|------|-----------|------|
| Git | 2.x | 플러그인 마켓플레이스 (GitHub 저장소 클론) |
| Node.js | 18+ | MCP 서버 실행 (`npx` 명령 사용) |
| VS Code | 최신 | 코드 편집기 (`code` 명령 사용) |

**2. PATH 설정**

`~/.local/bin` 디렉토리를 PATH에 추가함:

```bash
# Mac 사용자
code ~/.zshrc

# Linux/Windows 사용자 (Windows는 Git Bash 터미널 사용)
code ~/.bashrc
```

아래 내용을 파일 끝에 추가:

```bash
export PATH=~/.local/bin:$PATH
```

> **(중요)** 경로 추가 후 반드시 `source ~/.bashrc` 또는 `source ~/.zshrc` 실행

**3. Claude Code 설치**

```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

설치 후 초기 구성:

```bash
claude
```

**4. Oh My ClaudeCode (OMC) 설치**

Claude Code 프롬프트에서 순차 수행:

```
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

Setup 시 MCP는 context7만 설치:

```
/oh-my-claudecode:omc-setup
```

> DMAP 빌더는 OMC의 스킬 부스팅(ralplan, ralph 등)을 활용하므로 OMC 설치가 필수임.

### DMAP 빌더 설치
소스 클론:    
```
mkdir -p {작업디렉토리} 
cd {작업디렉토리}
git clone https://github.com/unicorn-plugins/dmap.git
cd dmap
```

```bash
claude plugin marketplace add ./
claude plugin install dmap@dmap
```
  
### Claude Code에서 사용

플러그인 디렉토리 생성: 
```
mkdir -p {작업디렉토리}/{플러그인 디렉토리}
cd {작업디렉토리}/{플러그인 디렉토리}
```

Claude Code 실행 -> '/dmap:team-planner' 실행하여 팀 기획서 작성 부터 시작    

| 명령 | 설명 |
|------|------|
| `/dmap:develop-plugin` | 4-Phase 워크플로우로 플러그인 개발 |
| `/dmap:team-planner` | 팀 기획서 작성 지원 (AI 자동 완성) |
| `/dmap:publish` | 개발 완료된 플러그인을 GitHub에 배포 |
| `/dmap:setup` | 설치 검증 (플러그인 구조 및 표준 문서 확인) |
| `/dmap:help` | 사용 안내 |

기본 사용 흐름:

```
1. /dmap:setup                -- 설치 상태 검증
2. /dmap:team-planner         -- 팀 기획서 작성 (AI 자동 완성)
3. /dmap:develop-plugin       -- 요구사항 -> 설계 -> 개발 -> 검증 자동 수행
4. /dmap:publish              -- GitHub 배포 (저장소 생성, 커밋, 푸시)
```

> **End-to-End 자동화**: 요구사항 정의부터 GitHub 배포까지 전 과정을 AI가 자동 수행함.
> 사용자는 각 단계의 승인만 하면 됨.

[Top](#dmap-빌더)

---

## 업그레이드

```bash
# 1. 최신 코드 Pull
cd {dmap 클론 경로}
git pull origin main

# 2. 마켓플레이스 업데이트
claude plugin marketplace update dmap

# 3. 플러그인 재설치
claude plugin install dmap@dmap
```

> 갱신이 반영되지 않는 경우:
> ```bash
> claude plugin remove dmap@dmap
> claude plugin marketplace update dmap
> claude plugin install dmap@dmap
> ```

> 업그레이드 후 새 도구가 추가된 경우 `/dmap:setup`을 재실행하여 누락된 도구를 설치할 것.

[Top](#dmap-빌더)

---

## 핵심 개념

DMAP의 구조를 회사 조직에 비유하면 이해하기 쉬움.

### Skills = 부서장

일을 배분하는 부서장 역할.
사용자의 요청을 받아 어떤 에이전트에게 어떤 일을 시킬지 결정함.
`SKILL.md` 파일 하나로 워크플로우 전체를 선언.

| 항목 | 내용 |
|------|------|
| 핵심 파일 | `skills/{name}/SKILL.md` |
| 역할 | 라우팅 + 오케스트레이션 |
| 유형 | router, setup, orchestrator, help |

### Agents = 전문가

실제 일을 수행하는 전문가.
각 에이전트는 3개 파일로 구성됨.

| 파일 | 역할 |
|------|------|
| `AGENT.md` | 역할 정의 (목표, 워크플로우, 출력 형식) |
| `agentcard.yaml` | 메타데이터 (이름, 버전, 티어, 제약) |
| `tools.yaml` | 사용 가능한 도구 추상 선언 |

### Gateway = 통역사

추상적인 선언을 구체적인 실행 환경으로 번역하는 통역사.
에이전트가 "파일 검색 도구"라고 선언하면,
Gateway가 실제 런타임에서 어떤 도구를 쓸지 매핑함.

| 파일 | 역할 |
|------|------|
| `install.yaml` | MCP/LSP 서버, 커스텀 도구 설치 선언 |
| `runtime-mapping.yaml` | 티어 매핑, 도구 매핑, 액션 매핑 |

### 리소스 마켓플레이스 = 사내 공유 드라이브

가이드, 템플릿, 샘플, 도구를 모아둔 공유 저장소.
여러 플러그인이 함께 사용할 수 있는 공용 자원 풀.

| 분류 | 경로 | 용도 |
|------|------|------|
| 가이드 | `resources/guides/` | 기술 참조 문서 |
| 템플릿 | `resources/templates/` | 산출물 생성 템플릿 |
| 샘플 | `resources/samples/` | 구현 참고 샘플 |
| 도구 | `resources/tools/` | 커스텀 앱/CLI 도구 |

### 아키텍처 (Clean Architecture)

이 컴포넌트들은 Clean Architecture 원칙을 따름.
Skills -> Agents -> Gateway 순서로 단방향 의존하므로,
각 부분을 독립적으로 수정하거나 교체 가능함.

```
위임형:  Input -> Skills(Controller) -> Agents(Service) -> Gateway -> Runtime
직결형:  Input -> Skills(Controller) ----------------------> Gateway -> Runtime
```

[Top](#dmap-빌더)

---

## 동작 원리

### 프롬프트 조립

스킬은 3단계 레이어로 프롬프트를 조립하여 에이젼트를 호출함.   
이 조립과정에서 추상화된 모델등급과 도구가 실제 인프라와 매핑됨.   

| 단계 | 소스 | 내용 |
|------|------|------|
| 1. 공통 정적 | Gateway `runtime-mapping.yaml` | 런타임 공통 설정 (티어 매핑, 도구 매핑) |
| 2. 에이전트별 정적 | `AGENT.md` + `agentcard.yaml` + `tools.yaml` | 에이전트 역할, 메타데이터, 도구 선언 |
| 3. 동적 | 스킬이 전달하는 작업 지시 | 사용자 요청 기반 구체 작업 내용 |

### 4-Tier 모델 매핑

작업의 복잡도에 따라 4단계로 나누고, 각 단계에 적합한 AI 모델을 배정함.
간단한 파일 검색은 가벼운 모델이, 복잡한 아키텍처 설계는 강력한 모델이 담당함.

| Tier | 용도 | Claude 매핑 예시 |
|------|------|-----------------|
| HEAVY | 극도로 복잡한 추론, 전략 수립 | Opus (max thinking) |
| HIGH | 복잡한 분석, 아키텍처 설계 | Opus |
| MEDIUM | 표준 구현, 일반 작업 | Sonnet |
| LOW | 단순 조회, 파일 검색 | Haiku |

작업 중 난이도가 올라가면 자동으로 상위 모델로 에스컬레이션됨.

### 스킬 활성화 경로

두 가지 경로로 스킬이 활성화됨:

1. **직접 호출** -- 슬래시 명령어(`/dmap:develop-plugin`)로 정확히 원하는 스킬을 호출
2. **Router 경유** -- 모호한 요청이 들어오면 Router 스킬이 의도를 분석하여 적절한 스킬로 라우팅

런타임은 `skills/` 디렉토리를 자동 스캔하여 사용 가능한 스킬을 발견함.

[Top](#dmap-빌더)

---

## 플러그인 개발 워크플로우

요구사항 정의부터 GitHub 배포까지 **End-to-End 자동화**로 수행됨.
`/dmap:team-planner`로 팀 기획서를 먼저 작성한 후,
`/dmap:develop-plugin`으로 4-Phase 워크플로우를 자동 수행하고,
`/dmap:publish`로 GitHub에 배포함. 각 Phase 완료 시 사용자 승인을 받아 다음 단계로 진행함.

```
/dmap:team-planner → /dmap:develop-plugin (Phase 1~4) → /dmap:publish
```

| Phase | 단계 | 주요 활동 |
|:-----:|------|----------|
| 1 | 요구사항 수집 | 팀 기획서 분석, 플러그인 적합여부 판단, 누락 정보 수집 ([샘플](https://github.com/unicorn-plugins/abra/blob/main/output/requirement.md)) |
| 2 | 설계 및 계획 | 공유 자원 선택, 플러그인 구조 설계, 개발 계획서 작성 |
| 3 | 플러그인 개발 | 스켈레톤 생성, Gateway/Agent/Skill/Command 개발, README 작성 |
| 4 | 검증 및 완료 | DMAP 표준 준수 검증, 최종 보고, 공유자원 등록(선택) |

**Phase 3 개발 순서:**

1. 플러그인 스켈레톤 생성 (`.claude-plugin/`, 디렉토리 구조)
2. Gateway 설정 (`install.yaml`, `runtime-mapping.yaml`)
3. 공유자원 복사 (리소스 마켓플레이스 -> 플러그인 디렉토리)
4. 에이전트 개발 (`AGENT.md`, `agentcard.yaml`, `tools.yaml`)
5. 스킬 개발 (setup 필수, help 권장, 기능 스킬)
6. `commands/` 진입점 생성
7. 커스텀 앱/CLI 개발 (필요 시)
8. `README.md` 작성

[Top](#dmap-빌더)

---

## 프로젝트 구조

```
dmap/
├── .claude-plugin/          # 플러그인 매니페스트
│   ├── plugin.json          #   플러그인 메타데이터
│   └── marketplace.json     #   마켓플레이스 등록 정보
├── standards/               # DMAP 표준 문서
│   ├── plugin-standard.md          # 메인 표준 (아키텍처, 디렉토리, 배포)
│   ├── plugin-standard-agent.md    # Agent 패키지 표준
│   ├── plugin-standard-skill.md    # Skill 작성 표준
│   └── plugin-standard-gateway.md  # Gateway 설정 표준
├── resources/               # 리소스 마켓플레이스 (공유 자원 풀)
│   ├── plugin-resources.md  #   리소스 카탈로그
│   ├── guides/              #   가이드 문서
│   ├── templates/           #   템플릿 파일
│   ├── samples/             #   샘플 파일
│   └── tools/               #   도구 (커스텀 앱/CLI)
├── skills/                  # DMAP 빌더 스킬
│   ├── develop-plugin/      #   플러그인 개발 (4-Phase)
│   ├── team-planner/        #   팀 기획서 작성 지원
│   ├── publish/             #   GitHub 배포
│   ├── add-ext-skill/       #   외부호출 스킬 추가 유틸리티
│   ├── remove-ext-skill/    #   외부호출 스킬 제거 유틸리티
│   ├── ext-{plugin}/        #   외부 플러그인 위임 (선언형 A2A)
│   ├── setup/               #   초기 설정
│   └── help/                #   사용 안내
├── commands/                # 슬래시 명령 진입점
│   ├── develop-plugin.md
│   ├── team-planner.md
│   ├── publish.md
│   ├── add-ext-skill.md
│   ├── remove-ext-skill.md
│   ├── ext-{plugin}.md
│   ├── setup.md
│   └── help.md
├── references/              # 참조 문서
└── docs/                    # 발표/논문 자료
```

[Top](#dmap-빌더)

---

## 표준 문서

DMAP 표준은 4개의 핵심 문서와 리소스 카탈로그로 구성됨.

| 문서 | 경로 | 설명 |
|------|------|------|
| 메인 표준 | `standards/plugin-standard.md` | 아키텍처, 디렉토리 구조, 네임스페이스, 배포 |
| Agent 표준 | `standards/plugin-standard-agent.md` | 에이전트 패키지 구성 (AGENT.md, agentcard.yaml, tools.yaml) |
| Skill 표준 | `standards/plugin-standard-skill.md` | 스킬 유형, 작성 규칙, 유형별 템플릿 |
| Gateway 표준 | `standards/plugin-standard-gateway.md` | install.yaml, runtime-mapping.yaml 작성 규칙 |
| 리소스 카탈로그 | `resources/plugin-resources.md` | 공유 자원 목록 (가이드, 템플릿, 샘플, 도구) |
| 플러그인 개발 가이드 | `resources/guides/plugin/plugin-dev-guide.md` | 4-Phase 워크플로우 상세 가이드 |

[Top](#dmap-빌더)

---

## 로드맵

| 단계 | 목표 | 내용 |
|------|------|------|
| **현재** | 멀티 런타임 어댑터 지원 | Claude Code / Cursor / Codex / Antigravity 4런타임용 포인터 어댑터 자동 생성 |
| **단기** | 런타임 실측 및 커버리지 확장 | Antigravity 프로그래매틱 API 실측, Gemini CLI 등 추가 런타임 어댑터 추가 |
| **중기** | 마켓플레이스 / 커뮤니티 | 플러그인 공유 마켓플레이스 구축, 오픈소스 커뮤니티 생태계 조성 |
| **장기** | 노코드 UI | 비개발자용 시각적 플러그인 빌더 (드래그 앤 드롭) |

[Top](#dmap-빌더)

---

## 라이선스

MIT License

Copyright (c) 2026 Unicorn Inc.
https://github.com/unicorn-plugins/dmap

[Top](#dmap-빌더)

