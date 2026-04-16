# DMAP 플러그인 구조 가이드

- [DMAP 플러그인 구조 가이드](#dmap-플러그인-구조-가이드)
  - [개요](#개요)
  - [디렉토리 구조](#디렉토리-구조)
    - [최소 필수 구조](#최소-필수-구조)
    - [표준 전체 구조](#표준-전체-구조)
  - [핵심 파일 명세](#핵심-파일-명세)
    - [.claude-plugin/plugin.json](#claude-pluginpluginjson)
    - [.claude-plugin/marketplace.json](#claude-pluginmarketplacejson)
    - [skills/](#skills)
    - [agents/](#agents)
    - [commands/](#commands)
    - [gateway/runtime-mapping.yaml](#gatewayruntime-mappingyaml)
  - [5-Layer 아키텍처](#5-layer-아키텍처)
  - [네임스페이스 규칙](#네임스페이스-규칙)
  - [플러그인 라이프사이클 관리](#플러그인-라이프사이클-관리)
    - [로컬 프로젝트 배포: 개발 및 테스트용](#로컬-프로젝트-배포-개발-및-테스트용)
    - [사용자 글로벌 플러그인 배포](#사용자-글로벌-플러그인-배포)
      - [MarketPlace 추가](#marketplace-추가)
      - [플러그인 배포](#플러그인-배포)
    - [버전 업그레이드](#버전-업그레이드)
    - [플러그인/마켓플레이스 조회](#플러그인마켓플레이스-조회)
    - [플러그인/마켓플레이스 삭제](#플러그인마켓플레이스-삭제)

---

## 개요

DMAP 플러그인은 Claude 플러그인의 확장 패키지임.  
Markdown(프롬프트)과 YAML(설정)만으로 멀티에이전트 시스템을 정의하는 **선언형 구조**를 따름.
코드 작성 없이 도메인 전문가도 에이전트 시스템 구축 가능한 것이 핵심 특징임.

Claude Code와 Cursor에서 완벽히 동작하며 Claude CoWork에서는 CoWork의 동작 특성으로 인한 일부 제약 외 모두 동작함  

[Top](#claude-플러그인-구조-가이드)

---

## 디렉토리 구조

### 최소 필수 구조

```
{plugin-name}/
├── .claude-plugin/
│   ├── plugin.json          # 플러그인 메타데이터 (필수)
│   └── marketplace.json     # 마켓플레이스 배포 설정 (필수)
├── CLAUDE.md                # Claude 시스템 지시 및 라우팅 규칙 (필수)
└── README.md                # 사용자 문서
```

### 표준 전체 구조

```
{plugin-name}/
├── .claude-plugin/
│   ├── plugin.json          # 플러그인 메타데이터
│   └── marketplace.json     # 마켓플레이스 배포 설정
│
├── skills/                  # 스킬 (사용자 진입점)
│   ├── {skill-name}/
│   │   └── SKILL.md         # 스킬 프롬프트 + 프론트매터
│   └── {skill-name}.md      # 단순 스킬 (단일 파일)
│
├── agents/                  # 에이전트 패키지 (전문가 실행 단위)
│   └── {agent-name}/
│       ├── AGENT.md         # 에이전트 프롬프트
│       ├── agentcard.yaml   # 에이전트 메타데이터 (tier, role 등)
│       └── tools.yaml       # 추상 도구 선언
│
├── commands/                # 슬래시 명령 진입점
│   └── {skill-name}.md      # /{plugin-name}:{skill-name} 매핑
│
├── gateway/
│   └── runtime-mapping.yaml # 추상 선언 → 구체 도구 매핑
│
├── hooks/
│   └── hooks.json           # 이벤트 기반 횡단 관심사
│
├── CLAUDE.md                # Claude 시스템 지시 및 라우팅 규칙
├── README.md                # 사용자 문서
├── CONTRIBUTING.md          # 기여 가이드
└── LICENSE                  # 라이선스
```

[Top](#claude-플러그인-구조-가이드)

---

## 핵심 파일 명세

### .claude-plugin/plugin.json

플러그인의 기본 메타데이터를 정의하는 파일. 런타임이 플러그인을 인식하는 진입점임.

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "플러그인 설명",
  "author": {
    "name": "작성자 이름"
  },
  "repository": "https://github.com/org/my-plugin",
  "homepage": "https://github.com/org/my-plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | ✅ | 플러그인 고유 식별자 (소문자, 하이픈 허용) |
| `version` | ✅ | SemVer 형식 (예: `1.0.0`) |
| `description` | ✅ | 플러그인 한 줄 설명 |
| `author` | ✅ | 작성자 정보 |
| `repository` | — | GitHub 저장소 URL |
| `license` | — | 라이선스 식별자 |
| `keywords` | — | 검색용 태그 배열 |

[Top](#claude-플러그인-구조-가이드)

---

### .claude-plugin/marketplace.json

마켓플레이스 등록 및 배포를 위한 설정 파일. 단일 저장소에서 여러 플러그인 배포 가능.

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "my-marketplace",
  "owner": {
    "name": "Org Name"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./"
    }
  ]
}
```

**source 타입:**

| 타입 | 예시 | 설명 |
|------|------|------|
| 로컬 경로 | `"./"` | 현재 디렉토리 기준 상대 경로 |
| GitHub | `{ "source": "github", "repo": "org/repo" }` | GitHub 저장소 |
| git URL | `{ "source": "git", "url": "https://..." }` | 임의 git 저장소 |
| npm | `{ "source": "npm", "package": "pkg-name" }` | npm 패키지 |

[Top](#claude-플러그인-구조-가이드)

---

### skills/

사용자 요청을 처리하는 Orchestrator. 두 가지 유형으로 구분됨.

**① 위임형 스킬 (Orchestrator/Core/Planning)**  
에이전트에게 작업을 위임하는 오케스트레이터 역할. 직접 실행 금지.

```markdown
---
name: my-skill
description: 스킬 설명
type: orchestrator
user-invocable: true
---

# My Skill

## 목표
...

## 활성화 조건
사용자가 `/my-plugin:my-skill` 호출 시 또는 "키워드" 감지 시.

## 워크플로우
1. {agent-name} 에이전트에게 작업 위임
2. 결과 취합 후 사용자에게 보고
```

**② 직결형 스킬 (Setup/Utility)**  
Gateway(도구)를 직접 사용하는 단순 실행 스킬.

```markdown
---
name: setup
description: 초기 설정
type: utility
user-invocable: true
---

# Setup

## 목표
환경 설정 파일 생성 및 초기화.
```

**SKILL.md 프론트매터 필드:**

| 필드 | 설명 |
|------|------|
| `name` | 스킬 식별자 |
| `description` | 스킬 설명 |
| `type` | `orchestrator` / `utility` / `planning` |
| `user-invocable` | 사용자 직접 호출 가능 여부 |

[Top](#claude-플러그인-구조-가이드)

---

### agents/

전문가 역할의 자율 실행 단위. 스킬로부터 위임받아 작업 수행.  
반드시 3개 파일 쌍으로 구성됨.

**① AGENT.md** — 에이전트 역할 및 행동 지침 프롬프트

```markdown
# {Agent Name}

## 역할
이 에이전트는 ...을 전문으로 함.

## 행동 원칙
- 원칙 1
- 원칙 2

## 출력 형식
...
```

> ⚠️ AGENT.md에 모델명·도구명 하드코딩 금지 — runtime-mapping.yaml에서 해석

**② agentcard.yaml** — 에이전트 메타데이터

```yaml
name: my-agent
role: specialist          # orchestrator / specialist / reviewer
tier: HIGH                # HEAVY / HIGH / MEDIUM / LOW
description: "에이전트 설명"
escalation:               # 다른 에이젼트로 전환하는 조건  
  condition: "복잡도 초과 시"
  target: heavy-agent
```

**tier 기준:** 사용할 LLM 모델 등급. 실제 LLM모델명은 'gateway/runtime-mapping.yaml'에서 매핑  

| Tier | 모델 수준 | 용도 |
|------|----------|------|
| `HEAVY` | 최고 성능 | 복잡한 아키텍처, 심층 분석 |
| `HIGH` | 고성능 | 코드 생성, 설계, 리뷰 |
| `MEDIUM` | 표준 | 일반 작업, 변환 |
| `LOW` | 경량 | 단순 조회, 포맷팅 |

**③ tools.yaml** — 추상 도구 선언

```yaml
allowed:        # 사용할 수 있는 도구의 추상명칭. 실제 도구명은 'gateway/runtime-mapping.yaml'에서 매핑
  - file_read
  - file_write
  - web_search
  - shell_exec

forbidden_actions:  # 사용금지된 도구의 추상명칭. 실제 도구명은 'gateway/runtime-mapping.yaml'에서 매핑
  - file_delete
  - network_external
```

[Top](#claude-플러그인-구조-가이드)

---

### commands/
사용자 요청을 받는 End Point 역할.  
슬래시 명령(`/{plugin-name}:{skill-name}`)을 등록하는 파일.  
`commands/{skill-name}.md` 형식으로 생성하면 자동으로 슬래시 명령으로 노출됨.

```markdown
<!-- commands/my-skill.md -->
# /my-plugin:my-skill

skills/my-skill/SKILL.md 를 읽고 실행하시오.
```

[Top](#claude-플러그인-구조-가이드)

---

### gateway/runtime-mapping.yaml

추상 선언(tools.yaml)을 런타임의 구체 도구로 매핑하는 테이블.  
플러그인을 다른 런타임에 이식할 때 이 파일만 교체하면 됨.

```yaml
# tier → 모델 매핑
tier_mapping:
  HEAVY: claude-opus-4-6
  HIGH: claude-sonnet-4-6
  MEDIUM: claude-haiku-4-6
  LOW: claude-haiku-4-6

# 추상 도구 → 구체 도구 매핑
tool_mapping:
  file_read: [Read, Glob]
  file_write: [Write, Edit]
  shell_exec: [Bash]
  web_search: [WebSearch, WebFetch]
  code_analysis: [Grep, lsp_diagnostics, lsp_hover]

# 금지 액션 → 구체 도구 매핑
forbidden_mapping:
  file_delete: [Bash(rm:*)]
  file_write: [Write, Edit]
```

[Top](#claude-플러그인-구조-가이드)

---

## 5-Layer 아키텍처

DMAP 플러그인은 Clean Architecture를 기반으로 5개 계층으로 구성됨.

```
┌─────────────────────────────────────────┐
│        Commands (Controller)            │  ← 라우팅('/'명령 사용 시)
├─────────────────────────────────────────┤ 
│        Skills (Controller + Service)    │  ← 오케스트레이션(스킬 활성화 키워드 인지 시 Command 없이 직접 호출)
├─────────────────────────────────────────┤
│        Agents (Usecase + Domain)        │  ← 전문가 자율 실행
├─────────────────────────────────────────┤
│        Gateway (Infrastructure)         │  ← 추상→구체 도구 매핑
├─────────────────────────────────────────┤
│        Runtime (실행 환경)              │  ← 매핑 해석 + 에이전트 스폰(호출)
└─────────────────────────────────────────┘
         ↕ Hooks (AOP, 횡단 관심사)
```

**프롬프트 조립:** Skill이 Agent 스폰 시 아래와 같이 프롬프트를 조립하여 호출함   
```
1. `agents/{agent-name}/AGENT.md` 읽기
2. `agents/{agent-name}/agentcard.yaml` 읽기
3. `agents/{agent-name}/tools.yaml` 읽기 (있는 경우)
4. `gateway/runtime-mapping.yaml`에서 tier → 모델 매핑
5. `Agent(subagent_type=FQN, model=매핑된_모델, prompt=조립된_프롬프트)` 호출
```

**실행 경로:**

```
위임형:  Input → Skills → Agents → Gateway → Runtime
직결형:  Input → Skills ──────── → Gateway → Runtime
```

**계층별 핵심 파일:**

| 계층 | 역할 | 핵심 파일 |
|------|------|----------|
| Commands | 사용자 진입점(슬래시 명령 시) | `commands/{name}.md` |
| Skills | 사용자 진입점(스킬 활성화 키워드 인지 시) + 오케스트레이션 | `skills/{name}/SKILL.md` |
| Agents | 전문가 자율 실행 | `agents/{name}/AGENT.md`, `agentcard.yaml`, `tools.yaml` |
| Hooks | 이벤트 횡단 처리(특정 이벤트 발생 시 인터셉트하여 처리) | `hooks/hooks.json` |
| Gateway | 추상→구체 도구 변환 | `gateway/runtime-mapping.yaml` |
| Runtime | 에이전트 스폰 및 실행 | (런타임 내장) |

[Top](#claude-플러그인-구조-가이드)

---

## 네임스페이스 규칙

모든 스킬과 명령은 플러그인 이름을 접두사로 사용하여 충돌 방지.

| 항목 | 형식 | 예시 |
|------|------|------|
| 스킬 네임스페이스 | `{plugin-name}:{skill-name}` | `dmap:develop-plugin` |
| 슬래시 명령 | `/{plugin-name}:{skill-name}` | `/dmap:develop-plugin` |
| 에이전트 참조 | `{plugin-name}:{agent-name}` | `dmap:planner` |

**충돌 해소 우선순위:**

1. 로컬 프로젝트 플러그인: 특정 프로젝트에서만 동작하는 플러그인
2. 사용자 글로벌 플러그인: 현재 OS 사용자 전체에 적용되는 플러그인
3. 공식 마켓플레이스 플러그인: Claude Code의 기본 적용 플러그인 

[Top](#claude-플러그인-구조-가이드)

---

## 플러그인 라이프사이클 관리 

### 로컬 프로젝트 배포: 개발 및 테스트용    
해당 프로젝트에서만 동작하도록 플로그인 배포  
```
cd {plugin 디렉토리}
claude --plugin-dir .
```

### 사용자 글로벌 플러그인 배포   
현재 OS 사용자 전체에 적용   

#### MarketPlace 추가  
옵션1) 로컬에 다운로드한 플러그인 소스 이용  
```
claude plugin marketplace add ./ 
```
옵션2) Git 이용  
```
claude plugin marketplace {Git Organization}/{Git Repository} 
```  

#### 플러그인 배포  
```
claude plugin install {plugin-name}@{marketplace-name}
```

### 버전 업그레이드
```
claude plugin update {plugin-name}@{marketplace-name}
```

### 플러그인/마켓플레이스 조회  
```
claude plugin list
```

```
claude plugin marketplace list
```

### 플러그인/마켓플레이스 삭제 
```
claude plugin remove {plugin-name}@{marketplace-name}
```

```
claude plugin marketplace remove {marketplace-name}
```

※ 마켓플레이스를 삭제하면 그 마켓플레이스로 설치한 플러그인도 자동 삭제됨 


[Top](#claude-플러그인-구조-가이드)
