# DMAP 빌더 표준

- [DMAP 빌더 표준](#dmap-빌더-표준)
  - [핵심 원칙](#핵심-원칙)
  - [5-Layer 아키텍처](#5-layer-아키텍처)
  - [문서 참조 규칙](#문서-참조-규칙)
  - [핵심 규칙](#핵심-규칙)
    - [MUST 규칙](#must-규칙)
    - [MUST NOT 규칙](#must-not-규칙)
  - [4-Tier 에이전트 모델](#4-tier-에이전트-모델)
  - [플러그인 디렉토리 구조](#플러그인-디렉토리-구조)
    - [최소 필수 구조](#최소-필수-구조)
    - [표준 전체 구조](#표준-전체-구조)
  - [네임스페이스](#네임스페이스)
    - [네임스페이스 형식](#네임스페이스-형식)
    - [네임스페이스 적용 방식](#네임스페이스-적용-방식)
    - [슬래시 명령 등록](#슬래시-명령-등록)
    - [충돌 해소 우선순위](#충돌-해소-우선순위)
  - [빠른 참조](#빠른-참조)

---

## 핵심 원칙

| 원칙 | 의미 |
|------|------|
| **선언형** | Markdown(프롬프트) + YAML(설정)만으로 에이전트 시스템 정의 |
| **런타임 중립** | 추상 선언(agentcard.yaml, tools.yaml) ↔ 구체 매핑(runtime-mapping.yaml) 분리 (Dependency Inversion) |
| **Clean Architecture** | 위임형: Skills → Agents → Gateway 단방향 의존. 직결형: Skills → Gateway 직접 접근 허용. Hooks가 횡단적 개입(AOP) |
| **YAGNI** | 필요하지 않은 계층은 생략 — 직결형 스킬(Setup, Utility)에 Agent 위임을 강제하지 않음 |

> YANGI(You Aren't Gonna Need It): 불필요한 걸 미리 만들지 말라는 XP 설계 철학
  
[Top](#dmap-빌더-표준)

---

## 5-Layer 아키텍처

| Layer | Clean Architecture | 역할 | 핵심 파일 | 상세 문서 |
|-------|-------------------|------|----------|----------|
| Input | — | 외부(사용자/API 등) 요청 | — | — |
| Controller + UseCase | Skills | 라우팅 + 오케스트레이션 | SKILL.md | [→ Skill 상세](plugin-standard-skill.md) |
| Service | Agents | 전문가 자율 실행 | AGENT.md, agentcard.yaml, tools.yaml | [→ Agent 상세](plugin-standard-agent.md) |
| Gateway | 도구 인프라 | 추상→구체 매핑 | runtime-mapping.yaml | [→ Gateway 상세](plugin-standard-gateway.md) |
| Runtime | 실행 환경 | 매핑 해석 + 에이전트 스폰 | — | [→ Runtime 상세](plugin-standard-runtime.md) |
| Cross-cutting | Hooks (AOP) | 모든 계층의 이벤트 횡단적 가로챔 | hooks.json | — |

**스킬 실행 경로:**
```
위임형:  Input → Skills(Controller) → Agents(Service) → Gateway → Runtime
직결형:  Input → Skills(Controller) ──────────────────→ Gateway → Runtime
                                                         ↑
                                              Hooks (Cross-cutting, AOP)
```

**컴포넌트별 역할:**

| 컴포넌트 | 역할 | 트리거 방식 |
|----------|------|-------------|
| **Skills** | 사용자 진입점. 위임형: 오케스트레이션 → Agent 위임, 직결형: Gateway 직접 사용 | 명시적 호출 |
| **Agents** | 역할별 전문가 — 위임받은 작업을 자율 수행 | Skills가 위임 |
| **Hooks** | 시스템 이벤트 가로채기 (감시·강제·로깅) | 이벤트 구동 (자동) |
| **Gateway** | 외부 도구·API를 추상 인터페이스로 제공 | 상시 대기 |
| **Runtime** | 매핑 해석 → 컨텍스트 조립 → 에이전트 스폰/실행 | 백그라운드 |

**위임형 스킬의 에이전트 구동 흐름:**

```mermaid
sequenceDiagram
    participant U as 사용자
    participant S as 위임형 스킬<br/>(Controller)
    participant AP as 에이전트 패키지<br/>(agents/{name}/)
    participant GW as Gateway<br/>(runtime-mapping.yaml)
    participant A as 에이전트<br/>(Service)

    U->>S: 작업 요청

    rect rgb(240, 248, 255)
    Note over S,AP: ① 에이전트 패키지 로드
    S->>AP: 3파일 읽기
    AP-->>S: AGENT.md + agentcard.yaml + tools.yaml
    end

    rect rgb(255, 248, 240)
    Note over S,GW: ② runtime-mapping.yaml 참조하여 구체화
    S->>GW: tier (예: HIGH)
    GW-->>S: 모델 구체화 (예: claude-opus-4-6)
    S->>GW: tools.yaml 추상 도구
    GW-->>S: 툴 구체화 (예: Read, Grep, lsp_diagnostics)
    S->>GW: forbidden_actions (예: file_write)
    GW-->>S: 금지액션 구체화 (예: Write, Edit)
    end

    rect rgb(240, 255, 240)
    Note over S: ③ 최종 도구 = 구체화 도구 - 제외 도구
    Note over S: ④ 프롬프트 조립 (3파일 합치기)
    Note over S: ⑤ 캐시 활용 — 공통 정적 → 에이전트별 정적 → 동적 순서 배치
    S->>A: Task(FQN, model=opus, prompt=조립된 프롬프트)
    end

    Note over A: ⑥ 자율 실행 (최종 도구만 사용)
    A-->>S: 실행 결과
    S-->>U: 결과 보고
```

**Gateway 세분류:**

| 유형 | 도구 | 대응 시스템 |
|------|------|-----------|
| File | Read, Write, Edit, Glob, Grep | 파일 시스템 |
| Shell | Bash | 터미널 / OS |
| Web | WebSearch, WebFetch | 웹 / 검색엔진 |
| MCP | context7, exa, playwright 등 | 외부 API, DB, 브라우저 |
| LSP | diagnostics, hover, references | IDE 수준 언어 분석 |
| Custom | AST grep, Python REPL, state, notepad | 플러그인 자체 확장 도구 |

[Top](#dmap-빌더-표준)

---

## 문서 참조 규칙

AI가 작업별로 로드할 문서를 정의함. 이미 로드한 문서는 재로드하지 않음.

| 작업 유형 | 로드할 문서 | 토큰 규모 |
|----------|-----------|----------|
| 스킬 생성·수정 | `standards/plugin-standard-skill.md` | ~8,000 |
| 에이전트 생성·수정 | `standards/plugin-standard-agent.md` | ~8,000 |
| Gateway·도구 매핑 | `standards/plugin-standard-gateway.md` | ~6,000 |
| 런타임 매핑·실행 흐름 | `standards/plugin-standard-runtime.md` | ~4,000 |
| 배포·마켓플레이스 | `standards/plugin-standard-deployment.md` | ~6,000 |
| 전체 플러그인 신규 생성 | 위 문서 전체를 순차 로드 | ~32,000 |

[Top](#dmap-빌더-표준)

---

## 핵심 규칙

### MUST 규칙

| # | 규칙 | 근거 |
|---|------|------|
| 1 | 모든 플러그인은 `.claude-plugin/plugin.json` 포함 | 런타임 인식 진입점 |
| 2 | 모든 에이전트는 AGENT.md(프롬프트) + agentcard.yaml(메타데이터) 쌍으로 구성 | 프롬프트/메타데이터 분리 |
| 3 | tier는 HEAVY / HIGH / MEDIUM / LOW 중 하나만 사용 | 런타임 매핑 표준 |
| 4 | 위임형 스킬(Core, Planning, Orchestrator)은 라우팅+오케스트레이션만 수행, 작업 실행은 에이전트에 위임. 직결형 스킬(Setup, Utility)은 Gateway 직접 사용 허용 | 관심사 분리 + 실용성 |
| 5 | Skill→Agent 위임은 Task 도구, Skill→Skill 위임은 Skill 도구 사용 | 위임 메커니즘 구분 |
| 6 | 추상 선언(tools.yaml)과 구체 매핑(runtime-mapping.yaml) 분리 | Dependency Inversion |
| 7 | 스킬 네임스페이스는 `{plugin-name}:{skill-name}` 형식 | 충돌 방지 |
| 8 | `/{plugin-name}:{skill-name}` 형식의 진입점 위해 커맨드 생성 | 슬래시 명령 노출 |
| 9 | setup 스킬 반드시 포함 | 설치/라우팅 등록 |
| 10 | AGENT.md에 도구 명세 금지 — tools.yaml에 분리 | 프롬프트/도구 분리 |

### MUST NOT 규칙

| # | 금지 사항 | 이유 |
|---|----------|------|
| 1 | 스킬이 직접 애플리케이션 코드 작성·수정 (직결형 스킬의 설정 파일·문서 작업은 예외) | 에이전트의 역할 침범 |
| 2 | 에이전트가 직접 라우팅·오케스트레이션 | 스킬의 역할 침범 |
| 3 | agentcard.yaml에 프롬프트 내용 포함 | 기계 판독용 데이터와 프롬프트 혼재 |
| 4 | AGENT.md에 모델명·도구명 하드코딩 | 런타임 중립성 위반 |
| 5 | 일반 플러그인에서 Hook 사용 | 오케스트레이션 플러그인(OMC) 전용 영역 |

[Top](#dmap-빌더-표준)

---

## 4-Tier 에이전트 모델

동일 역할을 비용-역량 트레이드오프에 따라 티어별로 분리하는 원칙.
티어는 LLM 모델 등급을 결정하는 추상 선언이며, Gateway의 `runtime-mapping.yaml`이 실제 모델로 매핑함.

| 티어 | LLM 모델 | 특성 | 적합 작업 | 에스컬레이션 |
|------|---------|------|----------|-------------|
| LOW | Haiku | 빠르고 저비용 | 단건 조회, 간단한 수정 | 복잡도 초과 시 상위 티어로 보고 |
| MEDIUM | Sonnet | 균형 | 기능 구현, 일반 분석 | — |
| HIGH | Opus | 최고 역량, 고비용 | 복잡한 의사결정, 심층 분석 | — |
| HEAVY | Opus (대규모 예산) | 최고 역량 + 대규모 토큰·시간 | 장시간 추론, 대규모 멀티파일 작업 | — |

**핵심 메커니즘:**
- **에스컬레이션**: LOW가 자기 한계 인식 → 상위 티어로 보고
- **상속**: 티어 변형 에이전트가 기본 에이전트의 config를 상속, 오버라이드만 기술
- **런타임 매핑**: 스킬이 에이젼트 호출 시 실제 모델로 변환하여 에이젼트에 전달 

[Top](#dmap-빌더-표준)

---

## 플러그인 디렉토리 구조

### 최소 필수 구조

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json            # 플러그인 매니페스트 (유일한 필수 파일)
```

### 표준 전체 구조

```
my-plugin/
├── .claude-plugin/             # 플러그인 메타데이터 (필수)
│   ├── plugin.json             # 매니페스트: name, description, version 등
│   └── marketplace.json        # 마켓플레이스 매니페스트 (배포 시 필요)
│
├── skills/                     # 스킬 정의 (필수, 자동 탐색)
│   ├── skill-name/
│   │   ├── SKILL.md            # 메인 지시 파일 (스킬당 필수)
│   │   ├── scripts/            # 실행 스크립트 (선택)
│   │   ├── references/         # 참고 문서 (선택)
│   │   └── assets/             # 템플릿, 바이너리 (선택)
│
├── agents/                      # 에이전트 정의 (필수, 자동 탐색)
│   └── agent-name/             # 에이전트 패키지 (디렉토리)
│       ├── AGENT.md            # 프롬프트 (필수)
│       ├── agentcard.yaml         # 역량·제약·핸드오프 (필수)
│       └── tools.yaml          # 필요 도구 선언 (선택)
│
├── gateway/                    # 도구 인프라 및 런타임 매핑 (필수)
│   ├── install.yaml            # 설치 매니페스트 (필수)
│   ├── runtime-mapping.yaml    # 티어·도구·액션 매핑 (필수)
│   ├── mcp/                    # MCP 서버 설정 (선택)
│   ├── lsp/                    # LSP 서버 설정 (선택)
│   └── tools/                  # 커스텀 도구 (선택)
│
├── commands/                   # 슬래시 명령 진입점 (필수)
│   └── skill-name.md           # 스킬별 슬래시 명령 등록 (YAML frontmatter + 위임)
│
├── hooks/                      # 이벤트 핸들러 (선택, 자동 탐색)
│   └── hooks.json              # Hook 이벤트 → 스크립트 매핑
│
└── package.json                # NPM 패키지 (선택. NPM 배포 시에만 필요)
```

[Top](#dmap-빌더-표준)

---

## 네임스페이스

### 네임스페이스 형식

| 항목 | 형식 | 예시 |
|------|------|------|
| 스킬 전체 이름 | `{plugin-name}:{skill-dir-name}` | `abra:scenario` |
| 사용자 호출 | `/{plugin-name}:{skill-dir-name}` | `/abra:scenario` |

### 네임스페이스 적용 방식

`plugin.json`의 `name` 필드가 네임스페이스 접두사로 사용됨.
스킬의 이름은 `skills/` 하위 디렉토리명으로 결정됨.

```
plugin.json:     { "name": "abra" }
스킬 디렉토리:    skills/setup/SKILL.md
→ 슬래시 명령:    /abra:setup  ✅
```

### 슬래시 명령 등록

사용자가 `/plugin-name:skill-name` 형식으로 호출하려면
`commands/` 디렉토리에 진입점 파일 필요. commands 파일이 없으면 슬래시 명령 목록에 표시되지 않음.

```
commands/setup.md
─────────────────
---
description: Abra 플러그인 초기 설정
---

Use the Skill tool to invoke the `abra:setup` skill with all arguments passed through.
```

### 충돌 해소 우선순위

| 우선순위 | 출처 | 설명 |
|---------|------|------|
| 1 (최고) | 플랫폼 내장 명령 | `/help`, `/clear` 등 — 제외 목록으로 보호 |
| 2 | Enterprise | 조직 관리 설정으로 배포된 스킬 |
| 3 | Personal | `~/.claude/skills/` 디렉토리에 정의된 스킬 |
| 4 | Project | 프로젝트 `.claude/skills/` 디렉토리에 정의된 스킬 |
| 5 (최저) | 플러그인 | 플러그인 패키지에 포함된 스킬 (`plugin-name:skill-name` 형식) |

[Top](#dmap-빌더-표준)

---

## 빠른 참조

| 컴포넌트 | 필수 파일 | 선택 파일 |
|----------|----------|----------|
| 플러그인 | `.claude-plugin/plugin.json` | `marketplace.json` |
| 스킬 | `SKILL.md` | `scripts/`, `references/`, `assets/` |
| 에이전트 | `AGENT.md`, `agentcard.yaml` | `tools.yaml`, `references/`, `templates/` |
| Gateway | `install.yaml`, `runtime-mapping.yaml` | `mcp/`, `lsp/`, `tools/` |
| 슬래시 명령 | `commands/{skill-name}.md` | — |
| Hooks | `hooks/hooks.json` | 핸들러 스크립트 |

[Top](#dmap-빌더-표준)
