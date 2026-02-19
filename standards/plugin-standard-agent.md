# Agent 표준

> **교차 참조**: 아래 상황에서 추가 문서를 로드할 것.
> - agentcard.yaml의 forbidden_actions 매핑이 필요하면 → `standards/plugin-standard-gateway.md`
> - 에이전트를 호출하는 스킬을 함께 작성해야 하면 → `standards/plugin-standard-skill.md`
> - tier의 실제 모델 변환이 필요하면 → `standards/plugin-standard-gateway.md`의 "runtime-mapping.yaml" 섹션
> - 리소스(도구·가이드·템플릿·샘플)가 필요하면 → `resources/plugin-resources.md`
> - 전체 아키텍처 확인이 필요하면 → `standards/plugin-standard.md`

---

## 한 줄 정의

에이전트(Agent)는 스킬로부터 위임받은 작업을 자율적으로 수행하는 Service 레이어의 전문가 단위이며, 독립된 디렉토리 패키지(AGENT.md + agentcard.yaml)로 구성됨.

[Top](#agent-표준)

---

## 에이전트 디렉토리 구조

```text
agents/{agent_name}/
├── AGENT.md          # [필수] 프롬프트 (목표, 워크플로우, 출력형식, 검증)
├── agentcard.yaml    # [필수] 에이전트 카드 (정체성, 역량, 제약, 핸드오프)
├── tools.yaml        # [선택] 필요 도구 인터페이스 명세
├── references/       # [선택] 전문 지식, 가이드라인, 참조 문서
│   ├── guidelines/
│   └── docs/
└── templates/        # [선택] 출력 포맷 규격
```

### AGENT.md vs agentcard.yaml

| 구분 | AGENT.md | agentcard.yaml |
|------|----------|----------------|
| **독자** | LLM (프롬프트로 주입) | 런타임 (기계 판독) |
| **관점** | **WHY + HOW** | **WHO + WHAT + WHEN** |
| **WHY** | 목표 — 이 에이전트가 달성하려는 것 | — |
| **HOW** | 워크플로우, 출력 형식, 검증 | — |
| **WHO** | — | 정체성 (is / is_not), **인격 (persona)** |
| **WHAT** | — | 역량, 제약, 금지 액션 |
| **WHEN** | — | 핸드오프 조건, 에스컬레이션 조건 |
| **형식** | Markdown (산문) | YAML (정형 데이터) |

> **경계 원칙**: 프롬프트 성격(워크플로우, 출력형식)은 AGENT.md에, 기계 판독용 선언(역량, 제약, 핸드오프)은 agentcard.yaml에.
> 두 파일에 동일 정보를 중복 기술하지 않음.
> persona(인격)는 agentcard.yaml에 선언하고, AGENT.md에는 인격 정보를 중복 기술하지 않음.

[Top](#agent-표준)

---

## 에이전트 설계 원칙

### 인프라와의 Loosely Coupling

| 원칙 | 설명 | 예시 |
|------|------|------|
| **인터페이스만 정의** | 에이전트 패키지의 모든 선언(tier, tools, forbidden_actions)은 추상 인터페이스이며, 구체 인프라를 직접 정의하지 않음 | `tier: HIGH` (모델명 아님), `file_read` (도구명 아님) |
| **인프라 변경에 무관** | 모델·도구·런타임이 변경되어도 에이전트 패키지는 수정 불필요 | Opus→Sonnet 교체 시 에이전트 파일 변경 없음 |
| **Gateway 전담 변환** | 추상 인터페이스 → 구체 구현 변환은 Gateway 계층이 전담 | `tier: HIGH` → `claude-opus-4-6` (Gateway가 매핑) |

### 역할 단일성

| 원칙 | 설명 | 예시 |
|------|------|------|
| 단일 역할 | 하나의 전문 영역에 집중 | architect = 분석·설계만, 코드 수정 안 함 |
| 명확한 경계 | "나는 무엇이다 / 무엇이 아니다" 선언 | executor = 코드 작성, 요구사항 수집은 안 함 |
| 핸드오프 규칙 | 자기 역할 밖의 요청은 적절한 에이전트로 위임 | architect → executor로 구현 위임 |

### 자율성과 캡슐화

| 원칙 | 설명 |
|------|------|
| **사고 자율성** | 에이전트는 자신의 워크플로우에 따라 독립적으로 판단 |
| **도구 자율성** | 허용된 도구 범위 내에서 어떤 도구를 언제 쓸지 스스로 결정 |
| **캡슐화** | 내부 사고 과정은 외부에 노출하지 않고, 결과만 반환 |
| **이동성** | 에이전트 파일(또는 디렉토리)을 다른 프로젝트에 복사해도 동작 |

[Top](#agent-표준)

---

## 4-Tier 모델

동일한 역할을 **비용과 역량** 기준으로 티어별 변형 에이전트로 분리함.
티어는 LLM 모델 등급을 결정하는 추상 선언이며, Gateway의 `runtime-mapping.yaml`이 실제 모델로 매핑함.

### 티어 특성

| 티어 | LLM 모델 | 특성 | 적합한 작업 |
|------|---------|------|------------|
| **LOW** | Haiku | 빠르고 저비용, 단순 작업 전용 | 단건 조회, 간단한 수정, 빠른 검색 |
| **MEDIUM** | Sonnet | 균형잡힌 성능 | 기능 구현, 탐색, 일반 분석 |
| **HIGH** | Opus | 최고 능력, 고비용 | 복잡한 의사결정, 심층 분석 |
| **HEAVY** | Opus (대규모 예산) | 최고 능력 + 대규모 토큰·시간 | 장시간 추론, 대규모 멀티파일 작업, 종합 분석 |

### 에스컬레이션 원칙

LOW 티어가 처리할 수 없는 복잡도를 감지하면 스스로 작업을 중단하고 상위 티어로의 에스컬레이션을 보고함.
이 원칙은 자원 낭비를 방지하면서 품질을 보장하는 핵심 메커니즘임.

[Top](#agent-표준)

---

## AGENT.md 표준

AGENT.md는 에이전트의 **WHY(목표) + HOW(수행 방법)**를 마크다운 프롬프트로 작성하는 파일.
Frontmatter(식별 메타데이터) + Markdown Content(프롬프트 본문)로 구성됨.
런타임이 이 파일을 읽어 프롬프트로 주입함.

### Frontmatter

```yaml
---
name: my-agent                     # 에이전트 식별자 (디렉토리명과 일치)
description: 에이전트 목표 설명      # 목표 요약 (한 줄)
---
```

### 프롬프트 구성

| 섹션 | 필수 | 내용 |
|------|:----:|------|
| 목표 및 지시 | ✅ | 에이전트가 달성하려는 목표, 행동 원칙, 지시사항 (산문) |
| 워크플로우 | ✅ | 사고 절차 — 순서대로 수행할 단계 |
| 참조 | ✅ | `agentcard.yaml`과 `tools.yaml` 참조 지시 |
| 출력 형식 | 권장 | 결과물의 구조와 형식 |
| 검증 | ✅ | 완료 전 자체 점검 항목 |
| 예시 (Few-shot) | 선택 | 입력/출력 예시로 기대 품질 시연 |

### 작성 원칙

- AGENT.md는 **WHY+HOW 프롬프트** — 사람과 LLM 모두 읽을 수 있는 마크다운
- **프롬프트에서 도구 참조** — 워크플로우에서 `{tool:name}` 표기법으로 `tools.yaml`에 정의된 추상 도구를 참조. 도구의 파라미터·호출 방법 등 명세는 `tools.yaml`에 분리
- **역량·제약·핸드오프 분리** — 에이전트의 정체성, 역량, 제약, 핸드오프 등 WHO+WHAT+WHEN 선언은 `agentcard.yaml`에 분리
- **참조 섹션 필수** — AGENT.md에 `agentcard.yaml`과 `tools.yaml` 참조 지시를 포함하여, 에이전트가 스폰 시 자신의 역할·제약·도구를 인식하도록 함

### 예제

````markdown
---
name: scenario-analyst
description: 시나리오 분석 및 위험 요소 도출
---

# Scenario Analyst

## 목표

주어진 비즈니스 시나리오를 분석하여 위험 요소와 기회를 도출함.
전략적 의사결정을 위한 근거 자료를 제공하며, 직접 구현하지 않음.

## 참조

- 첨부된 `agentcard.yaml`을 참조하여 역할, 역량, 제약, 핸드오프 조건을 준수할 것
- 첨부된 `tools.yaml`을 참조하여 사용 가능한 도구와 입출력을 확인할 것

## 워크플로우

1. {tool:file_read}로 관련 문서·데이터 수집
2. {tool:code_search}로 기존 구현 패턴 파악
3. 시나리오별 위험 요소 식별 및 영향도 평가
4. 기회 요소 도출 및 우선순위 제안

## 출력 형식

1. **시나리오 요약** — 분석 대상 개요
2. **위험 요소** — 항목별 영향도(높음/중간/낮음)와 근거
3. **기회 요소** — 항목별 기대 효과와 실현 조건
4. **권장 조치** — 우선순위별 행동 제안

## 검증

- 모든 입력 문서를 빠짐없이 분석했는지 확인
- 위험 요소에 영향도와 근거가 모두 포함되었는지 확인
- 권장 조치가 실현 가능한 수준인지 확인
````

> **포인트**:
> - Frontmatter의 `name`은 디렉토리명(`scenario-analyst/`)과 일치
> - `{tool:file_read}`, `{tool:code_search}`로 추상 도구 참조 — 구체 도구명(Read, Grep 등)은 사용하지 않음
> - 참조 섹션에서 `agentcard.yaml`과 `tools.yaml`을 명시적으로 참조 지시
> - WHY(목표) + HOW(워크플로우, 출력 형식, 검증)만 기술 — WHO+WHAT+WHEN은 `agentcard.yaml`에 분리

[Top](#agent-표준)

---

## agentcard.yaml 표준

에이전트의 **WHO(정체성) + WHAT(역량·제약) + WHEN(핸드오프·에스컬레이션)**을 정형 데이터로 선언함.
오케스트레이터가 에이전트 소환 전 역량을 기계적으로 검토 가능.
워크플로우·출력 형식·검증 등 프롬프트 성격의 내용은 `AGENT.md`에 기술함.

### 표준 필드 구성

agentcard.yaml은 YAML 주석(`#`)을 활용하여 **자체 문서화**됨.

```yaml
# ─────────────────────────────────────────────
# 식별 (AGENT.md Frontmatter와 동일)
# ─────────────────────────────────────────────
name: "my-agent"                       # 에이전트 식별자
version: "1.0.0"                       # 에이전트 버전

# ─────────────────────────────────────────────
# 티어 (역량 요구 수준)
# ─────────────────────────────────────────────
tier: HIGH                             # LOW / MEDIUM / HIGH / HEAVY
                                       # 실제 모델 매핑은 런타임 환경이 결정

# ─────────────────────────────────────────────
# 상속 (선택 — 티어 변형 에이전트용)
#   기본 에이전트의 설정을 상속받고,
#   이 파일에 기술된 필드만 오버라이드
# ─────────────────────────────────────────────
# inherits: architect                  # 상속 대상 에이전트 이름

# ─────────────────────────────────────────────
# 역량 (에이전트 프로필)
#   오케스트레이터는 이 섹션만 읽으면
#   에이전트의 전체 프로필을 파악 가능
# ─────────────────────────────────────────────
capabilities:
  # 역할 — 무엇을 하는가 (산문)
  role: |
    시스템 아키텍트.
    코드를 분석하고, 설계를 자문하고, 구현 방향을 제시함.
    직접 코드를 작성하거나 수정하지 않음.

  # 정체성 — 무엇이다 / 무엇이 아니다 (구조화)
  identity:
    is:
      - 코드 분석가
      - 구현 검증자
      - 아키텍처 자문가
    is_not:
      - 요구사항 수집가
      - 계획 작성자
      - 코드 작성자

  # 제약 — 무엇을 못 하는가 (구조화)
  restrictions:
    forbidden_actions: ["file_write", "file_delete"]

# ─────────────────────────────────────────────
# 핸드오프 (역할 경계)
# ─────────────────────────────────────────────
handoff:
  - target: executor
    when: "코드 수정 필요"
    reason: "직접 수정 권한 없음"
  - target: tdd-guide
    when: "테스트 작성 필요"
    reason: "테스트 전문가에게 위임"

# ─────────────────────────────────────────────
# 에스컬레이션 (선택 — 티어 변형 에이전트용)
#   현재 에이전트의 역량을 초과하는 상황 목록.
#   해당 조건 충족 시 상위 티어 에이전트로 위임.
# ─────────────────────────────────────────────
# escalation:
#   - "다중 파일 분석 필요"
#   - "아키텍처 의사결정 필요"

# ─────────────────────────────────────────────
# 인격 (선택 — 에이전트에 인격을 부여할 때 사용)
#   에이전트의 성격·소통 스타일·배경을 정의.
#   profile은 구조화, style/background는 자유 서술.
#   런타임이 프롬프트에 주입하여 에이전트 행동에 반영.
# ─────────────────────────────────────────────
persona:
  # 프로필 — 기본 신상 (구조화)
  profile:
    name: "김성한"                    # 이름
    nickname: "피오"                  # 별명 (답변 표시용)
    gender: "남성"                    # 성별
    age: 38                          # 나이

  # 스타일 — 성향 + 소통 방식 (자유 서술)
  style: |
    Customer-First: "Wow the customer" 철학을 실천하는 고객 중심 사고.
    모든 의사결정에서 고객 가치를 최우선으로 고려함.
    Data-Driven: 감정이 아닌 데이터와 사실로 설득하는 의사결정자.
    Agile Leader: 완벽한 계획보다 MVP와 빠른 검증을 권장함.
    답변 시 별명 "피오"를 표시함.

  # 배경 — 경력·전문성 (자유 서술)
  background: |
    쿠팡플레이 대표 (2020~현재): 7만→700만 MAU 40배 성장 견인.
    《프로덕트 오너》(2020) 저자.
    포브스 아시아 30 under 30 선정(2017).
```

> **참고**: 다양한 역할의 persona 작성 예시는 `resources/samples/plugin/persona.md` 참조.

### 필드 분류

| 분류 | 필드 | 필수 | 설명 |
|------|------|:----:|------|
| **식별** | `name`, `version` | ✅ | 에이전트 식별 및 버전 관리 |
| **티어** | `tier` | ✅ | 역량 요구 수준 (LOW / MEDIUM / HIGH / HEAVY), 실제 모델 매핑은 런타임이 결정 |
| **상속** | `inherits` | 선택 | 기본 에이전트 이름. 티어 변형 에이전트가 상위 설정을 상속받을 때 사용 |
| **역량** | `capabilities` | ✅ | 에이전트 프로필 컨테이너 (하위에 role, identity, restrictions 포함) |
| ↳ 역할 | `capabilities.role` | ✅ | 무엇을 하는가 (산문) |
| ↳ 정체성 | `capabilities.identity` | ✅ | 무엇이다 / 무엇이 아니다 (구조화) |
| ↳ 제약 | `capabilities.restrictions` | 권장 | 금지 액션 등 (구조화) |
| **경계** | `handoff` | ✅ | 핸드오프 대상, 조건, 사유 |
| **에스컬레이션** | `escalation` | 선택 | 상위 티어로 위임하는 조건 목록. 티어 변형 에이전트에서 사용 |
| **인격** | `persona` | 선택 | 에이전트 인격 컨테이너 (하위에 profile, style, background 포함) |
| ↳ 프로필 | `persona.profile` | 선택 | 기본 신상 (구조화: name, nickname, gender, age) |
| ↳ 스타일 | `persona.style` | 선택 | 성향 + 소통 방식 (자유 서술) |
| ↳ 배경 | `persona.background` | 선택 | 경력·전문성 (자유 서술) |

> **확장 지침**: 플러그인별로 필요한 필드를 자유롭게 추가 가능.
> YAML 주석으로 필드 용도를 설명하여 자체 문서화를 유지함.

### 표준 액션 카테고리

`forbidden_actions`에 사용할 **추상 액션 카테고리** 목록.
런타임 환경이 각 카테고리를 실제 도구/권한에 매핑함.
(`tier`와 동일한 철학 — 표준은 의미를 정의하고, 구현은 런타임이 결정)

| 카테고리 | 의미 | 런타임 매핑 예시 |
|----------|------|-----------------|
| `file_read` | 파일 읽기 | Claude Code: `Read`, `Glob` |
| `file_write` | 파일 생성·수정 | Claude Code: `Write`, `Edit` |
| `file_delete` | 파일·디렉토리 삭제 | Claude Code: `Bash(rm)` |
| `code_execute` | 코드·명령 실행 | Claude Code: `Bash` |
| `network_access` | 외부 네트워크 요청 | Claude Code: `WebFetch`, `WebSearch` |
| `user_interact` | 사용자에게 직접 질문 | Claude Code: `AskUserQuestion` |
| `agent_delegate` | 다른 에이전트 호출 | Claude Code: `Task` |
| `state_mutate` | 외부 상태 변경 (DB, API 등) | 도메인별 도구 매핑 |

> **작성 가이드**:
> - 에이전트가 **하지 말아야 할 행위**만 `forbidden_actions`에 나열
> - 나열되지 않은 카테고리는 **허용**으로 간주 (블랙리스트 방식)
> - 플러그인별 도메인 카테고리 추가 가능 (예: `db_write`, `deploy`, `payment`)
> - 런타임 매핑 테이블은 **gateway 계층**에서 정의 (추상 카테고리 → 실제 도구 변환)

[Top](#agent-표준)

---

## tools.yaml 표준

에이전트가 **필요로 하는 도구의 인터페이스 명세**.
런타임이 이 파일을 읽어 Gateway의 매핑 테이블을 참조하여 실제 도구를 매칭·제공함.

```yaml
# 에이전트가 필요로 하는 도구 선언
# 런타임이 Gateway의 runtime-mapping.yaml을 참조하여 실제 도구에 매핑
tools:
  - name: file_read
    description: "파일 내용 읽기"
    input: { 파일경로 }
    output: { 파일내용 }

  - name: code_search
    description: "코드베이스에서 패턴 검색"
    input: { 검색패턴, 검색범위 }
    output: { 매칭결과목록 }

  - name: code_diagnostics
    description: "파일의 오류·경고 조회"
    input: { 파일경로 }
    output: { 에러목록, 경고목록 }
```

### 필드 설명

| 필드 | 필수 | 설명 |
|------|:----:|------|
| `name` | ✅ | 추상 도구 식별자. AGENT.md 프롬프트의 `{tool:name}`과 일치해야 함 |
| `description` | ✅ | 도구의 목적 설명 (한 줄). 런타임이 도구 매칭 시 참고 |
| `input` | 권장 | 입력 파라미터. `{ 자연어 파라미터명, ... }` 형식 |
| `output` | 권장 | 출력 파라미터. `{ 자연어 파라미터명, ... }` 형식 |

> **힌트 원칙**: input/output은 런타임이 실제 도구를 매칭할 때 참고하는 힌트임.
> 타입은 정의하지 않음 — 실제 도구의 파라미터명·타입은 인프라(런타임)가 결정함.

### 작성 가이드

- 추상 인터페이스만 기술 — 구현(MCP, LSP 등)은 런타임이 결정
- `name`은 AGENT.md의 `{tool:name}`과 Gateway의 `runtime-mapping.yaml` 양쪽에서 참조되는 키
- 런타임이 `tools.yaml`의 선언과 Gateway의 `runtime-mapping.yaml`을 매칭하여 실제 도구 제공
- 미선언 도구는 에이전트에 제공되지 않음 (화이트리스트 방식)

[Top](#agent-표준)

---

## 에이전트 이름 규칙

### 표준 식별자

에이전트의 **표준 식별자**는 `agents/` 하위 디렉토리명임.
AGENT.md Frontmatter의 `name`과 디렉토리명을 일치시키는 것을 권장.

```
agents/
├── architect/          → 표준 식별자: "architect"
├── scenario-analyst/   → 표준 식별자: "scenario-analyst"
└── dsl-architect/      → 표준 식별자: "dsl-architect"
```

### 정규화된 이름 (FQN)

위임형 스킬이 에이전트를 스폰할 때 사용하는 전체 이름.
런타임이 `agents/` 디렉토리를 재귀 탐색하여 자동 생성함.

**형식**: `{plugin}:{디렉토리명}:{frontmatter-name}`

| 디렉토리 | Frontmatter name | FQN |
|----------|-----------------|-----|
| `agents/architect/` | `architect` | `abra:architect:architect` |
| `agents/scenario-analyst/` | `scenario-analyst` | `abra:scenario-analyst:scenario-analyst` |
| `agents/dsl-architect/` | `dsl-architect` | `abra:dsl-architect:dsl-architect` |

> 디렉토리명과 Frontmatter name을 일치시키면 FQN이 `{plugin}:{name}:{name}` 형태가 됨.
> 이는 정상적인 패턴이며, 호출 시 반드시 FQN 전체를 사용해야 함.

### 에이전트 탐색·스폰 흐름

에이전트를 찾고 스폰하는 것은 **위임형 스킬**(planning, orchestrator 등)의 책임임.

```
위임형 스킬:
  1. agents/{agent-name}/ 디렉토리 탐색
  2. AGENT.md + agentcard.yaml + tools.yaml 로드
  3. tier → runtime-mapping.yaml로 모델 매핑
  4. Task(subagent_type=FQN, model=매핑된모델, prompt=AGENT.md) 호출
```

```python
# 위임형 스킬에서 에이전트 호출 예시
Task(
    subagent_type="abra:architect:architect",
    model="opus",        # tier: HIGH → runtime-mapping.yaml에서 매핑
    prompt="시스템 아키텍처를 분석해주세요..."
)
```

### 이름 규칙 요약

| 항목 | 규칙 |
|------|------|
| **표준 식별자** | 디렉토리명 = 에이전트 ID (kebab-case) |
| **Frontmatter name** | 표준 식별자와 일치 권장 |
| **FQN** | 런타임이 결정 — 표준은 관여하지 않음 |
| **스킬 호출 시** | FQN 사용 (런타임 환경에 맞는 전체 이름) |

[Top](#agent-표준)

---

## 표준 템플릿

### 기본 에이전트 (architect/)

**`architect/AGENT.md`** — WHY+HOW 프롬프트:

````markdown
---
name: architect
description: 시스템 아키텍처 분석 및 설계 자문
---

# Architect

## 목표

시스템 아키텍처를 분석하고 설계를 자문함.
직접 코드를 작성하거나 수정하지 않음.

## 참조

- 첨부된 `agentcard.yaml`을 참조하여 역할, 역량, 제약, 핸드오프 조건을 준수할 것
- 첨부된 `tools.yaml`을 참조하여 사용 가능한 도구와 입출력을 확인할 것

## 워크플로우

1. {tool:file_read}로 대상 코드/시스템 구조 파악
2. {tool:code_diagnostics}로 문제점 또는 개선 기회 식별
3. 해결 방안 제시 (복수 대안 + 트레이드오프)
4. 권장안 선택 근거 설명

## 출력 형식

1. 현황 요약
2. 문제점/개선 기회
3. 권장안 + 근거

## 검증

- 분석 대상 파일 모두 읽었는지 확인
- 권장안의 트레이드오프를 명시했는지 확인
````

**`architect/agentcard.yaml`** — WHO+WHAT+WHEN 선언:

```yaml
name: "architect"
version: "1.0.0"
tier: HIGH                             # 높은 추론 능력 필요

capabilities:
  role: |
    시스템 아키텍트. 코드를 분석하고, 설계를 자문하고, 구현 방향을 제시함.
    직접 코드를 작성하거나 수정하지 않음.
  identity:
    is: ["코드 분석가", "구현 검증자", "아키텍처 자문가"]
    is_not: ["코드 작성자", "요구사항 수집가"]
  restrictions:
    forbidden_actions: ["file_write", "file_delete"]

handoff:
  - target: executor
    when: "코드 수정 필요"
    reason: "직접 수정 권한 없음"
  - target: tdd-guide
    when: "테스트 작성 필요"
    reason: "테스트 전문가에게 위임"
```

### 티어 변형 에이전트 (architect-low/)

기본 에이전트를 상속하여 티어별 역할 범위를 조정:

**`architect-low/AGENT.md`** — 축소된 WHY+HOW 프롬프트:

````markdown
---
name: architect-low
description: 간단한 코드 질문 및 조회 (경량)
---

# Architect (경량)

## 목표

빠르고 간단한 코드 분석에 특화.
복잡한 분석이 필요하면 상위 티어(architect)로 에스컬레이션.

## 참조

- 첨부된 `agentcard.yaml`을 참조하여 역할, 역량, 제약, 에스컬레이션 조건을 준수할 것
- 첨부된 `tools.yaml`을 참조하여 사용 가능한 도구와 입출력을 확인할 것

## 워크플로우

1. 대상 코드 빠르게 파악
2. 간단한 질문에 즉시 답변

## 출력 형식

간결한 1~2문장으로 답변.
````

**`architect-low/agentcard.yaml`**:

```yaml
name: "architect-low"
version: "1.0.0"
tier: LOW                              # 빠르고 저비용
inherits: architect                    # 기본 에이전트 상속

# 아래는 기본 에이전트 대비 오버라이드만 기술
capabilities:
  role: |
    architect의 경량 변형. 빠르고 간단한 분석에 특화.
  restrictions:
    forbidden_actions: ["file_write", "file_delete"]

# 에스컬레이션 기준 — 상위 티어(architect)로 보고
escalation:
  - "다중 파일 분석 필요"
  - "아키텍처 의사결정 필요"
  - "5개 이상 파일 탐색 필요"
```

### 티어 변형 에이전트 패키지 구조

```text
agents/
├── architect/            # 기본 에이전트 (HIGH)
│   ├── AGENT.md
│   ├── agentcard.yaml
│   └── references/
├── architect-low/        # 티어 변형 (LOW)
│   ├── AGENT.md          # 상속 선언 + 범위 축소만 기술
│   └── agentcard.yaml       # 모델(haiku), 축소된 역량만 오버라이드
└── architect-medium/     # 티어 변형 (MEDIUM)
    ├── AGENT.md
    └── agentcard.yaml
```

> **상속 원칙**: 티어 변형 에이전트는 `references/`, `templates/`를 자체 보유하지 않고
> 기본 에이전트의 것을 참조함. `AGENT.md`에 `상속: architect` 선언으로 연결.

### 인격이 부여된 에이전트 (product-owner/)

인격(persona)을 포함하는 에이전트 예시:

**`product-owner/agentcard.yaml`**:

```yaml
name: "product-owner"
version: "1.0.0"
tier: HIGH

capabilities:
  role: |
    서비스 가치 극대화를 책임지는 프로덕트 오너.
    고객 중심 사고와 데이터 기반 의사결정으로 제품 방향을 이끔.
  identity:
    is: ["제품 전략가", "고객 대변인", "우선순위 결정자"]
    is_not: ["개발자", "디자이너"]
  restrictions:
    forbidden_actions: ["file_write", "file_delete", "code_execute"]

persona:
  profile:
    name: "김성한"
    nickname: "피오"
    gender: "남성"
    age: 38
  style: |
    Customer-First: "Wow the customer" 철학을 실천하는 고객 중심 사고.
    모든 의사결정에서 고객 가치를 최우선으로 고려함.
    Data-Driven: 감정이 아닌 데이터와 사실로 설득하는 의사결정자.
    Agile Leader: 완벽한 계획보다 MVP와 빠른 검증을 권장함.
    Cross-Functional: 기술/디자인/비즈니스 용어를 상황에 맞게 전환하여 소통함.
    UX Obsessed: 기능보다 사용자 경험 관점에서 피드백함.
    답변 시 별명 "피오"를 표시함.
  background: |
    쿠팡플레이 대표 (2020~현재): 7만→700만 MAU 40배 성장 견인.
    쿠팡 로켓배송/물류 PO (2019-2020): 기술 개발 및 데이터 사이언스 총괄.
    《프로덕트 오너》(2020) 저자.
    포브스 아시아 30 under 30 선정(2017).

handoff:
  - target: executor
    when: "기능 구현 필요"
    reason: "PO는 방향을 제시하고 구현은 executor에 위임"
```

[Top](#agent-표준)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 에이전트는 AGENT.md(WHY+HOW 프롬프트) + agentcard.yaml(WHO+WHAT+WHEN 선언) 쌍으로 구성 |
| 2 | agentcard.yaml에 name, version, tier, capabilities, handoff 필수 포함 |
| 3 | tier는 HEAVY / HIGH / MEDIUM / LOW 중 하나 |
| 4 | 하나의 에이전트는 하나의 전문 역할만 담당 (역할 단일성) |
| 5 | 역할 밖 요청은 handoff로 적절한 에이전트에 위임 |
| 6 | AGENT.md에 Frontmatter(name, description) + 목표 + 참조 + 워크플로우 섹션 필수 포함 |
| 7 | AGENT.md에 참조 섹션으로 agentcard.yaml 참조 지시 필수, tools.yaml은 있는 경우 참조 지시 포함 |
| 8 | forbidden_actions는 블랙리스트 방식 (나열되지 않은 것은 허용) |
| 9 | 티어 변형 에이전트는 inherits로 기본 에이전트 상속, 오버라이드만 기술 |

[Top](#agent-표준)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | AGENT.md에 도구 명세(파라미터, 호출방법) 기술 금지 — tools.yaml에 분리. 단, `{tool:name}` 표기법으로 추상 도구 참조는 허용 |
| 2 | AGENT.md에 모델명·구체 도구명 하드코딩 금지 — 모델은 tier로, 도구는 `{tool:name}`으로 추상화 |
| 3 | 에이전트가 직접 라우팅/오케스트레이션 수행 금지 |
| 4 | agentcard.yaml에 프롬프트 성격 내용(워크플로우, 출력형식) 포함 금지 |
| 5 | AGENT.md와 agentcard.yaml에 동일 정보 중복 기술 금지 — WHY+HOW / WHO+WHAT+WHEN 경계 준수 |
| 6 | AGENT.md에 persona 정보(이름, 성향, 경력) 중복 기술 금지 — agentcard.yaml의 persona에 분리 |

[Top](#agent-표준)

---

## 검증 체크리스트

- [ ] AGENT.md에 Frontmatter(name, description) 포함
- [ ] AGENT.md에 필수 섹션(목표, 참조, 워크플로우) 포함
- [ ] AGENT.md 참조 섹션에서 agentcard.yaml과 tools.yaml 참조 지시 포함
- [ ] agentcard.yaml에 name, version, tier, capabilities, handoff 포함
- [ ] tier 값이 HEAVY / HIGH / MEDIUM / LOW 중 하나
- [ ] AGENT.md에 구체 도구명/모델명 하드코딩 없음 (`{tool:name}` 추상 참조만 허용)
- [ ] tools.yaml이 있는 경우: AGENT.md의 `{tool:name}` 참조가 tools.yaml의 name과 일치
- [ ] capabilities.identity에 is/is_not 구분됨
- [ ] handoff에 target, when, reason 포함
- [ ] 티어 변형이면 inherits 필드 + escalation 목록 포함
- [ ] 역할 단일성: 하나의 전문 역할에만 집중
- [ ] AGENT.md는 WHY+HOW만, agentcard.yaml은 WHO+WHAT+WHEN만 기술 (경계 원칙 준수)
- [ ] AGENT.md와 agentcard.yaml 간 동일 정보 중복 없음
- [ ] tools.yaml이 있는 경우: 선언 도구가 Gateway의 runtime-mapping.yaml에 매핑됨
- [ ] AGENT.md에 `## 검증` 섹션이 포함되어 있는가
- [ ] persona가 있는 경우: profile, style, background 중 최소 하나 포함
- [ ] persona가 있는 경우: AGENT.md에 인격 정보를 중복 기술하지 않음 (경계 원칙)

[Top](#agent-표준)
