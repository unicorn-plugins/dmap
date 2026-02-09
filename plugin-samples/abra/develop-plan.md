# Abra 플러그인 개발 계획서

- [Abra 플러그인 개발 계획서](#abra-플러그인-개발-계획서)
  - [1. 개요](#1-개요)
  - [2. 공유 자원 활용 계획](#2-공유-자원-활용-계획)
  - [3. 커스텀 도구 계획](#3-커스텀-도구-계획)
  - [4. 외부 자원 수집 계획](#4-외부-자원-수집-계획)
  - [5. 디렉토리 구조](#5-디렉토리-구조)
  - [6. 매니페스트 설계](#6-매니페스트-설계)
    - [6.1 plugin.json](#61-pluginjson)
    - [6.2 marketplace.json](#62-marketplacejson)
  - [7. 에이전트 상세 설계](#7-에이전트-상세-설계)
    - [7.1 scenario-analyst](#71-scenario-analyst)
    - [7.2 dsl-architect](#72-dsl-architect)
    - [7.3 prototype-runner](#73-prototype-runner)
    - [7.4 plan-writer](#74-plan-writer)
    - [7.5 agent-developer](#75-agent-developer)
  - [8. 스킬 상세 설계](#8-스킬-상세-설계)
    - [8.1 core (핵심스킬)](#81-core-핵심스킬)
    - [8.2 setup (설정스킬)](#82-setup-설정스킬)
    - [8.3 dify-setup (설정스킬)](#83-dify-setup-설정스킬)
    - [8.4 scenario (지휘자스킬)](#84-scenario-지휘자스킬)
    - [8.5 dsl-generate (지휘자스킬)](#85-dsl-generate-지휘자스킬)
    - [8.6 prototype (지휘자스킬)](#86-prototype-지휘자스킬)
    - [8.7 dev-plan (지휘자스킬)](#87-dev-plan-지휘자스킬)
    - [8.8 develop (지휘자스킬)](#88-develop-지휘자스킬)
  - [9. Gateway 상세 설계](#9-gateway-상세-설계)
    - [9.1 install.yaml](#91-installyaml)
    - [9.2 runtime-mapping.yaml](#92-runtime-mappingyaml)
  - [10. CLAUDE.md 라우팅 테이블](#10-claudemd-라우팅-테이블)
  - [11. 개발 순서](#11-개발-순서)
  - [12. 검증 계획](#12-검증-계획)

---

## 1. 개요

**플러그인명**: `abra`
**목적**: 자연어로 비즈니스 시나리오를 입력하면 Dify 워크플로우 DSL 생성 → 프로토타이핑 → 개발계획서 → AI Agent 개발까지 전 과정을 자동화하는 DMAP 플러그인
**설계 기준**: DMAP 빌더 표준 (`standards/plugin-standard*.md`)
**개발 위치**: `plugin-samples/abra/`

**핵심 가치:**

| 가치 | 설명 |
|------|------|
| 점진적 구체화 | 자연어 → 시나리오 → DSL → 프로토타입 → 계획 → 프로덕션 코드 |
| Dify 활용 | Dify Visual Builder를 프로토타이핑 도구로 활용 |
| 'M'사상 체화 | Value-Oriented(WHY First), Interactive(사용자 선택), Iterative(에러 수정 루프) |

**5단계 자동화 워크플로우:**

```
STEP 1          STEP 2          STEP 3          STEP 4          STEP 5
비즈니스        Dify DSL        Dify            개발계획서      AI Agent
시나리오 ──────▶ 자동생성 ──────▶ 프로토타이핑 ──▶ 작성 ──────────▶ 개발
(Human+AI)     (AI)            (AI)            (AI)            (AI)

              ◀──── 에러 시 DSL 수정 루프 (Iterative) ────▶
```

| STEP | 이름 | 입력 | 출력 |
|------|------|------|------|
| 1 | 시나리오 생성 & 선택 | 서비스 목적 + 생성 갯수 | 선택된 시나리오 문서 |
| 2 | DSL 자동생성 | 시나리오 문서 | Dify YAML DSL 파일 |
| 3 | 프로토타이핑 | DSL 파일 | 검증된 DSL (Export) |
| 4 | 개발계획서 작성 | 검증된 DSL + 시나리오 | 개발계획서 |
| 5 | AI Agent 개발 | 개발계획서 + DSL | 프로덕션 코드 또는 Dify 앱 |

[Top](#abra-플러그인-개발-계획서)

---

## 2. 공유 자원 활용 계획

리소스 마켓플레이스(`resources/`)에서 가져올 공유 자원 목록.

### 가이드

| 자원명 | 원본 경로 | 복사 위치 | 용도 |
|--------|----------|----------|------|
| dify-workflow-dsl-guide | `resources/guides/dify/dify-workflow-dsl-guide.md` | `agents/dsl-architect/references/` | STEP 2 DSL 생성 시 구조·노드·변수 참조 |

### 템플릿

| 자원명 | 원본 경로 | 복사 위치 | 용도 |
|--------|----------|----------|------|
| requirement-generater | `resources/templates/general/requirement-generater.md` | `agents/scenario-analyst/references/` | STEP 1 시나리오 생성 프롬프트 |
| dsl-generation-prompt | `resources/templates/dify/dsl-generation-prompt.md` | `agents/dsl-architect/references/` | STEP 2 DSL 생성 프롬프트 |
| develop-plan-generate | `resources/templates/dify/develop-plan-generate.md` | `agents/plan-writer/references/` | STEP 4 개발계획서 생성 프롬프트 |
| develop | `resources/templates/general/develop.md` | `agents/agent-developer/references/` | STEP 5 Agent 개발 프롬프트 |
| README-plugin-template | `resources/templates/plugin/README-plugin-template.md` | README 작성 시 참고 (복사 불요) | README.md 스켈레톤 |

### 샘플

| 자원명 | 원본 경로 | 용도 |
|--------|----------|------|
| README | `resources/samples/plugin/README.md` | README.md 작성 시 Abra 예시 참고 (복사 불요, 직접 참조) |

### 도구 소스

| 자원명 | 원본 경로 | 복사 위치 | 용도 |
|--------|----------|----------|------|
| dify_cli.py | `resources/tools/customs/dify-cli/dify_cli.py` | `gateway/tools/dify_cli.py` | Dify 앱 관리 CLI |
| dify_client.py | `resources/tools/customs/dify-cli/dify_client.py` | `gateway/tools/dify_client.py` | Dify Console API 비동기 클라이언트 |
| config.py | `resources/tools/customs/dify-cli/config.py` | `gateway/tools/config.py` | Dify 접속 설정 로더 |
| validate_dsl.py | `resources/tools/customs/dify-cli/validate_dsl.py` | `gateway/tools/validate_dsl.py` | DSL YAML 문법·구조 사전 검증 |
| requirements.txt | `resources/tools/customs/dify-cli/requirements.txt` | `gateway/requirements.txt` | Python 의존성 (mcp 제외, httpx·dotenv·pyyaml만) |

> **자체 포함(self-contained) 원칙**: 모든 도구 소스는 플러그인 내 `gateway/tools/`에 복사하여
> 외부 경로 의존 없이 동작하도록 구성.

[Top](#abra-플러그인-개발-계획서)

---

## 3. 커스텀 도구 계획

### 기존 자산 활용

Abra 플러그인은 **신규 커스텀 도구 개발이 불필요**하며, 리소스 마켓플레이스의 기존 자산을 그대로 활용함.

| 도구 | 유형 | 역할 | 의존성 |
|------|------|------|--------|
| `dify_cli.py` | 커스텀 앱 (CLI) | Dify 앱 관리: list, export, import, update, publish, run | `dify_client.py`, `config.py` |
| `dify_client.py` | 라이브러리 | Dify Console API 비동기 클라이언트 (`dify_cli`의 백엔드) | `httpx`, `python-dotenv` |
| `config.py` | 설정 모듈 | Dify 접속 설정 관리 (`gateway/.env` 참조) | `python-dotenv` |
| `validate_dsl.py` | 커스텀 앱 (CLI) | DSL YAML 문법·구조 사전 검증 (Import 전 필수) | `pyyaml` |

### CLI 명령 목록

| 작업 | CLI 명령 |
|------|----------|
| 앱 목록 조회 | `python gateway/tools/dify_cli.py list` |
| DSL 업로드 (신규) | `python gateway/tools/dify_cli.py import` |
| DSL 업로드 (갱신) | `python gateway/tools/dify_cli.py update` |
| 워크플로우 게시 | `python gateway/tools/dify_cli.py publish` |
| 워크플로우 실행 | `python gateway/tools/dify_cli.py run` |
| DSL 내려받기 | `python gateway/tools/dify_cli.py export` |
| DSL 문법 검증 | `python gateway/tools/validate_dsl.py <yaml_file>` |

### Python 의존성

`gateway/requirements.txt`에 정의되며, `setup` 스킬에서 가상환경 생성 후 설치.

```
httpx>=0.27.0
python-dotenv>=1.0.0
pyyaml>=6.0
```

> **주의**: 원본 `requirements.txt`에는 `mcp[cli]>=1.0.0`이 포함되어 있으나,
> Abra 플러그인은 MCP 서버로 동작하지 않으므로 이 의존성은 **제외**하고 복사함.

### 환경 설정

`gateway/.env` (setup 스킬에서 생성):

```env
DIFY_BASE_URL=http://localhost/console/api
DIFY_EMAIL=admin@example.com
DIFY_PASSWORD=your_password
```

[Top](#abra-플러그인-개발-계획서)

---

## 4. 외부 자원 수집 계획

공유자원 외 추가로 필요한 외부 자원 파악.

### 필요 외부 자원

| 자원 | 출처 | 수집 방법 | 용도 |
|------|------|----------|------|
| Dify Docker Compose 파일 | GitHub `langgenius/dify` | `git clone` (dify-setup 스킬에서 수행) | Dify 로컬 환경 구축 |

### 수집 불필요 항목

| 항목 | 사유 |
|------|------|
| MCP 서버 | Abra는 외부 MCP 서버 미사용 (dify_cli는 커스텀 CLI) |
| LSP 서버 | 런타임(Claude Code)이 기본 제공하는 LSP로 충분 |
| 추가 가이드/템플릿 | 마켓플레이스 기존 자원으로 모든 STEP 커버 가능 |

[Top](#abra-플러그인-개발-계획서)

---

## 5. 디렉토리 구조

```
plugin-samples/abra/
├── .claude-plugin/                     # 플러그인 메타데이터 (필수)
│   ├── plugin.json                     # 플러그인 매니페스트
│   └── marketplace.json                # 마켓플레이스 매니페스트
│
├── skills/                             # 스킬 정의 (8개)
│   ├── core/
│   │   └── SKILL.md                    # 핵심스킬 — 의도 분류 → 스킬 라우팅
│   ├── setup/
│   │   └── SKILL.md                    # 설정스킬 — .env, 가상환경, 도구 검증, 라우팅 등록
│   ├── dify-setup/
│   │   └── SKILL.md                    # 설정스킬 — Docker Compose Dify 환경 구축
│   ├── scenario/
│   │   └── SKILL.md                    # 지휘자스킬 — STEP 1 시나리오 생성
│   ├── dsl-generate/
│   │   └── SKILL.md                    # 지휘자스킬 — STEP 2 DSL 자동생성
│   ├── prototype/
│   │   └── SKILL.md                    # 지휘자스킬 — STEP 3 프로토타이핑
│   ├── dev-plan/
│   │   └── SKILL.md                    # 지휘자스킬 — STEP 4 개발계획서
│   └── develop/
│       └── SKILL.md                    # 지휘자스킬 — STEP 5 AI Agent 개발
│
├── agents/                             # 에이전트 정의 (5개)
│   ├── scenario-analyst/
│   │   ├── AGENT.md                    # 시나리오 분석 전문가 프롬프트
│   │   ├── agentcard.yaml              # 역량·제약·핸드오프 선언
│   │   ├── tools.yaml                  # 추상 도구 선언
│   │   └── references/
│   │       └── requirement-generater.md
│   ├── dsl-architect/
│   │   ├── AGENT.md                    # DSL 설계 전문가 프롬프트
│   │   ├── agentcard.yaml
│   │   ├── tools.yaml
│   │   └── references/
│   │       ├── dsl-generation-prompt.md
│   │       └── dify-workflow-dsl-guide.md
│   ├── prototype-runner/
│   │   ├── AGENT.md                    # 프로토타이핑 실행 전문가 프롬프트
│   │   ├── agentcard.yaml
│   │   └── tools.yaml
│   ├── plan-writer/
│   │   ├── AGENT.md                    # 개발계획서 작성 전문가 프롬프트
│   │   ├── agentcard.yaml
│   │   ├── tools.yaml
│   │   └── references/
│   │       └── develop-plan-generate.md
│   └── agent-developer/
│       ├── AGENT.md                    # Agent 개발 전문가 프롬프트
│       ├── agentcard.yaml
│       ├── tools.yaml
│       └── references/
│           └── develop.md
│
├── gateway/                            # 도구 인프라 및 런타임 매핑
│   ├── install.yaml                    # 설치 매니페스트
│   ├── runtime-mapping.yaml            # 티어·도구·액션 매핑
│   ├── .env.example                    # Dify 접속 설정 예시
│   ├── requirements.txt                # Python 의존성
│   └── tools/
│       ├── dify_cli.py                 # Dify 앱 관리 CLI
│       ├── dify_client.py              # Dify Console API 비동기 클라이언트
│       ├── config.py                   # Dify 접속 설정 로더
│       └── validate_dsl.py             # DSL YAML 문법·구조 사전 검증기
│
├── commands/                           # 슬래시 명령 진입점 (7개, core 제외)
│   ├── setup.md
│   ├── dify-setup.md
│   ├── scenario.md
│   ├── dsl-generate.md
│   ├── prototype.md
│   ├── dev-plan.md
│   └── develop.md
│
├── docs/
│   └── develop-plan.md                 # 본 개발계획서
│
└── README.md                           # 플러그인 가이드
```

> **파일 수 합계**: 매니페스트 2 + 스킬 8 + 에이전트(AGENT.md 5 + agentcard.yaml 5 + tools.yaml 5) +
> references 5 + gateway(yaml 2 + env 1 + requirements 1 + tools 4) + commands 7 + docs 1 + README 1 = **47개**

[Top](#abra-플러그인-개발-계획서)

---

## 6. 매니페스트 설계

### 6.1 plugin.json

`.claude-plugin/plugin.json`:

```json
{
  "name": "abra",
  "version": "1.0.0",
  "description": "자연어 한마디로 AI Agent를 자동 생성하는 DMAP 플러그인",
  "author": {
    "name": "Unicorn Inc."
  },
  "repository": "https://github.com/cna-bootcamp/abra",
  "homepage": "https://github.com/cna-bootcamp/abra",
  "license": "MIT",
  "keywords": ["abra", "dmap", "plugin", "multi-agent", "dify", "ai-agent", "automation"]
}
```

### 6.2 marketplace.json

`.claude-plugin/marketplace.json`:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "abra",
  "owner": {
    "name": "Unicorn Inc."
  },
  "plugins": [
    {
      "name": "abra",
      "source": "./",
      "category": "development"
    }
  ]
}
```

[Top](#abra-플러그인-개발-계획서)

---

## 7. 에이전트 상세 설계

### 7.1 scenario-analyst

**역할**: 비즈니스 요구사항을 분석하여 구조화된 시나리오 문서로 변환하는 분석 전문가

**agentcard.yaml 핵심:**

```yaml
name: "scenario-analyst"
version: "1.0.0"
tier: MEDIUM

capabilities:
  role: |
    비즈니스 요구사항을 분석하여 구조화된 시나리오 문서로 변환.
    사용자의 모호한 요구사항에서 핵심 요소를 추출하고,
    다양한 관점(업무자동화, 고객경험, 비용절감 등)으로 N개 시나리오를 생성.
    requirement-generater.md 프롬프트 템플릿을 활용하여 8개 섹션 포함 시나리오 산출.
  identity:
    is:
      - "비즈니스 분석가"
      - "요구사항 정의 전문가"
      - "시나리오 설계자"
    is_not:
      - "코드 작성자"
      - "DSL 생성자"
      - "프로토타이핑 실행자"
  restrictions:
    forbidden_actions: ["file_delete", "code_execute", "network_access"]

handoff:
  - target: dsl-architect
    when: "시나리오 정의 완료 후 DSL 생성 필요"
    reason: "DSL 설계는 전문 에이전트에 위임"
```

**tools.yaml:**

```yaml
tools:
  - name: file_read
    description: "파일 내용 읽기"
    input: { 파일경로 }
    output: { 파일내용 }
  - name: file_write
    description: "파일 생성·수정"
    input: { 파일경로, 내용 }
    output: { 성공여부 }
```

**references**: `requirement-generater.md` (시나리오 생성 프롬프트 템플릿)

**AGENT.md 핵심 워크플로우:**

1. {tool:file_read}로 `references/requirement-generater.md` 프롬프트 템플릿 로드
2. 서비스 목적과 생성 갯수를 기반으로 다양한 관점의 시나리오 N개 생성
3. 각 시나리오에 8개 섹션 포함 (서비스개요, 사용자시나리오, 에이전트역할, 워크플로우설계, 외부도구, AI지시사항, 품질요구사항, 검증시나리오)
4. 버전 간 비교표 추가
5. {tool:file_write}로 시나리오 파일 저장

**출력 형식**: 마크다운 문서 (버전별 8개 섹션 + 비교표)

---

### 7.2 dsl-architect

**역할**: 시나리오를 Dify Workflow DSL(YAML)로 변환하는 워크플로우 아키텍트

**agentcard.yaml 핵심:**

```yaml
name: "dsl-architect"
version: "1.0.0"
tier: HIGH

capabilities:
  role: |
    Dify Workflow DSL을 설계·생성하는 전문가.
    비즈니스 시나리오를 Dify YAML DSL로 변환.
    노드 설계(Start, LLM, Knowledge Retrieval, Tool, IF/ELSE, End 등),
    엣지 연결, 변수/파라미터 설정, 프롬프트 템플릿 작성 수행.
    dsl-generation-prompt.md 프롬프트 템플릿과
    dify-workflow-dsl-guide.md DSL 가이드를 참조하여 유효한 DSL 생성.
  identity:
    is:
      - "DSL 설계자"
      - "워크플로우 아키텍트"
      - "Dify 전문가"
    is_not:
      - "비즈니스 분석가"
      - "코드 개발자"
      - "프로토타이핑 실행자"
  restrictions:
    forbidden_actions: ["code_execute", "network_access", "file_delete"]

handoff:
  - target: prototype-runner
    when: "DSL 생성 및 검증 완료 후 프로토타이핑 필요"
    reason: "Dify 실행은 프로토타이핑 전문가에 위임"
  - target: plan-writer
    when: "DSL 생성 완료 후 개발계획서 필요"
    reason: "계획서 작성은 전문 에이전트에 위임"
```

**tools.yaml:**

```yaml
tools:
  - name: file_read
    description: "파일 내용 읽기"
    input: { 파일경로 }
    output: { 파일내용 }
  - name: file_write
    description: "파일 생성·수정"
    input: { 파일경로, 내용 }
    output: { 성공여부 }
  - name: dsl_validation
    description: "DSL YAML 문법·구조 사전 검증"
    input: { DSL파일경로 }
    output: { 검증결과, 오류목록 }
```

**references**:
- `dsl-generation-prompt.md` (DSL 생성 프롬프트 템플릿)
- `dify-workflow-dsl-guide.md` (DSL 작성 가이드)

**AGENT.md 핵심 워크플로우:**

1. {tool:file_read}로 시나리오 문서 및 references 파일 로드
2. 노드(Node) 설계: Start → LLM/Tool/IF-ELSE → End
3. 엣지(Edge) 연결 설계
4. 변수/파라미터 설정
5. 프롬프트 템플릿 생성
6. {tool:file_write}로 DSL YAML 파일 생성
7. {tool:dsl_validation}으로 문법·구조 사전 검증
   - PASS → 완료
   - FAIL → 오류 항목 기반 DSL 수정 → 재검증 (반복)
8. DSL 구조 설명서 출력

---

### 7.3 prototype-runner

**역할**: DSL을 Dify에 배포·실행하여 프로토타이핑을 수행하는 전문가

**agentcard.yaml 핵심:**

```yaml
name: "prototype-runner"
version: "1.0.0"
tier: MEDIUM

capabilities:
  role: |
    DSL을 Dify에 배포하고 실행하여 프로토타이핑을 수행.
    import → publish → run → export 자동화 및
    에러 발생 시 원인 분석 → DSL 수정 → validate_dsl 재검증 → update 루프 실행.
  identity:
    is:
      - "프로토타이핑 실행자"
      - "Dify 워크플로우 검증자"
    is_not:
      - "DSL 설계자"
      - "코드 개발자"
      - "비즈니스 분석가"
  restrictions:
    forbidden_actions: ["file_delete", "network_access", "user_interact"]

handoff:
  - target: dsl-architect
    when: "DSL 구조적 결함으로 수정 범위가 큰 경우"
    reason: "대규모 DSL 재설계는 설계 전문가에게 위임"
  - target: plan-writer
    when: "프로토타이핑 완료 후 개발계획서 필요"
    reason: "계획서 작성은 전문 에이전트에 위임"
```

**tools.yaml:**

```yaml
tools:
  - name: file_read
    description: "파일 내용 읽기"
    input: { 파일경로 }
    output: { 파일내용 }
  - name: file_write
    description: "파일 생성·수정"
    input: { 파일경로, 내용 }
    output: { 성공여부 }
  - name: dify_dsl_management
    description: "Dify DSL 관리 (import/update/export)"
    input: { 명령, DSL파일경로 }
    output: { 실행결과, 앱ID }
  - name: dify_workflow_management
    description: "Dify 워크플로우 실행 (publish/run)"
    input: { 명령, 앱ID }
    output: { 실행결과, 에러정보 }
  - name: dsl_validation
    description: "DSL YAML 문법·구조 사전 검증"
    input: { DSL파일경로 }
    output: { 검증결과, 오류목록 }
```

**references**: 없음 (도구 사용으로 충분)

**AGENT.md 핵심 워크플로우:**

1. {tool:file_read}로 DSL 파일 로드
2. {tool:dify_dsl_management} import로 DSL을 Dify에 업로드
3. {tool:dify_workflow_management} publish로 워크플로우 게시
   - 에러 시: DSL 수정 → {tool:dsl_validation} 재검증 → {tool:dify_dsl_management} update → 재게시
4. {tool:dify_workflow_management} run으로 워크플로우 실행
   - 에러 시: DSL 수정 → {tool:dsl_validation} 재검증 → {tool:dify_dsl_management} update → 재실행
5. 성공 시 {tool:dify_dsl_management} export로 검증된 DSL 내려받기
6. {tool:file_write}로 검증된 DSL 파일 저장

---

### 7.4 plan-writer

**역할**: DSL과 시나리오를 기반으로 개발계획서를 작성하는 기술 문서 전문가

**agentcard.yaml 핵심:**

```yaml
name: "plan-writer"
version: "1.0.0"
tier: MEDIUM

capabilities:
  role: |
    검증된 DSL과 시나리오를 기반으로 개발계획서를 작성.
    기술스택, 아키텍처, 모듈 설계, 테스트 전략, 배포 계획 등 포괄적 계획 수립.
    develop-plan-generate.md 프롬프트 템플릿을 활용.
  identity:
    is:
      - "기술 문서 작성자"
      - "개발 계획 수립자"
      - "아키텍처 분석가"
    is_not:
      - "코드 작성자"
      - "DSL 생성자"
      - "프로토타이핑 실행자"
  restrictions:
    forbidden_actions: ["file_delete", "code_execute"]

handoff:
  - target: agent-developer
    when: "개발계획서 승인 후 구현 필요"
    reason: "코드 구현은 전문 에이전트에 위임"
```

**tools.yaml:**

```yaml
tools:
  - name: file_read
    description: "파일 내용 읽기"
    input: { 파일경로 }
    output: { 파일내용 }
  - name: file_write
    description: "파일 생성·수정"
    input: { 파일경로, 내용 }
    output: { 성공여부 }
```

**references**: `develop-plan-generate.md` (개발계획서 생성 프롬프트 템플릿)

**AGENT.md 핵심 워크플로우:**

1. {tool:file_read}로 검증된 DSL, 시나리오 문서, references 파일 로드
2. 기술스택 및 아키텍처 결정
3. 모듈별 개발 범위 및 순서 정의
4. 프롬프트 최적화 계획
5. API 설계서 / 데이터 모델
6. 테스트 전략 및 배포 계획
7. {tool:file_write}로 개발계획서 저장

---

### 7.5 agent-developer

**역할**: 개발계획서에 따라 프로덕션 코드를 구현하는 개발 전문가

**agentcard.yaml 핵심:**

```yaml
name: "agent-developer"
version: "1.0.0"
tier: HIGH

capabilities:
  role: |
    개발계획서와 DSL을 기반으로 AI Agent를 구현.
    Option A(Dify 런타임 활용) 또는 Option B(코드 기반 전환) 방식으로 구현.
    develop.md 프롬프트 템플릿을 활용.
  identity:
    is:
      - "AI Agent 개발자"
      - "코드 구현 전문가"
      - "테스트 작성자"
    is_not:
      - "비즈니스 분석가"
      - "DSL 설계자"
      - "프로토타이핑 실행자"
  restrictions:
    forbidden_actions: ["user_interact"]

handoff:
  - target: dsl-architect
    when: "구현 중 DSL 수정 필요"
    reason: "DSL 변경은 설계 전문가에게 위임"
```

**tools.yaml:**

```yaml
tools:
  - name: file_read
    description: "파일 내용 읽기"
    input: { 파일경로 }
    output: { 파일내용 }
  - name: file_write
    description: "파일 생성·수정"
    input: { 파일경로, 내용 }
    output: { 성공여부 }
  - name: code_execute
    description: "코드·명령 실행"
    input: { 명령어 }
    output: { 실행결과 }
  - name: code_search
    description: "코드베이스에서 패턴 검색"
    input: { 검색패턴, 검색범위 }
    output: { 매칭결과목록 }
  - name: code_diagnostics
    description: "파일의 오류·경고 조회"
    input: { 파일경로 }
    output: { 에러목록, 경고목록 }
  - name: dify_dsl_management
    description: "Dify DSL 관리 (import/update/export)"
    input: { 명령, DSL파일경로 }
    output: { 실행결과 }
  - name: dify_workflow_management
    description: "Dify 워크플로우 실행 (publish/run)"
    input: { 명령, 앱ID }
    output: { 실행결과 }
```

**references**: `develop.md` (Agent 개발 프롬프트 템플릿)

**AGENT.md 핵심 워크플로우:**

1. {tool:file_read}로 개발계획서, DSL, references 파일 로드
2. 개발 방식에 따라 분기:
   - **Option A (Dify 런타임)**: {tool:dify_dsl_management} import → 환경 설정 → {tool:dify_workflow_management} publish → API 테스트
   - **Option B (코드 기반)**: DSL 참조 → LangChain/LangGraph 등으로 구현 → 테스트 코드 작성
3. {tool:code_diagnostics}로 에러 확인
4. {tool:code_execute}로 테스트 실행
5. 배포 설정 (필요 시)

[Top](#abra-플러그인-개발-계획서)

---

## 8. 스킬 상세 설계

### 8.1 core (핵심스킬)

**유형**: Core (위임형)
**역할**: 사용자 의도를 분류하여 적절한 스킬로 라우팅

**frontmatter:**

```yaml
---
name: core
description: Abra 플러그인 의도 분류 및 스킬 라우팅
user-invocable: false
---
```

**워크플로우 — 라우팅 전용:**

#### Step 1: 의도 감지 (Intent Detection)

사용자 요청의 키워드, 패턴, 맥락을 분석하여 의도를 분류.

#### Step 2: 스킬 매칭 (Skill Matching)

| 감지 패턴 | 라우팅 대상 | 명령어 |
|-----------|-----------|--------|
| "에이전트 만들어", "Agent 개발", "워크플로우 자동화" | → 전체 5단계 (scenario부터 순차 실행) | — |
| "시나리오 생성", "요구사항 생성", "요구사항 정의" | → scenario 스킬 | `/abra:scenario` |
| "DSL 생성", "워크플로우 DSL", "YAML 만들어" | → dsl-generate 스킬 | `/abra:dsl-generate` |
| "프로토타이핑", "Dify 업로드", "Dify 실행" | → prototype 스킬 | `/abra:prototype` |
| "개발계획서", "계획서 작성", "개발 계획" | → dev-plan 스킬 | `/abra:dev-plan` |
| "코드 개발", "Agent 구현", "구현해줘" | → develop 스킬 | `/abra:develop` |
| "Dify 설치", "Docker 실행", "Dify 환경" | → dify-setup 스킬 | `/abra:dify-setup` |
| "초기 설정", "setup", "설정" | → setup 스킬 | `/abra:setup` |

#### Step 3: 위임 → Skill: {매칭된 스킬}

- **INTENT**: 분류된 의도에 맞는 스킬 활성화
- **ARGS**: 사용자 요청 원문 전달
- **RETURN**: 스킬 워크플로우 완료 후 사용자에게 결과 보고

미매칭 시 사용자에게 사용 가능한 명령 목록 안내.

---

### 8.2 setup (설정스킬)

**유형**: Setup (직결형)
**역할**: 플러그인 초기 설정 — .env 구성, 가상환경 생성, 도구 동작 확인, 라우팅 테이블 등록

**frontmatter:**

```yaml
---
name: setup
description: Abra 플러그인 초기 설정
user-invocable: true
disable-model-invocation: true
---
```

**선행 조건**: `dify-setup` 완료 (Dify 실행 중)

**워크플로우:**

#### Step 1: install.yaml 로드

`gateway/install.yaml`을 읽어 설치 대상 파악.

#### Step 2: Dify 접속 정보 수집

AskUserQuestion으로 Dify 접속 정보 수집:
- `DIFY_BASE_URL` (기본값: `http://localhost/console/api`)
- `DIFY_EMAIL`
- `DIFY_PASSWORD`

#### Step 3: .env 파일 생성

`gateway/.env` 파일 생성 또는 갱신.

#### Step 4: Python 가상환경 생성 및 의존성 설치

```bash
cd gateway
python -m venv .venv
# Windows
.venv\Scripts\activate && pip install -r requirements.txt
# macOS/Linux
source .venv/bin/activate && pip install -r requirements.txt
```

#### Step 5: 도구 동작 확인

```bash
# Windows
gateway\.venv\Scripts\python gateway\tools\dify_cli.py list
# macOS/Linux
gateway/.venv/bin/python gateway/tools/dify_cli.py list
```

Dify 연결 테스트 (앱 목록 조회 성공 여부 확인).

#### Step 6: CLAUDE.md 라우팅 테이블 등록

AskUserQuestion으로 적용 범위 질문:
- 모든 프로젝트: `~/.claude/CLAUDE.md`
- 이 프로젝트만: `./CLAUDE.md`

선택된 파일에 라우팅 테이블 추가 (기존 내용 유지, 끝에 추가).

#### Step 7: 결과 보고

설치 결과 요약:
- .env 설정 완료 여부
- 가상환경 및 의존성 설치 완료 여부
- Dify 연결 테스트 결과
- 라우팅 테이블 등록 완료 여부
- 사용 가능한 슬래시 명령 목록

**사용자 상호작용**: AskUserQuestion으로 Dify 접속 정보, 적용 범위 수집

---

### 8.3 dify-setup (설정스킬)

**유형**: Setup (직결형)
**역할**: Docker Compose로 Dify 로컬 환경 구축

**frontmatter:**

```yaml
---
name: dify-setup
description: Dify 로컬 환경 구축 (Docker Compose)
user-invocable: true
disable-model-invocation: true
---
```

**사전 요구사항:**

| 항목 | 최소 사양 |
|------|----------|
| CPU | 2 Core 이상 |
| RAM | 4 GiB 이상 |
| Docker | 설치 필요 |
| Docker Compose | 설치 필요 |

**워크플로우:**

#### Step 1: Docker 확인

`docker --version`, `docker compose version` 확인. 미설치 시 설치 안내 URL 제공 후 중단.

#### Step 2: Dify 소스 확인

AskUserQuestion으로 Dify 설치 위치 확인 (기본값: `~/workspace/dify`).
없으면 `git clone https://github.com/langgenius/dify.git` 실행.

#### Step 3: 환경 변수 파일 생성

```bash
cd {dify_path}/docker
cp .env.example .env
```

#### Step 4: Docker Compose 실행

```bash
docker compose up -d
```

#### Step 5: 컨테이너 상태 확인 및 헬스체크

`docker compose ps` + HTTP 헬스체크.

#### Step 6: 초기 설정 안내

관리자 계정 생성 안내 (`http://localhost/install`).

#### Step 7: 결과 보고

컨테이너 상태, 접속 URL, 다음 단계(`/abra:setup`) 안내.

---

### 8.4 scenario (지휘자스킬)

**유형**: Orchestrator (위임형)
**역할**: STEP 1 — 요구사항 시나리오 N개 생성 및 사용자 선택

**frontmatter:**

```yaml
---
name: scenario
description: 요구사항 시나리오 생성 및 선택 (STEP 1)
user-invocable: true
---
```

**에이전트 호출 규칙:**

| 에이전트 | FQN |
|----------|-----|
| scenario-analyst | `abra:scenario-analyst:scenario-analyst` |

프롬프트 조립:
1. `agents/scenario-analyst/`에서 3파일 로드 (AGENT.md + agentcard.yaml + tools.yaml)
2. `gateway/runtime-mapping.yaml` 참조하여 구체화:
   - tier: MEDIUM → claude-sonnet-4-5
   - tools.yaml → builtin(Read, Write) + 금지액션 제외
3. 프롬프트 구성: 공통 정적(runtime-mapping) → 에이전트별 정적(3파일) → 동적(작업 지시)
4. `Task(subagent_type="abra:scenario-analyst:scenario-analyst", model="sonnet", prompt=조립된 프롬프트)` 호출

**워크플로우:**

#### Phase 0: 입력 수집

AskUserQuestion으로 핵심 정보 수집:
- 서비스 목적 (필수)
- 생성 갯수 (기본값: 3)
- 결과파일 디렉토리 (기본값: `output/`)

#### Phase 1: 시나리오 생성 → Agent: scenario-analyst

- **TASK**: 서비스 목적을 기반으로 N개의 요구사항 시나리오 자동 생성
- **EXPECTED OUTCOME**: 각 시나리오에 8개 섹션 포함 + 버전 간 비교표
- **MUST DO**: `references/requirement-generater.md` 프롬프트 템플릿 활용, 다양한 관점(업무자동화, 고객경험, 비용절감, 의사결정, 협업효율화) 반영
- **MUST NOT DO**: 사용자에게 직접 질문 금지, 시나리오 선택 금지
- **CONTEXT**: 서비스 목적: `{service_purpose}`, 생성 갯수: `{count}`, 출력 디렉토리: `{output_dir}`

#### Phase 2: 사용자 선택

AskUserQuestion으로 시나리오 선택:
- 각 버전의 관점·서비스명·핵심가치 요약 표시
- 사용자가 하나를 선택

#### Phase 3: 저장 및 완료

선택된 시나리오를 `{output_dir}/scenario.md`로 저장.

**완료 조건:**
- [ ] N개 시나리오 생성 완료
- [ ] 사용자 선택 완료
- [ ] scenario.md 파일 저장 완료

**검증 프로토콜**: 시나리오 파일의 8개 섹션 존재 확인.

**상태 정리**: 완료 시 임시 파일 없음 (상태 파일 미사용).

**취소**: 사용자 요청 시 즉시 중단.

**재개**: scenario.md 파일 존재 시 선택 단계부터 재개 가능.

---

### 8.5 dsl-generate (지휘자스킬)

**유형**: Orchestrator (위임형)
**역할**: STEP 2 — 선택된 시나리오 기반 Dify Workflow DSL(YAML) 자동생성

**frontmatter:**

```yaml
---
name: dsl-generate
description: Dify DSL 자동생성 (STEP 2)
user-invocable: true
---
```

**에이전트 호출 규칙:**

| 에이전트 | FQN |
|----------|-----|
| dsl-architect | `abra:dsl-architect:dsl-architect` |

프롬프트 조립:
1. `agents/dsl-architect/`에서 3파일 로드
2. tier: HIGH → claude-opus-4-6
3. tools.yaml → builtin(Read, Write) + custom(validate_dsl) + 금지액션 제외

**워크플로우:**

#### Phase 0: 입력 확인

scenario.md 파일 존재 확인. 없으면 scenario 스킬로 위임.

#### Phase 1: DSL 생성 → Agent: dsl-architect

- **TASK**: 시나리오 문서를 기반으로 Dify Workflow DSL(YAML) 생성 및 사전 검증
- **EXPECTED OUTCOME**: `validate_dsl` 검증을 통과한 유효한 DSL YAML 파일 + DSL 구조 설명서
- **MUST DO**: `references/dsl-generation-prompt.md` 및 `references/dify-workflow-dsl-guide.md` 활용, 생성 후 `{tool:dsl_validation}`으로 반드시 사전 검증
- **MUST NOT DO**: Dify 실행 금지 (프로토타이핑은 별도 STEP), 시나리오 수정 금지
- **CONTEXT**: 시나리오 파일: `{output_dir}/scenario.md`, 출력 위치: `{output_dir}/{app-name}.dsl.yaml`

#### Phase 2: 검증 및 완료

DSL 파일 존재 확인, 구조 설명서 사용자 보고.

**완료 조건:**
- [ ] DSL YAML 파일 생성 완료
- [ ] validate_dsl 검증 통과
- [ ] DSL 구조 설명서 출력 완료

**검증 프로토콜**: validate_dsl 통과 확인.

**상태 정리**: 완료 시 임시 파일 없음.

**취소**: 사용자 요청 시 즉시 중단.

**재개**: DSL 파일 존재 시 검증 단계부터 재개.

---

### 8.6 prototype (지휘자스킬)

**유형**: Orchestrator (위임형)
**역할**: STEP 3 — DSL을 Dify에 Import → Publish → Run → Export하여 프로토타이핑

**frontmatter:**

```yaml
---
name: prototype
description: Dify 프로토타이핑 자동화 (STEP 3)
user-invocable: true
---
```

**에이전트 호출 규칙:**

| 에이전트 | FQN |
|----------|-----|
| prototype-runner | `abra:prototype-runner:prototype-runner` |

프롬프트 조립:
1. `agents/prototype-runner/`에서 3파일 로드
2. tier: MEDIUM → claude-sonnet-4-5
3. tools.yaml → builtin(Read, Write) + custom(dify_cli, validate_dsl) + 금지액션 제외

**워크플로우:**

#### Phase 0: 입력 확인

DSL 파일 존재 확인. 없으면 dsl-generate 스킬로 위임.

#### Phase 1: 프로토타이핑 실행 → Agent: prototype-runner

- **TASK**: DSL을 Dify에 import → publish → run → export 수행. 에러 시 DSL 수정 → 재검증 → 재시도 루프 자동 실행
- **EXPECTED OUTCOME**: 검증 완료된 DSL 파일 (export된 최종 버전)
- **MUST DO**: import 전 반드시 validate_dsl로 사전 검증, publish/run 에러 시 DSL 수정 → validate_dsl → update 반복, 성공 시 export로 최종 DSL 확보
- **MUST NOT DO**: 사용자에게 직접 질문 금지, DSL 구조 대규모 변경 금지 (대규모 변경 시 dsl-architect로 핸드오프)
- **CONTEXT**: DSL 파일: `{output_dir}/{app-name}.dsl.yaml`, 가상환경: `gateway/.venv`

**에러 수정 루프:**

```
import → publish → [에러?] → DSL 수정 → validate_dsl → update → 재게시
                                                                  ↓
                   run → [에러?] → DSL 수정 → validate_dsl → update → 재실행
                                                                       ↓
                                                    [성공] → export → 완료
```

#### Phase 2: 결과 확인 및 보고

검증된 DSL 파일 확인, 실행 결과 사용자 보고.

**완료 조건:**
- [ ] Dify import 성공
- [ ] publish 성공
- [ ] run 성공 (에러 0)
- [ ] export로 검증된 DSL 확보

**검증 프로토콜**: run 성공 확인 + export 파일 존재 확인.

**상태 정리**: 완료 시 임시 파일 없음.

**취소**: 사용자 요청 시 즉시 중단. Dify에 생성된 앱은 수동 삭제 안내.

**재개**: Dify 앱 존재 시 publish/run 단계부터 재개 가능.

---

### 8.7 dev-plan (지휘자스킬)

**유형**: Orchestrator (위임형)
**역할**: STEP 4 — 검증된 DSL과 시나리오 기반 개발계획서 작성

**frontmatter:**

```yaml
---
name: dev-plan
description: 개발계획서 작성 (STEP 4)
user-invocable: true
---
```

**에이전트 호출 규칙:**

| 에이전트 | FQN |
|----------|-----|
| plan-writer | `abra:plan-writer:plan-writer` |

프롬프트 조립:
1. `agents/plan-writer/`에서 3파일 로드
2. tier: MEDIUM → claude-sonnet-4-5
3. tools.yaml → builtin(Read, Write) + 금지액션 제외

**워크플로우:**

#### Phase 0: 입력 확인

검증된 DSL 파일 + scenario.md 존재 확인. 없으면 이전 스킬로 위임.

#### Phase 1: 비기능요구사항 수집

AskUserQuestion으로 비기능요구사항 수집:
- 기술스택 선호 (예: Python/Node.js, LangChain/LangGraph)
- 배포 환경 (예: Docker, K8s, 서버리스)
- 성능/보안 요건
- 기타 제약

#### Phase 2: 개발계획서 작성 → Agent: plan-writer (`/oh-my-claudecode:ralplan` 활용)

- **TASK**: 검증된 DSL과 시나리오를 기반으로 기술스택, 아키텍처, 모듈 설계, 테스트 전략, 배포 계획 포함 개발계획서 작성
- **EXPECTED OUTCOME**: 완성된 개발계획서 마크다운 파일
- **MUST DO**: `references/develop-plan-generate.md` 프롬프트 템플릿 활용, DSL 구조와 계획의 일관성 확보, 비기능요구사항 반영
- **MUST NOT DO**: 코드 작성 금지, DSL 수정 금지
- **CONTEXT**: DSL 파일: `{output_dir}/{app-name}.dsl.yaml`, 시나리오: `{output_dir}/scenario.md`, 비기능요구사항: `{nfr}`, 출력: `{output_dir}/dev-plan.md`

#### Phase 3: 리뷰 및 완료

개발계획서를 사용자에게 보고. DSL 구조와 계획의 일관성, 비기능요구사항 포함 여부, 프로덕션 전환 전략 타당성 확인.

**완료 조건:**
- [ ] 개발계획서 파일 생성 완료
- [ ] DSL-계획 일관성 확인
- [ ] 비기능요구사항 반영 확인

**검증 프로토콜**: 개발계획서 필수 섹션 존재 확인.

**상태 정리**: 완료 시 임시 파일 없음.

**취소**: 사용자 요청 시 즉시 중단.

**재개**: dev-plan.md 파일 존재 시 리뷰 단계부터 재개.

---

### 8.8 develop (지휘자스킬)

**유형**: Orchestrator (위임형)
**역할**: STEP 5 — 개발계획서에 따라 AI Agent 구현 (Option A: Dify 런타임 / Option B: 코드 기반)

**frontmatter:**

```yaml
---
name: develop
description: AI Agent 개발 및 배포 (STEP 5)
user-invocable: true
---
```

**에이전트 호출 규칙:**

| 에이전트 | FQN |
|----------|-----|
| agent-developer | `abra:agent-developer:agent-developer` |

프롬프트 조립:
1. `agents/agent-developer/`에서 3파일 로드
2. tier: HIGH → claude-opus-4-6
3. tools.yaml → builtin(Read, Write, Bash, Grep, Glob) + custom(dify_cli) + lsp(diagnostics) + 금지액션 제외

**워크플로우:**

#### Phase 0: 입력 확인

개발계획서 + 검증된 DSL 존재 확인. 없으면 이전 스킬로 위임.

#### Phase 1: 개발 방식 선택

AskUserQuestion으로 개발 방식 선택:
- **Option A**: Dify 런타임 활용 (DSL Import → 설정 → 배포 → API 테스트)
- **Option B**: 코드 기반 전환 (LangChain/LangGraph 등으로 구현)

#### Phase 2: AI Agent 개발 → Agent: agent-developer (`/oh-my-claudecode:ralph` 활용)

- **TASK**: 개발계획서에 따라 AI Agent 구현 (선택된 Option 방식)
- **EXPECTED OUTCOME**: Option A: Dify 앱 배포 완료 + API 테스트 통과. Option B: 코드 빌드 성공 + 테스트 통과
- **MUST DO**: `references/develop.md` 프롬프트 템플릿 활용, 개발계획서의 기술스택·아키텍처 준수, 에러 핸들링/보안 구현
- **MUST NOT DO**: 개발계획서 범위 외 기능 구현 금지, DSL 원본 수정 금지
- **CONTEXT**: 개발계획서: `{output_dir}/dev-plan.md`, DSL: `{output_dir}/{app-name}.dsl.yaml`, 개발 방식: `{option}`, 출력 디렉토리: `{output_dir}/`

#### Phase 3: 빌드 오류 수정 (`/oh-my-claudecode:build-fix` 활용)

빌드 에러 발생 시 최소 수정 원칙으로 해결.

#### Phase 4: QA/검증 (`/oh-my-claudecode:ultraqa` 활용)

- Option A: Dify 앱 API 테스트 통과 확인
- Option B: 코드 빌드 성공 + 테스트 통과 확인

#### Phase 5: 완료 및 보고

산출물 목록, 실행 방법, API 엔드포인트 등 사용자 보고.

**완료 조건:**
- [ ] Option A: Dify 앱 배포 + API 테스트 통과
- [ ] Option B: 코드 빌드 성공 + 테스트 통과
- [ ] 산출물 목록 보고

**검증 프로토콜**: 빌드/테스트 통과 확인.

**상태 정리**: 완료 시 임시 파일 없음.

**취소**: 사용자 요청 시 즉시 중단.

**재개**: 구현 코드 존재 시 QA 단계부터 재개 가능.

[Top](#abra-플러그인-개발-계획서)

---

## 9. Gateway 상세 설계

### 9.1 install.yaml

```yaml
# ─────────────────────────────────────────────
# MCP 서버 — Abra는 외부 MCP 서버 미사용
# ─────────────────────────────────────────────
# mcp_servers: 없음

# ─────────────────────────────────────────────
# LSP 서버 — 런타임 기본 제공 LSP로 충분
# ─────────────────────────────────────────────
# lsp_servers: 없음

# ─────────────────────────────────────────────
# 커스텀 도구 — 플러그인 자체 포함
# ─────────────────────────────────────────────
custom_tools:
  - name: dify_cli
    description: "Dify 앱 관리 CLI — list, export, import, update, publish, run"
    source: tools/dify_cli.py
    required: true

  - name: validate_dsl
    description: "Dify DSL YAML 구조 검증 도구 — Import 전 필수 사전 검증"
    source: tools/validate_dsl.py
    required: true

# ─────────────────────────────────────────────
# Python 환경 — setup 스킬에서 구성
# ─────────────────────────────────────────────
python_env:
  venv_path: .venv
  requirements: requirements.txt

# ─────────────────────────────────────────────
# 환경 설정 — setup 스킬에서 생성
# ─────────────────────────────────────────────
config:
  env_file: .env
```

> **특이사항**: Abra는 MCP 서버, LSP 서버가 필요 없음. 모든 Dify 조작은 커스텀 CLI(`dify_cli.py`)로 수행하며,
> Bash 도구를 통해 직접 호출. 코드 분석은 런타임(Claude Code)이 기본 제공하는 LSP로 충분.

---

### 9.2 runtime-mapping.yaml

```yaml
# ─────────────────────────────────────────────
# 티어 → LLM 모델 매핑
# ─────────────────────────────────────────────
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

# ─────────────────────────────────────────────
# 추상 도구명 → 실제 도구 매핑
#   builtin 도구(Read, Write, Bash 등)는 생략
#   lsp, mcp, custom 도구만 매핑
# ─────────────────────────────────────────────
tool_mapping:
  # ── 코드 분석 ──
  code_search:
    - type: lsp
      tools: ["lsp_workspace_symbols"]

  code_diagnostics:
    - type: lsp
      tools: ["lsp_diagnostics", "lsp_diagnostics_directory"]

  # ── Dify 도구 (커스텀 CLI) ──
  dify_app_management:
    - type: custom
      source: "tools/dify_cli.py"
      tools: ["list", "export"]

  dify_dsl_management:
    - type: custom
      source: "tools/dify_cli.py"
      tools: ["import", "update", "export"]

  dify_workflow_management:
    - type: custom
      source: "tools/dify_cli.py"
      tools: ["publish", "run"]

  dsl_validation:
    - type: custom
      source: "tools/validate_dsl.py"
      tools: ["validate"]

# ─────────────────────────────────────────────
# 액션 카테고리 → 실제 도구 매핑
# ─────────────────────────────────────────────
action_mapping:
  file_write: ["Write", "Edit"]
  file_delete: ["Bash"]
  code_execute: ["Bash"]
  network_access: ["WebFetch", "WebSearch"]
  user_interact: ["AskUserQuestion"]
  agent_delegate: ["Task"]
```

[Top](#abra-플러그인-개발-계획서)

---

## 10. CLAUDE.md 라우팅 테이블

setup 스킬이 설치 시 런타임 상주 파일(CLAUDE.md)에 추가하는 라우팅 테이블.

```markdown
# abra 플러그인

## 사용 가능한 명령

| 명령 | 설명 |
|------|------|
| `/abra:dify-setup` | Dify Docker 환경 구축 |
| `/abra:setup` | 플러그인 초기 설정 (.env, 가상환경, 연결 테스트) |
| `/abra:scenario` | 요구사항 시나리오 생성 및 선택 |
| `/abra:dsl-generate` | Dify DSL 자동 생성 |
| `/abra:prototype` | Dify 프로토타이핑 자동화 |
| `/abra:dev-plan` | 개발계획서 작성 |
| `/abra:develop` | AI Agent 개발 및 배포 |

## 자동 라우팅

다음과 같은 요청은 자동으로 abra 플러그인이 처리합니다:
- "에이전트 만들어줘", "Agent 개발" → 전체 5단계 워크플로우
- "시나리오 생성해줘", "요구사항 정의" → /abra:scenario
- "DSL 생성해줘", "워크플로우 DSL" → /abra:dsl-generate
- "프로토타이핑 해줘", "Dify 업로드" → /abra:prototype
- "개발계획서 써줘" → /abra:dev-plan
- "코드 개발해줘", "Agent 구현" → /abra:develop
- "Dify 설치", "Docker 실행" → /abra:dify-setup
```

[Top](#abra-플러그인-개발-계획서)

---

## 11. 개발 순서

### 산출물 목록 및 생성 순서

| 순서 | 작업 | 산출물 | 선행 조건 | 수행 방식 |
|:----:|------|--------|----------|----------|
| 1 | 매니페스트 작성 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | — | 직접 작성 |
| 2 | Gateway 설정 — 공유자원 복사 | `gateway/tools/*`, `gateway/requirements.txt`, `gateway/.env.example` | — | 파일 복사 (resources/ → gateway/) |
| 3 | Gateway 설정 — 매핑 파일 작성 | `gateway/install.yaml`, `gateway/runtime-mapping.yaml` | 2 | 직접 작성 |
| 4 | dify-setup 스킬 작성 | `skills/dify-setup/SKILL.md` + `commands/dify-setup.md` | 1 | 직접 작성 |
| 5 | setup 스킬 작성 | `skills/setup/SKILL.md` + `commands/setup.md` | 3, 4 | 직접 작성 |
| 6 | core 스킬 작성 | `skills/core/SKILL.md` | — | 직접 작성 |
| 7 | scenario-analyst 에이전트 작성 | `agents/scenario-analyst/` (AGENT.md, agentcard.yaml, tools.yaml, references/) | — | 직접 작성 + 리소스 복사 |
| 8 | scenario 스킬 작성 | `skills/scenario/SKILL.md` + `commands/scenario.md` | 6, 7 | 직접 작성 |
| 9 | dsl-architect 에이전트 작성 | `agents/dsl-architect/` (AGENT.md, agentcard.yaml, tools.yaml, references/) | — | 직접 작성 + 리소스 복사 |
| 10 | dsl-generate 스킬 작성 | `skills/dsl-generate/SKILL.md` + `commands/dsl-generate.md` | 8, 9 | 직접 작성 |
| 11 | prototype-runner 에이전트 작성 | `agents/prototype-runner/` (AGENT.md, agentcard.yaml, tools.yaml) | — | 직접 작성 |
| 12 | prototype 스킬 작성 | `skills/prototype/SKILL.md` + `commands/prototype.md` | 10, 11 | 직접 작성 |
| 13 | plan-writer 에이전트 작성 | `agents/plan-writer/` (AGENT.md, agentcard.yaml, tools.yaml, references/) | — | 직접 작성 + 리소스 복사 |
| 14 | dev-plan 스킬 작성 | `skills/dev-plan/SKILL.md` + `commands/dev-plan.md` | 12, 13 | 직접 작성 |
| 15 | agent-developer 에이전트 작성 | `agents/agent-developer/` (AGENT.md, agentcard.yaml, tools.yaml, references/) | — | 직접 작성 + 리소스 복사 |
| 16 | develop 스킬 작성 | `skills/develop/SKILL.md` + `commands/develop.md` | 14, 15 | 직접 작성 |
| 17 | README.md 작성 | `README.md` | 16 | 직접 작성 (templates/plugin/ 참고) |
| 18 | 개발계획서 복사 | `docs/develop-plan.md` | 17 | 본 계획서 복사 |
| 19 | 전체 검증 | — | 18 | Phase 4 검증 체크리스트 |

> **반복 개발 권장**: 순서 7~16은 각 에이전트+스킬 쌍 단위로 작성 → 검증 → 피드백 반영의 반복 사이클로 진행.
> 한 번에 전체를 완성하려 하지 않고, 각 STEP을 독립적으로 검증한 후 다음으로 진행.

### 병렬 가능 작업

| 병렬 그룹 | 작업 |
|-----------|------|
| A | 순서 1 (매니페스트) + 순서 2 (공유자원 복사) + 순서 6 (core 스킬) |
| B | 순서 7 (scenario-analyst) + 순서 9 (dsl-architect) + 순서 11 (prototype-runner) + 순서 13 (plan-writer) + 순서 15 (agent-developer) — 에이전트는 서로 독립적이므로 병렬 작성 가능 |

[Top](#abra-플러그인-개발-계획서)

---

## 12. 검증 계획

### 단계별 검증

| 단계 | 검증 항목 | 검증 방법 |
|------|----------|----------|
| 순서 1 (매니페스트) | plugin.json, marketplace.json 유효성 | JSON 문법 확인, 필수 필드(name) 존재 확인 |
| 순서 2-3 (Gateway) | 도구 소스 파일 존재, install.yaml/runtime-mapping.yaml 유효성 | 파일 존재 확인, YAML 문법 확인 |
| 순서 4-5 (Setup 스킬) | frontmatter 필수 필드, `disable-model-invocation: true` | SKILL.md 파싱 확인 |
| 순서 6 (Core 스킬) | 라우팅 테이블 완전성 (모든 스킬 매핑) | 라우팅 테이블 검토 |
| 순서 7-16 (에이전트+스킬) | 에이전트: AGENT.md+agentcard.yaml 쌍 존재, 스킬: SKILL.md 존재 | 파일 존재 확인, 필수 섹션 확인 |
| 순서 17 (README) | 필수 섹션 포함 (개요, 설치, 사용법, 요구사항, 라이선스) | 섹션 존재 확인 |
| 순서 19 (전체 검증) | Phase 4 전체 검증 체크리스트 수행 | 아래 체크리스트 |

### Phase 4 전체 검증 체크리스트

**필수 파일 검증:**
- [ ] `.claude-plugin/plugin.json` 존재 및 유효
- [ ] `.claude-plugin/marketplace.json` 존재 및 유효
- [ ] `gateway/install.yaml` 존재 및 유효
- [ ] `gateway/runtime-mapping.yaml` 존재 및 유효
- [ ] `README.md` 필수 섹션(개요, 설치, 사용법, 요구사항, 라이선스) 포함

**에이전트 검증 (5개):**
- [ ] 모든 에이전트에 `AGENT.md` + `agentcard.yaml` 쌍 존재
- [ ] AGENT.md: Frontmatter(name, description) + 목표 + 참조 + 워크플로우 섹션 존재
- [ ] AGENT.md: `{tool:name}` 추상 참조만 사용 (구체 도구명 하드코딩 없음)
- [ ] agentcard.yaml: name, version, tier, capabilities, handoff 포함
- [ ] tier 값이 HEAVY/HIGH/MEDIUM/LOW 중 하나
- [ ] tools.yaml의 추상 도구가 runtime-mapping.yaml에 매핑됨
- [ ] forbidden_actions가 action_mapping에 매핑됨

**스킬 검증 (8개):**
- [ ] 모든 스킬에 `SKILL.md` 존재, frontmatter(name, description) 포함
- [ ] setup 스킬: `disable-model-invocation: true` 설정
- [ ] core 스킬 존재 (플러그인당 1개)
- [ ] 위임형 스킬(core, scenario, dsl-generate, prototype, dev-plan, develop): 에이전트 호출 규칙 섹션 포함
- [ ] Orchestrator 스킬: 완료 조건, 검증 프로토콜, 상태 정리, 취소/재개 섹션 포함
- [ ] 위임형 스킬: `→ Agent:` 마커 5항목 포함
- [ ] 프롬프트 구성 순서: 공통 정적 → 에이전트별 정적 → 동적

**슬래시 명령 검증 (7개):**
- [ ] `commands/` 디렉토리에 진입점 파일 존재 (setup, dify-setup, scenario, dsl-generate, prototype, dev-plan, develop)
- [ ] 각 commands 파일에 frontmatter(description) + Skill 도구 위임 지시 포함

**Gateway 검증:**
- [ ] tier_mapping에 default 섹션 포함 (HEAVY/HIGH/MEDIUM/LOW), 각 티어에 model 정의
- [ ] tool_mapping에 builtin 도구 미포함 (런타임 내장)
- [ ] install.yaml에 런타임 빌트인/OMC 기본 도구 미포함 (중복 설치 금지)
- [ ] install.yaml의 custom_tools.source 파일 경로가 실제 존재

**공유 자원 복사 검증:**
- [ ] `agents/scenario-analyst/references/requirement-generater.md` 존재
- [ ] `agents/dsl-architect/references/dsl-generation-prompt.md` 존재
- [ ] `agents/dsl-architect/references/dify-workflow-dsl-guide.md` 존재
- [ ] `agents/plan-writer/references/develop-plan-generate.md` 존재
- [ ] `agents/agent-developer/references/develop.md` 존재
- [ ] `gateway/tools/dify_cli.py` 존재
- [ ] `gateway/tools/dify_client.py` 존재
- [ ] `gateway/tools/config.py` 존재
- [ ] `gateway/tools/validate_dsl.py` 존재
- [ ] `gateway/requirements.txt` 존재 (mcp 의존성 제외 확인)

[Top](#abra-플러그인-개발-계획서)
