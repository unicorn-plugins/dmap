# Gateway 표준

> **교차 참조**: 아래 상황에서 추가 문서를 로드할 것.
> - 에이전트의 agentcard.yaml/tools.yaml 작성이 필요하면 → `standards/plugin-standard-agent.md`
> - 전체 아키텍처 확인이 필요하면 → `standards/plugin-standard.md`

---

## 한 줄 정의

Gateway는 플러그인의 도구 인프라 계층으로, 추상 선언(config/tools.yaml)을 구체 구현(실제 도구)으로 변환하는 매핑 테이블을 제공함.

> **직결형 스킬 참고**: 직결형 스킬(Setup, Utility)은 Agent 계층을 거치지 않고
> Gateway의 builtin 도구(Read, Write, Bash 등)를 직접 사용함.
> runtime-mapping.yaml의 매핑(tier/tool/action)은 위임형 스킬의 에이전트 스폰 시에만 적용됨.

[Top](#gateway-표준)

---

## Gateway 디렉토리 구조

```text
gateway/
├── install.yaml                 # [필수] 설치 매니페스트
├── runtime-mapping.yaml         # [필수] 추상 → 구체 매핑 테이블
├── mcp/                         # [선택] MCP 서버 설정
│   ├── context7.json
│   ├── playwright.json
│   └── ...
├── lsp/                         # [선택] LSP 서버 설정
│   └── typescript.json
└── tools/                       # [선택] 커스텀 도구 구현
    └── complexity.py
```

| 디렉토리/파일 | 필수 | 역할 |
|--------------|:----:|------|
| `install.yaml` | ✅ | 설치 매니페스트. Setup 스킬이 읽어 도구 인프라를 구성 |
| `runtime-mapping.yaml` | ✅ | 추상 선언 → 실제 도구 매핑. 런타임이 에이전트 실행 시 참조 |
| `mcp/` | 선택 | MCP 서버 연결 설정 (JSON). 외부 도구 제공 |
| `lsp/` | 선택 | LSP 서버 연결 설정 (JSON). 코드 분석 도구 제공 |
| `tools/` | 선택 | 플러그인 자체 구현 도구. 도메인 특화 기능 |

[Top](#gateway-표준)

---

## install.yaml 표준

Setup 스킬 수행 시 읽는 **설치 매니페스트**.
필요한 MCP 서버, LSP 서버, 커스텀 도구의 설치 정보를 선언함.

> **표준이 정의하는 것**: 설치 대상의 포맷, 시점, 검증 방법
> **표준이 정의하지 않는 것**: 구체적인 설치 명령 (`claude mcp add-json` 등) → 런타임 구현

### 설치 시점

```
사용자 → Setup 스킬 실행 → install.yaml 읽기 → 도구 인프라 구성
```

### 표준 포맷

```yaml
# ─────────────────────────────────────────────
# MCP 서버 — 외부 도구 제공
# ─────────────────────────────────────────────
mcp_servers:
  - name: context7                     # 서버 식별자
    description: "라이브러리 공식 문서 검색 및 코드 예시 제공"
    config: mcp/context7.json          # 연결 설정 파일 (gateway/ 기준 상대 경로)
    scope: user                        # 설치 범위 (user / project)
    required: true                     # 필수 여부

  - name: playwright
    description: "브라우저 자동화 및 E2E 테스트"
    config: mcp/playwright.json
    scope: user
    required: false                    # 선택 — 없어도 플러그인 동작

# ─────────────────────────────────────────────
# LSP 서버 — 코드 분석 도구 제공
#   주의: OMC 기본 제공 LSP(lsp_hover 등 12개)와 중복되지 않는
#   플러그인 고유 언어 서버만 선언
# ─────────────────────────────────────────────
lsp_servers:
  - name: graphql-language-server
    description: "GraphQL 스키마 검증 및 자동완성"
    install: "npm install -g graphql-language-service-cli"
    check: "graphql-lsp --version"
    required: false

# ─────────────────────────────────────────────
# 커스텀 도구 — 플러그인 자체 구현
# ─────────────────────────────────────────────
custom_tools:
  - name: complexity
    description: "코드 복잡도 분석 (순환 복잡도, 인지 복잡도)"
    source: tools/complexity.py        # gateway/ 기준 상대 경로
    required: false
```

### 필드 설명

| 영역 | 필드 | 필수 | 설명 |
|------|------|:----:|------|
| **mcp_servers** | `name` | ✅ | 서버 식별자 |
| | `description` | 선택 | 서버의 목적·용도 설명. Setup 스킬이 설치 시 참고 |
| | `config` | ✅ | 연결 설정 파일 경로 (JSON) |
| | `scope` | 권장 | 설치 범위: `user`(전역) / `project`(프로젝트) |
| | `required` | 권장 | `true`: 필수, `false`: 없어도 동작 |
| **lsp_servers** | `name` | ✅ | 서버 식별자 |
| | `description` | 선택 | 서버의 목적·용도 설명. Setup 스킬이 설치 시 참고 |
| | `install` | ✅ | 설치 명령 (런타임이 실행) |
| | `check` | 권장 | 설치 검증 명령 (성공 시 이미 설치됨) |
| | `required` | 권장 | 필수 여부 |
| **custom_tools** | `name` | ✅ | 도구 식별자 |
| | `description` | 선택 | 도구의 목적·용도 설명. Setup 스킬이 설치 시 참고 |
| | `source` | ✅ | 소스 파일 경로 (gateway/ 기준) |
| | `required` | 권장 | 필수 여부 |

> **작성 가이드**:
> - `required: true`인 항목이 설치 실패하면 플러그인 설치를 중단
> - `required: false`인 항목은 실패해도 경고만 출력하고 계속 진행
> - `check` 명령으로 이미 설치된 도구의 중복 설치를 방지
> - MCP 서버의 `config` 파일은 런타임 중립적 JSON 포맷으로 작성

### 중복 설치 금지

런타임 빌트인 도구와 오케스트레이션 플러그인(OMC 등)이 기본 제공하는 MCP/LSP는
install.yaml에 포함하지 않음. 이미 설치된 도구를 중복 등록하면 충돌·오류 발생 가능.

**Claude Code 빌트인 도구 (런타임 내장):**

| 유형 | 도구 |
|------|------|
| File | `Read`, `Write`, `Edit`, `Glob`, `Grep` |
| Shell | `Bash` |
| Web | `WebSearch`, `WebFetch` |
| Agent | `Task` |
| UI | `AskUserQuestion` |
| Notebook | `NotebookEdit` |
| Planning | `EnterPlanMode`, `ExitPlanMode` |
| Task 관리 | `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet` |
| Skill | `Skill` |

**OMC 기본 제공 MCP 서버:**

| 서버 | 별칭 | 제공 도구 |
|------|------|----------|
| OMC Tools | `t` | LSP 12개 + AST 2개 + Python REPL + skills/state/notepad/memory/trace |
| Codex Bridge | `x` | `ask_codex` (OpenAI 모델 위임) |
| Gemini Bridge | `g` | `ask_gemini` (Google 모델 위임) |

**OMC Tools 상세 (LSP·AST):**

| 카테고리 | 도구 |
|----------|------|
| LSP (12개) | `lsp_hover`, `lsp_goto_definition`, `lsp_find_references`, `lsp_document_symbols`, `lsp_workspace_symbols`, `lsp_diagnostics`, `lsp_diagnostics_directory`, `lsp_prepare_rename`, `lsp_rename`, `lsp_code_actions`, `lsp_code_action_resolve`, `lsp_servers` |
| AST (2개) | `ast_grep_search`, `ast_grep_replace` |
| Python (1개) | `python_repl` |

> **원칙**: install.yaml에는 위 목록에 없는 플러그인 고유 MCP/LSP/커스텀 도구만 선언함.

### 설치 실행 메커니즘

`install.yaml`은 **"무엇을 설치할지"의 데이터**이며,
실제 설치를 실행하려면 **설정 유형 스킬(setup skill)**이 필요함.

현재 런타임(Claude Code 등)은 `install.yaml`을 자동으로 읽는 기능이 없으므로,
플러그인에 설정 스킬을 포함하여 설치를 지시함.

```
install.yaml  = 데이터 (WHAT)   — "context7 MCP를 user 범위로 등록"
setup 스킬    = 지시 (HOW)      — "install.yaml을 읽고 설치를 수행하라"
런타임        = 실행 (DO)       — Bash로 명령 실행
```

**필수 구성**:

```text
my-plugin/
├── skills/
│   └── setup/                   # [필수] 설정 유형 스킬
│       └── SKILL.md             # install.yaml을 읽고 설치를 지시하는 프롬프트
├── gateway/
│   ├── install.yaml             # [필수] 설치 매니페스트 (데이터)
│   └── ...
└── ...
```

**setup 스킬의 역할**:

1. `gateway/install.yaml` 읽기
2. 각 항목의 `check` 명령으로 이미 설치 여부 확인
3. 미설치 항목에 대해 설치 명령 실행
   - MCP: 런타임의 MCP 등록 명령 (예: `claude mcp add-json`)
   - LSP: `install` 필드의 명령 실행
   - 커스텀 도구: `source` 파일 확인
4. `required: true` 항목 실패 시 설치 중단 및 사용자 안내
5. 런타임 상주 파일에 플러그인 활성화 라우팅 테이블 추가
   - 사용자에게 적용 범위를 질문하여 대상 파일 결정:

   | 선택지 | 설명 | 대상 파일 (Claude Code 예시) |
   |--------|------|---------------------------|
   | 모든 프로젝트 | 어디서든 이 플러그인 사용 | `~/.claude/CLAUDE.md` |
   | 이 프로젝트만 | 현재 프로젝트에서만 사용 | `./CLAUDE.md` |

6. 설치 결과 요약 보고

> **원칙**:
> - 모든 플러그인은 **설정 스킬을 반드시 포함**해야 함
> - 설정 스킬은 `install.yaml`의 데이터만 참조 — 설치 대상을 하드코딩하지 않음
> - 향후 런타임이 `install.yaml` 자동 읽기를 지원하면, 설정 스킬 없이도 동작 가능

[Top](#gateway-표준)

---

## runtime-mapping.yaml 표준

런타임이 참조하는 **추상 → 구체 변환 테이블**.
티어 매핑, 도구 매핑, 액션 매핑의 세 영역으로 구성됨.

### 전체 포맷

```yaml
# ─────────────────────────────────────────────
# 티어 → LLM 모델 매핑
#   agentcard.yaml의 tier 값을 실제 모델에 매핑
#   전역 기본값(default) + 에이전트별 예외
# ─────────────────────────────────────────────
tier_mapping:
  default:                             # 전역 기본값
    HEAVY:
      model: "claude-opus-4-6"
    HIGH:
      model: "claude-opus-4-6"
    MEDIUM:
      model: "claude-sonnet-4-5"
    LOW:
      model: "claude-haiku-4-5"
  designer:                            # 에이전트별 예외
    HIGH:
      model: "claude-sonnet-4-5"       # 디자인은 sonnet으로 충분
  scientist:
    HIGH:
      model: "claude-opus-4-6"         # 분석은 반드시 opus

# ─────────────────────────────────────────────
# 추상 도구명 → 실제 도구 매핑
#   tools.yaml의 도구 선언을 실제 도구에 매핑
# ─────────────────────────────────────────────
tool_mapping:
  # builtin 도구(Read, Write, Bash 등)는 런타임이 내장 처리하므로 생략.
  # 여기에는 lsp, mcp, custom 도구만 매핑함.

  # ── 코드 분석 ──
  code_search:
    - type: lsp
      tools: ["lsp_workspace_symbols"]
    - type: mcp
      server: "omc-tools"
      tools: ["ast_grep_search"]

  code_diagnostics:
    - type: lsp
      tools: ["lsp_diagnostics", "lsp_diagnostics_directory"]

  symbol_lookup:
    - type: lsp
      tools: ["lsp_hover", "lsp_goto_definition"]

  symbol_references:
    - type: lsp
      tools: ["lsp_find_references"]

  code_refactor:
    - type: lsp
      tools: ["lsp_rename", "lsp_code_actions", "lsp_code_action_resolve"]
    - type: mcp
      server: "omc-tools"
      tools: ["ast_grep_replace"]

  # ── 커스텀 도구 ──
  complexity_analysis:
    - type: custom
      source: "tools/complexity.py"
      tools: ["analyze_complexity"]

# ─────────────────────────────────────────────
# 액션 카테고리 → 실제 도구 매핑
#   agentcard.yaml의 forbidden_actions를 실제 도구에 매핑
# ─────────────────────────────────────────────
action_mapping:
  file_write: ["Write", "Edit"]
  file_delete: ["Bash"]
  code_execute: ["Bash"]
  network_access: ["WebFetch", "WebSearch"]
  user_interact: ["AskUserQuestion"]
  agent_delegate: ["Task"]
```

### 작성 가이드: tier_mapping

**기본 규칙**:
- `default`는 전역 기본값. 에이전트명으로 예외 매핑 추가 가능
- 에이전트별 매핑이 있으면 default보다 우선 적용
- 각 티어는 `model`만 정의 — 예산(budget)은 런타임이 자체 관리
- 티어는 LLM 모델 등급 선언 — Gateway가 실제 모델명으로 매핑
- 모델명은 **작성 시점의 최신 버전**을 사용 — 신규 모델 출시 시 이 파일만 갱신하면 전체 에이전트에 반영

**Anthropic 모델 매핑 예시**:

| 티어 | 모델 |
|------|------|
| HEAVY | claude-opus-4-6 |
| HIGH | claude-opus-4-6 |
| MEDIUM | claude-sonnet-4-5 |
| LOW | claude-haiku-4-5 |

### 작성 가이드: tool_mapping

**기본 규칙**:
- builtin 도구(Read, Write, Bash 등)는 런타임이 내장 처리하므로 생략
- lsp, mcp, custom 도구만 매핑 — 런타임이 자체적으로 알 수 없는 도구를 선언
- 동일 카테고리에 여러 타입 나열 시 우선순위 순서 — 런타임이 사용 가능한 것을 선택
- 플러그인별 도메인 매핑 추가 가능 (예: `db_query: [{ type: custom, tools: ["QueryTool"] }]`)

**type별 설명**:

| type | 설명 | 예시 |
|------|------|------|
| `lsp` | Language Server Protocol 도구 | lsp_diagnostics, lsp_rename |
| `mcp` | Model Context Protocol 서버 도구 (`server` 필드로 서버 지정) | ast_grep_search |
| `custom` | 플러그인이 직접 제공하는 도구 (`source` 필드로 경로 지정) | analyze_complexity |

**custom 타입 필드**:
- `source`: 도구 구현체의 파일 경로 (예: `tools/complexity.py`) — 런타임이 이 파일을 로드하여 실행
- `tools`: 해당 카테고리에 필요한 도구명만 나열 — source의 모든 도구를 나열할 필요 없음.
  하나의 source가 여러 도구를 제공할 경우 각 카테고리에 필요한 것만 매핑함

### 작성 가이드: action_mapping

- `forbidden_actions`의 추상 카테고리를 실제 도구명으로 변환
- 런타임이 에이전트에게 금지 도구를 제외할 때 참조

[Top](#gateway-표준)

---

## 표준 템플릿

### install.yaml 템플릿

```yaml
# MCP 서버
mcp_servers:
  - name: <서버명>
    description: "<서버 목적·용도>"   # 선택
    config: mcp/<서버명>.json
    scope: user                    # user | project
    required: true                 # true | false

# LSP 서버
lsp_servers:
  - name: <서버명>
    description: "<서버 목적·용도>"   # 선택
    install: "<설치 명령>"
    check: "<검증 명령>"
    required: true

# 커스텀 도구
custom_tools:
  - name: <도구명>
    description: "<도구 목적·용도>"   # 선택
    source: tools/<파일명>
    required: false
```

### runtime-mapping.yaml 템플릿

```yaml
# 티어 매핑 (모델만)
tier_mapping:
  default:
    HEAVY:
      model: "claude-opus-4-6"
    HIGH:
      model: "claude-opus-4-6"
    MEDIUM:
      model: "claude-sonnet-4-5"
    LOW:
      model: "claude-haiku-4-5"

# 도구 매핑
tool_mapping:
  <추상_도구명>:
    - type: lsp
      tools: ["<lsp_도구명>"]
    - type: mcp
      server: "<mcp_서버명>"
      tools: ["<mcp_도구명>"]
    - type: custom
      source: "tools/<파일명>"
      tools: ["<커스텀_도구명>"]

# 액션 매핑
action_mapping:
  file_write: ["Write", "Edit"]
  file_delete: ["Bash"]
  code_execute: ["Bash"]
  network_access: ["WebFetch", "WebSearch"]
  user_interact: ["AskUserQuestion"]
  agent_delegate: ["Task"]
```

[Top](#gateway-표준)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | install.yaml + runtime-mapping.yaml 필수 포함 |
| 2 | runtime-mapping.yaml에 tier_mapping, tool_mapping, action_mapping 3영역 구성 |
| 3 | tier_mapping에 default 전역 기본값 포함 (HEAVY/HIGH/MEDIUM/LOW), 각 티어에 model 정의 |
| 4 | setup 스킬이 install.yaml을 참조하여 설치 수행 |
| 5 | MCP 서버 config는 런타임 중립적 JSON 포맷 |

[Top](#gateway-표준)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | install.yaml에 설치 명령을 직접 포함 (데이터만, 실행은 setup 스킬) |
| 2 | builtin 도구(Read, Write, Bash)를 tool_mapping에 포함 (런타임 내장 처리) |
| 3 | install.yaml에 런타임 빌트인 도구 또는 OMC 기본 제공 MCP/LSP 포함 (중복 설치 금지) |

[Top](#gateway-표준)

---

## 검증 체크리스트

- [ ] install.yaml 존재
- [ ] runtime-mapping.yaml 존재
- [ ] tier_mapping에 default 섹션 포함 (HEAVY/HIGH/MEDIUM/LOW), 각 티어에 model 정의
- [ ] 에이전트의 tools.yaml 선언이 tool_mapping에 매핑됨
- [ ] 에이전트의 forbidden_actions가 action_mapping에 매핑됨
- [ ] required: true 항목의 설치 실패 시 중단 로직 확인
- [ ] MCP 서버 config JSON 파일 존재 확인
- [ ] setup 스킬이 install.yaml을 참조하도록 구성됨
- [ ] builtin 도구(Read, Write, Bash)가 tool_mapping에 없음 (런타임 내장)
- [ ] install.yaml에 런타임 빌트인/OMC 기본 도구가 포함되지 않음 (중복 설치 금지)
- [ ] tier_mapping 모델명이 작성 시점의 최신 버전임

[Top](#gateway-표준)
