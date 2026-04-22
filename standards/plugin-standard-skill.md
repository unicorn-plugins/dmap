# Skill 표준

> **교차 참조**: 아래 상황에서 추가 문서를 로드할 것.
> - 에이전트를 함께 작성해야 하면 → `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md`
> - 에이전트 이름 규칙(표준 식별자, FQN)이 필요하면 → `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md`의 "에이전트 이름 규칙"
> - Gateway 매핑이 필요하면 → `{DMAP_PLUGIN_DIR}/standards/plugin-standard-gateway.md`
> - 리소스(도구·가이드·템플릿·샘플)가 필요하면 → `{DMAP_PLUGIN_DIR}/resources/plugin-resources.md`
> - 전체 아키텍처 확인이 필요하면 → `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md`

---

## 한 줄 정의

SKILL.md는 에이전트 워크플로우를 오케스트레이션(위임형)하거나
Gateway 도구를 직접 사용(직결형)하는 프롬프트 지시문임.

[Top](#skill-표준)

---

## 스킬 유형 분류

스킬은 위임형과 직결형으로 구분되며 역할에 따라 4가지 유형으로 분류됨.
각 유형은 공통 골격 위에 고유 섹션을 추가하여 정체성을 형성하며, 실행 분류(위임형/직결형)가 유형별로 결정됨.

| 분류 | 유형 | 영문명 | 역할 | 예시 |
|------|--------|----------|------|------|
| 위임형 | 라우터스킬 | Router | 요청의 의도를 판별하고 적절한 스킬로 라우팅 | router |
| 위임형 | 지휘자스킬 | Orchestrator | 워크플로우 조율, 병렬 실행, 분석, 리뷰 | analyze, tdd |
| 직결형 | 설정스킬 | Setup | 설치 · 설정 마법사 제공 | setup |
| 직결형 | 도움말스킬 | Help | 사용 도움말 제공 | help |

### 스킬 수 지침
- 설정, 도움말 스킬은 플러그인 당 1개만 생성
- 지휘자스킬은 플러그인의 수행 업무에 따라 N개 이상 생성 
- 라우터 스킬은 지휘자스킬이 2개 이상일때 생성

### 스킬 실행 경로

스킬은 유형에 따라 세 가지 실행 경로 중 하나를 따름.

| 유형 | 의미 | Agent 위임 |
|----------|------|----------|-----------|
| **라우터스킬** | 요청 의도 파악하여 적절 스킬 라우팅 | 없음 |
| **지휘자스킬** | 워크플로우 단계 중 필요한 단계에서 Agent에 위임 | 필요 시 위임 |
| **설정/도움말스킬** | 절차적·결정론적 작업 → Gateway 도구 직접 사용 | 없음 |

**직결형이 필요한 이유 — YAGNI (You Aren't Gonna Need It):**
- Setup/Help 스킬은 설정 파일 작성, 상태 확인, 도구 설치, 도움말 등 **결정론적 작업**을 수행
- 이런 작업에 Agent를 경유하면 불필요한 LLM 호출이 발생 (오버 아키텍처링)
- XP(Extreme Programming)의 YAGNI 원칙: "지금 필요하지 않은 기능은 만들지 않는다"
- Agent 계층이 제공하는 자율적 추론은 직결형 스킬에 **필요하지 않은 기능**임

**직결형 스킬의 제약:**
- 애플리케이션 코드 작성·수정은 여전히 금지 — 코드 작업은 반드시 위임형 경로 사용
- 직결형은 설정 파일, 상태 파일, 문서 등 **인프라성 파일**에만 직접 접근

[Top](#skill-표준)

---

## SKILL.md 구조

### Frontmatter 필드

| 필드 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `name` | ✅ | 스킬 ID (kebab-case) | `my-skill` |
| `description` | ✅ | 한 줄 설명 | `코드 품질 분석 스킬` |
| `type` | ✅ | 스킬유형 | router,setup,orchestrator,help |
| `user-invocable` | 선택 | 사용자 직접 호출 가능 여부 (기본값: true) | `true` |
| `disable-model-invocation` | 선택 | 런타임 자동 호출 차단. **주의: `true` 설정 시 스킬 로드 자체가 안 되므로 사용 금지** | `false` |
| `allowed-tools` | 선택 | 허용 도구 목록 | `["Read", "Agent"]` |
| `model` | 선택 | 기본 모델 | `sonnet` |
| `context` | 선택 | 컨텍스트 힌트 | `["code-quality"]` |

### Markdown Content 골격

```markdown
# {스킬명}

[{스킬명} 활성화]                    ← 선택 (스킬 시작 시 화면에 출력하는 메시지)

## 목표                              ← 필수
(이 스킬이 달성하려는 핵심 목적 1~2문장)

## 활성화 조건                       ← 필수
(이 스킬이 활성화되는 조건)

## 에이전트 호출 규칙                ← 에이젼트 위임형 스킬 필수

### 에이전트 FQN                    
| 에이전트 | FQN |

### 프롬프트 조립                  
(에이젼트 호출 시 프롬프트 조립 방법)

## 워크플로우                        ← 권장
(단계별 접근법)

### Phase 1: 분석                     ← 스킬 직접 실행 (위임 없음)
(스킬이 직접 수행하는 작업)

### Phase 2: 구현 → Agent: executor   ← Agent 위임 (5항목 필수)
- **TASK**: ...
- **EXPECTED OUTCOME**: ...
- **MUST DO**: ...
- **MUST NOT DO**: ...
- **CONTEXT**: ...

### Phase 3: 리뷰 → Skill: review   ← Skill 라우팅 (3항목 필수)
- **INTENT**: ...
- **ARGS**: ...
- **RETURN**: ...

## 완료 조건                   ← 권장
(스킬 완료 체크 리스트)

## 상태 정리                   ← 권장
(진행 상태 정보 기록: 완료 단계, 반복횟수 등)
(임시 파일 삭제: 진행 중 생성한 임시 파일 삭제)

## 재개                   ← 권장
(마지막 완료 단계부터 재시작하는 규칙)

```

[Top](#skill-표준)

---

## 스킬 활성화 경로

런타임은 세션 시작 시 `skills/` 디렉토리를 스캔하여 모든 스킬을 자동 발견함.
각 스킬은 frontmatter(`name`, `description`)와 `## 활성화 조건` 섹션으로 자기 기술(self-description)하며,
런타임은 이 메타데이터를 기반으로 사용자 요청을 적절한 스킬에 매칭함.

### 활성화 경로 유형

| 경로 | 흐름 | 설명 |
|------|------|------|
| **직접 활성화** | 런타임 → 특정 스킬 | 슬래시 명령(`/plugin:skill`) 또는 자연어 매칭(frontmatter description 기반) |
| **Router 경유 활성화** | 런타임 → Router → 특정 스킬 | 모호한 사용자 요청에 대해 Router 스킬이 요청의 의도를 판별하고 적절한 스킬로 라우팅  |

### 직접 활성화

명확한 슬래시 명령 또는 frontmatter의 `description`과 높은 유사도를 보이는 자연어 요청은
런타임이 직접 해당 스킬을 활성화함. 별도의 중간 계층 없이 즉시 스킬이 로드됨.

### Router 경유 활성화

사용자의 요청이 모호하거나 복수 스킬에 걸칠 수 있는 경우,
런타임은 Router 스킬을 먼저 활성화함.
Router 스킬은 요청의 의도를 판별하고 적절한 스킬로 라우팅하는 역할에 한정됨.

[Top](#skill-표준)

---

## 위임 규칙

스킬은 **라우터(Router)와 오케스트레이터(Orchestrator)** 역할에 집중함.
직접 작업을 수행하는 것이 아니라, 요청을 분석하고 적절한 에이전트에게 위임하는 것이 핵심 역할임.

| 스킬 수행 유형 | 역할 | 
|---------------|----------------------|
| 직접 수행 | 요청 의도 분류, 워크플로우 분기 결정, 사용자 상호작용 (질문, 안내), 상태 관리 (진행률, 반복 카운트), 에이전트 결과 취합·보고, AI 런타임 직접 수행 필요 작업 |
| 에이젼트 위임 | 코드 작성·수정, 탐색·분석·조사, 문서 작성, 검증·테스트, 설계·아키텍처 결정 |
| 스킬 라우팅 | 다른 스킬로 전환 |

**AI 런타임 직접 수행 필요 작업**: AI 런타임이 직접 수행하는게 더 나은 품질을 보장하는 작업  
- MS 오피스 문서 작성 
  
### 프롬프트 깊이 차등화
**핵심**: 위임형 스킬 프롬프트가 에이전트의 작업 방법까지 상세히 기술하면 에이전트의 자율성이 떨어지고
유지보수 비용이 증가함. **"무엇을 달성할 것인가"**에 집중하고, **"어떻게 달성할 것인가"**는 에이전트에 맡김.

### 위임 표기법 (Delegation Notation)
워크플로우 단계에서 Agent 또는 Skill에 위임할 때, **단계 제목에 마커**를 붙여 위임을 선언함.
마커가 있는 단계는 해당 위임 유형의 필수 항목을 본문에 반드시 포함해야 함.

**마커 형식:**
| 마커 | 의미 | 필수 항목 | 도구 |
|------|------|----------|------|
| `→ Agent: {name}` | Agent에 작업 위임 | 5항목 | Agent |
| `→ Skill: {name}` | 다른 Skill에 위임 | 3항목 | Skill |

#### Agent 위임 5항목 (`→ Agent:`)
```
- **TASK**: 원자적이고 구체적인 목표 (하나의 작업당 하나의 위임)
- **EXPECTED OUTCOME**: 구체적 산출물과 성공 기준
- **MUST DO**: 반드시 수행해야 할 요건 — 빠짐없이 나열
- **MUST NOT DO**: 금지 행위 — 에이전트의 월권 방지
- **CONTEXT**: Agent 수행을 위한 Input 정보(선행 결과, 참조 파일 경로, 기존 패턴, 제약 조건 등)
```

**간결 원칙**: 위 5항목 외에 에이전트의 내부 사고 방식이나 단계별 절차는 기술하지 않음.
에이전트는 자신의 AGENT.md에 정의된 역할과 워크플로우를 따름.

#### Skill 위임 3항목 (`→ Skill:`)

```
- **INTENT**: 호출 목적 (왜 이 스킬을 호출하는지)
- **ARGS**: 전달 인자 (사용자 입력, 선행 결과 등)
- **RETURN**: 호출 후 기대하는 상태 또는 복귀 조건
```

대상 스킬이 **이미 자체 워크플로우를 보유**하므로, Agent 위임보다 전달 항목이 간결함.

#### 워크플로우 적용 예시

```markdown
## 워크플로우

### Step 1: 요청 분석
사용자 요청의 의도를 분류하고 작업 범위를 결정함.

### Step 2: 코드 탐색 → Agent: explorer
- **TASK**: 대상 모듈의 현재 구조와 의존관계 파악
- **EXPECTED OUTCOME**: 파일 목록, 의존 관계, 수정 영향 범위 보고서
- **MUST DO**: 테스트 파일 포함하여 탐색
- **MUST NOT DO**: 코드 수정 금지
- **CONTEXT**: `src/` 디렉토리 대상

### Step 3: 구현 → Agent: executor (`/oh-my-claudecode:tdd` 활용)
- **TASK**: Step 2의 분석 결과를 기반으로 기능 구현
- **EXPECTED OUTCOME**: 컴파일 에러 없는 구현 코드
- **MUST DO**: 기존 패턴과 일관성 유지
- **MUST NOT DO**: 요청 범위 외 리팩터링 금지
- **CONTEXT**: Step 2의 탐색 결과 참조

### Step 4: QA 전환 → Skill: ultraqa (`/oh-my-claudecode:ultraqa` 활용)
- **INTENT**: 구현 완료 후 QA 사이클 진입
- **ARGS**: 구현된 파일 목록, 테스트 대상
- **RETURN**: 모든 테스트 통과 시 완료
```

#### Skill→Skill 위임 패턴 분류

| 패턴 | 설명 | 예시 |
|------|------|------|
| **스킬 호출** | 다른 스킬 호출 | router -> plan |

[Top](#skill-표준)

---

## 에이전트 호출 규칙

위임형 스킬이 `Agent` 도구로 에이전트를 호출할 때의 규칙.

> **도구명 각주**: `Agent`는 Claude Code v2.1.63+의 에이전트 스폰 도구명.
> 이전 버전에서는 `Task`로 불림 (하위호환 목적으로 `system:init`에는 여전히 `Task` 잔존).

### 에이전트 탐색·스폰 흐름

```
1. agents/{agent-name}/ 디렉토리에서 3파일 로드
   ├── AGENT.md       → 프롬프트 본문
   ├── agentcard.yaml → tier 확인 + 프롬프트에 첨부
   └── tools.yaml     → 도구 해석 + 프롬프트에 첨부
2. tier → runtime-mapping.yaml로 모델 매핑
3. 프롬프트 조립: AGENT.md + agentcard.yaml + tools.yaml
4. 인격 주입: agentcard.yaml에 persona가 있으면 프롬프트 앞에 인격 컨텍스트 추가
5. Agent(subagent_type=FQN, model=매핑된모델, prompt=조립된 프롬프트) 호출
```

> **프롬프트 조립**: 위임형 스킬은 3파일을 합쳐 하나의 프롬프트로 전달함. 에이전트는 자신의 역할·제약·도구를 모두 인식함.
> **매핑 참조**: 위임형 스킬은 `gateway/runtime-mapping.yaml`을 참조하여 tier→모델 매핑을 수행함.
> 에이전트는 runtime-mapping.yaml을 직접 참조하지 않음 — 인프라 매핑은 스킬의 책임.

### FQN (정규화된 이름)

런타임이 `agents/` 디렉토리를 재귀 탐색하여 자동 생성하는 전체 이름.

| 형식 | 예시 |
|------|------|
| `{plugin}:{에이젼트 디렉토리명}:{frontmatter-name}` | `abra:architect:architect` |

### 호출 예시

```python
# 위임형 스킬에서 에이전트 호출 예시
Agent(
    subagent_type="abra:architect:architect",
    model="opus",        # tier: HIGH → runtime-mapping.yaml에서 매핑
    prompt="시스템 아키텍처를 분석해주세요..."
)
```

> **상세 규칙**: 에이전트 이름 규칙의 전체 내용은 → `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md`의 "에이전트 이름 규칙" 참조.

### 작성 가이드

위임형 스킬(Orchestrator)의 `## 에이전트 호출 규칙` 섹션에 다음 내용을 포함할 것:

1. **에이전트 FQN 목록** — 이 스킬이 호출하는 에이전트의 FQN (`{plugin}:{agent}:{agent}`)
2. **프롬프트 조립 절차**:
   - `{DMAP_PLUGIN_DIR}/resources/guides/combine-prompt.md`에 따라 프롬프트 조립 
   - `Agent(subagent_type=FQN, model=구체화된 모델, prompt=조립된 프롬프트)` 호출

### 스킬 부스팅 활용  
에이젼트 위임형 스킬(Orchestrator)의 **워크플로우 섹션**에서 아래 유즈케이스 작업에 대해 스킬 부스팅 사용(스킬부스팅이 사용 가능할 때)  

| 유즈케이스 | 추천 스킬 부스팅 |
|----------------|----------|
| 개발 계획 수립 | `/ralplan` |
| 기능 구현 | `/ralph` |
| QA/검증 | `/ultraqa` |
| 보안 검토 | `/security-review` |

예시: 
```
### Phase 3: 개발 계획 수립 → Agent: mas-architect (sub_role=graph-designer) (`ralplan` 활용)
```
> **직결형 스킬 적용**: 직결형 스킬은 스킬부스팅 사용 안함

[Top](#skill-표준)

---

## 공통 필수 섹션

모든 스킬이 포함해야 할 기본 골격:

| 순서 | 표준 섹션명 | 필수 | 설명 |
|------|------------|------|------|
| 1 | `# {스킬명}` | ✅ | H1 타이틀 + 역할 요약 (한 줄) |
| 2 | `[{스킬명} 활성화]` | 선택 | 스킬 시작 시 화면에 출력하는 메시지 |
| 3 | `## 목표` | ✅ | 이 스킬이 달성하려는 핵심 목적 |
| 4 | `## 활성화 조건` | 권장 | 이 스킬이 활성화되는 조건 · 상황 (자기 선언) |
| 5 | `## 워크플로우` | 권장 | 워크플로우 / 단계별 접근법. 위임 시 `→ Agent:` 또는 `→ Skill:` 마커 사용 |
| 6 | `## 완료 조건` | 권장 | 스킬 완료 체크 리스트 |
| 7 | `## 상태 정리` | 권장 | 진행 상태 정보(완료 단계, 반복 횟수 등), 임시 파일 삭제 등 |
| 8 | `## 재개` | 권장 | 마지막 완료 단계부터 재시작하는 규칙 |

### 섹션명 통일 규칙

동일 목적의 섹션은 표준명 사용 권장:

| 목적 | 표준명 | 비권장 (혼용 사례) |
|------|--------|-------------------|
| 핵심 목적 | `## 목표` | Overview, What It Does, Core Concept, 개요 |
| 활성화 조건 | `## 활성화 조건` | Activation, When to Use, Magic Keywords |
| 워크플로우 | `## 워크플로우` | Workflow, Phases, Approach, Step N |
| 에이전트 호출 규칙 | `## 에이전트 호출 규칙` | - |

### 유형별 활성화 조건 작성 가이드

| 유형 | 활성화 조건 내용 | 예시 |
|------|-----------------|------|
| Router | 광범위 조건 매칭 시 자동 활성화 | "위임이 필요한 작업 감지 시 활성화" |
| Setup | 명시적 호출만 (`/command`) | "사용자가 `/{plugin-name}:setup` 호출 시" |
| Orchestrator | 키워드 감지 | "시장조사 수행" |
| Help | 명시적 호출 또는 키워드 감지 | "사용자가 `/{plugin-name}:help` 호출 시, 도움말" |

[Top](#skill-표준)

---

## 유형별 필수/권장 섹션

### Router (라우팅스킬)

항상 활성화되어 모호한 사용자 요청의 의도를 판별하여 적절한 스킬로 라우팅 

#### 고유 섹션
없음

#### 워크플로우 작성 패턴

Router 스킬의 `## 워크플로우`는 **라우팅 전용**으로 구성됨.
매 메시지마다 요청 의도를 감지하고 적절한 스킬로 분배하는 흐름을 정의함.

**라우팅 워크플로우 구성:**

| 단계 | 이름 | 설명 |
|------|------|------|
| **Step 1** | 의도 감지 (Intent Detection) | 요청을 분류하는 규칙 정의 (키워드 매칭, 패턴 분석 등) |
| **Step 2** | 스킬 매칭 (Skill Matching) | 분류된 의도를 어떤 스킬에 라우팅할지 조건 테이블로 정의 |
| **Step 3** | 위임 (Dispatch) | 매칭된 스킬에 `→ Skill:` 마커로 위임. 미매칭 시 기본 동작 정의 |

#### Router 유형 스킬 예제
````
---
name: router
description: 전체 파이프라인 실행 (기획→설계→PPT→검증, STEP 경계 3회 사용자 승인)
type: router
user-invocable: true
---

# Router (전체 파이프라인)

[Router 활성화]

## 목표

도메인·주제 입력부터 경영진 발표 PPT·최종 검증까지 end-to-end 파이프라인을 오케스트레이션함. STEP 1(기획) → STEP 2(MAS 설계) → STEP 3(PPT 생성) → 최종 검증의 4개 Phase를 순차 수행하며, STEP 경계에서 3회 사용자 승인을 획득함.

## 활성화 조건

사용자가 `/mas-designer:core` 호출 시 또는 "AI 기획 도와줘", "멀티에이전트 설계", "기획부터 PPT까지" 등 포괄 요청 키워드 감지 시.

## 워크플로우

### Phase 0: 도메인·주제 수집 + 프로젝트 네이밍
1. AskUserQuestion으로 비즈니스 도메인·주제·핵심 고민 수집

### Phase 1: STEP 1 기획 실행 → Skill: plan (`/mas-designer:plan` 위임)
- **INTENT**: 문제가설 → 방향성 → 솔루션 탐색/선정 → 이벤트 스토밍 → 유저스토리 순차 수행
- **ARGS**: `{project}` 식별자, `output/{project}/plan/0-input.md` 경로
- **RETURN**: STEP 1 완료 상태 + 산출물 13종 경로 + plan 스킬 Phase 8의 체크리스트 결과

## 완료 조건

- [ ] Phase 0 `{project}` 확정
- [ ] Phase 1/2/3에서 각 STEP 승인 획득 (총 3회)
- [ ] Phase 4 review APPROVED
- [ ] final/ 디렉토리 5개 산출물 모두 존재

## 상태 정리
진행 상태를 `.state/mas-designer-core-progress.json`에 기록:
```json
{
  "project": "{project}",
  "phase_completed": ["phase-0", "phase-1", ...],
  "current_phase": "phase-N",
  "approvals": [{"phase": 1, "at": "2026-04-21T..."}, ...]
}
```
완료 시 상태 파일 삭제.

## 재개

상태 파일 존재 시 마지막 `phase_completed` 다음부터 재시작. `{project}` 식별자 재확인 필수.

````

[Top](#skill-표준)

---

### Setup (설정스킬)

설치 · 설정 마법사를 제공하는 직결형 스킬.
Agent 위임 없이 Gateway 도구(Bash, Write 등)를 직접 사용.

#### 고유 섹션

공통 골격에 더해 Setup 고유 섹션:

| 섹션 | 필수 | 설명 |
|------|------|------|
| `## 문제 해결` | 권장 | 트러블슈팅 가이드 |

#### 워크플로우 작성 패턴

Setup 스킬은 `## 워크플로우` 안에 `### Phase N: {Name}` 패턴으로 번호 기반 순차 워크플로우를 정의함.
사용자가 진행 상황을 파악하기 쉽도록 단계별 번호를 부여함.

#### 특징

- bash 명령어(설치) + Write 도구(설정 파일 작성) 혼합 사용
- 설정 완료 후 검증 단계 포함 권장

#### frontmatter 권장 설정

```yaml
---
name: setup
description: 플러그인 초기 설정
type: setup
user-invocable: true
---
```

> **주의**: `disable-model-invocation: true`를 설정하면 런타임이 스킬을 아예 로드하지 않아
> 사용자가 `/my-plugin:setup`으로 호출해도 스킬을 찾을 수 없음.
> Setup 스킬은 `user-invocable: true`만 설정하고 `disable-model-invocation`은 사용하지 않을 것.
> name, description, type은 필수

#### Setup 스킬 예제
````
---
name: setup
description: mas-designer 플러그인 초기 설정 (pptxgenjs·google-genai 설치, Gemini API Key 등록, 모델 매핑 확인)
type: setup
user-invocable: true
---

# Setup

[SETUP 활성화]

## 목표

mas-designer 플러그인의 런타임 의존성을 설치하고, Gemini API Key를 `.env`로 안전하게 저장하며, `runtime-mapping.yaml`의 모델 버전을 사용자에게 확인받아 최신 상태로 유지함. `gateway/install.yaml` 데이터만 참조하여 설치를 실행함.

## 활성화 조건

사용자가 `/mas-designer:setup` 호출 시 또는 "mas-designer 설치/설정" 키워드 감지 시.

## 워크플로우
### Phase 1: 환경 전제 확인 

- Node.js ≥18 설치 여부: `node --version`
- Python ≥3.10 설치 여부: `python --version`
- 둘 중 하나라도 없으면 사용자에게 설치 안내 후 중단

### Phase 2: gateway/install.yaml 로드 및 파싱

`{PLUGIN_DIR}/gateway/install.yaml` 읽어 `runtime_dependencies`, `custom_tools` 항목 추출.

## 문제 해결

| 증상 | 해결 |
|------|------|
| `npm install pptxgenjs` 실패 | Node.js ≥18 확인, `npm cache clean --force` 후 재시도 |
| `pip install google-genai` 실패 | Python 3.10+ 확인, venv 활성화, `pip install -U pip` 후 재시도 |
| generate_image.py 실행 시 API 401 | `.env`의 GEMINI_API_KEY 값 재확인, 공백·따옴표 제거 |
| 모델 버전이 런타임에서 인식 안 됨 | runtime-mapping.yaml의 모델명 오타 확인 |

````

[Top](#skill-표준)

---

### Orchestrator (지휘자스킬)

워크플로우 조율, 병렬 실행, 전문 분석·리뷰를 관리하는 위임형 스킬.

#### 고유 섹션

공통 골격에 더해 Orchestrator 고유 섹션:

| 섹션 | 필수 | 설명 |
|------|------|------|
| `## 에이전트 호출 규칙` | ✅ | 에이전트 FQN, 프롬프트 조립, 모델·툴·금지액션 구체화 규칙 |
| `## 출력 형식` | 권장 | 보고서/출력 텍스트 템플릿 (분석·리뷰 오케스트레이터용) |

#### 에이전트 호출 규칙 작성 가이드

상위 "에이전트 호출 규칙 > 작성 가이드"를 따름.

#### 워크플로우 작성 패턴

- Orchestrator 스킬은 `## 워크플로우` 안에 `### Phase N: {Name}` 패턴으로 순차/병렬 단계를 정의함.
- 모든 Phase에 필요 시 스킬부스팅 명시함: `## 에이전트 호출 규칙 > ### 스킬 부스팅 활용` 참조
  예시: 
  ```
  ### Phase 3: 개발 계획 수립 → Agent: mas-architect (sub_role=graph-designer) (`ralplan` 활용)
  ```

#### 특징
- 완료 조건 검증 필수: "검증 없이 완료 선언 불가" 원칙

#### frontmatter 권장 설정

```yaml
---
name: {skill-name}
description: {skill-description}
type: orchestrator
user-invocable: true
---
```
> **중요**: 사용자가 직접 호출하는 스킬만 user-invocable을 true로 하고 상위 스킬의 워크플로우 일부로만 동작하거나 내부적으로만 사용하는 스킬은 false로 함  
> **주의**: `disable-model-invocation: true` 추가 안함
> name, description, type은 필수

#### Orchestrator 스킬 예시
````
---
name: plan
description: AI 활용 기획 
type: orchestrator
user-invocable: true
---

# Plan 

[PLAN 활성화]

## 목표

사용자 도메인·주제 입력부터 유저스토리 확정까지, STEP 1 기획 7 sub-step을 순차 수행하는 오케스트레이터. 6개 기획 에이전트(problem-analyst → direction-setter → solution-explorer → solution-selector → event-storming-facilitator → user-story-writer)를 순차 위임하여 증거 기반 기획 산출물을 생성함.

## 활성화 조건

사용자가 `/mas-designer:plan` 호출 시 또는 "AI 기획", "문제가설", "방향성 정의", "유저스토리 작성" 키워드 감지 시. core 스킬이 Phase 1에서 위임하는 경로도 동일.

## 에이전트 호출 규칙

### 에이전트 FQN
| 에이전트 | FQN |
|---------|-----|
| problem-analyst | `mas-designer:problem-analyst:problem-analyst` |
| direction-setter | `mas-designer:direction-setter:direction-setter` |

### 프롬프트 조립
- `{DMAP_PLUGIN_DIR}/resources/guides/combine-prompt.md`에 따라 AGENT.md + agentcard.yaml + tools.yaml 합치기
- `Agent(subagent_type=FQN, model=tier_mapping 결과, prompt=조립된 프롬프트)` 호출
- tier → 모델 매핑은 `gateway/runtime-mapping.yaml` 참조

## 워크플로우

### Phase 1: 도메인·주제 수집

{PLUGIN_DIR}/output/{project}/plan/0-input.md에 도메인·주제·핵심 고민을 정리하여 저장.
AskUserQuestion으로 수집하며, 누락 항목 발견 시 재질문.

### Phase 2: 현상문제·근본원인 도출 → Agent: problem-analyst 
- **TASK**: 수집된 도메인·주제에서 대표 현상문제 3개 선정, 5WHY 근본원인, 비즈니스 가치 정의
- **EXPECTED OUTCOME**: `{OUTPUT_DIR}/문제가설.md` + `{OUTPUT_DIR}/비즈니스가치.md`
- **MUST DO**: `references/01-problem-hypothesis-guide.md` 절차 준수, 5WHY 5회 전개, 고객·기업 관점 가치 분리
- **MUST NOT DO**: 해결책 선제시 금지, 가이드 절차 임의 변경 금지
- **CONTEXT**: `{OUTPUT_DIR}/0-input.md` 참조, 필요 시 WebSearch로 업계 사례 조사

{중간 생략}

### Phase 8: STEP 1 완료 보고 (`ulw` 활용)
산출물 체크리스트:
- [ ] 0-input.md / 문제가설.md / 비즈니스가치.md
- [ ] 킹핀문제.md / 문제해결방향성.md
- [ ] 솔루션탐색.md / 솔루션후보.md / 솔루션평가.md / 솔루션우선순위평가.svg / 핵심솔루션.md
- [ ] es/userflow.puml + es/{NN}-*.puml × 5~10
- [ ] userstory.md

사용자에게 STEP 1 완료 보고 + 승인 요청. 승인 시 Router 스킬로 복귀(또는 단독 실행이면 종료).

## 완료 조건
- [ ] Phase 2~7 모두 에이전트 위임 완료
- [ ] 13+ 산출물 파일 존재 확인
- [ ] 사용자 승인 획득

## 상태 정리
각 단계 완료 시 AGENTS.md의 `## 워크플로우 상태 > ### plan` 섹션에서 `마지막 완료 단계`를 기록 

## 재개
마지막 완료된 단계부터 재시작. 이전 산출물이 존재하면 해당 단계는 건너뜀.

1. `AGENTS.md`의 `## 워크플로우 상태 > ### plan` 섹션에서 `마지막 완료 단계`를 읽음  
2. 상태 섹션이 없으면 **Phase 1: 도메인·주제 수집**을 수행
3. 마지막 완료 단계의 다음 단계부터 진행

````

[Top](#skill-표준)

---

### Help 스킬

사용자 도움말을 제공하는 직결형 스킬.

#### 고유 섹션

공통 골격에 더해 Utility 고유 섹션:

| 섹션 | 필수 | 설명 |
|------|------|------|
| `## 사용 안내` | ✅ | 명령어, 자동 라우팅, Quick 가이드 |
| `## 산출물 디렉토리 구조` | ✅ | 수행 결과 산출물의 디렉토리 트리 |

명령어 하단에 "`@{skill-name}`으로 Skill 직접 호출 가능" 반드시 명시  

#### frontmatter 권장 설정

```yaml
---
name: {skill-name}
description: {skill-description}
type: utility
user-invocable: true
---
```

> **중요**: 사용자가 직접 호출하는 스킬만 user-invocable을 true로 하고 상위 스킬의 워크플로우 일부로만 동작하거나 내부적으로만 사용하는 스킬은 false로 함  
> **주의**: `disable-model-invocation: true` 추가 안함
> name, description, type은 필수

#### 예제
Help 스킬은 아래 예제와 같이 최소한으로 구성
````
---
name: help
description: mas-designer 플러그인 사용 안내 (명령 목록·자동 라우팅·기본 플로우)
type: utility
user-invocable: true
---

# Help

[HELP 활성화]

## 목표
사용자 도움말 제공

## 활성화 조건

사용자가 `/mas-designer:help` 호출 시 또는 "mas-designer 도움말", "mas-designer 뭘 할 수 있어" 키워드 감지 시.

## 사용 안내

**중요: 추가적인 파일 탐색이나 에이전트 위임 없이, 아래 내용을 즉시 사용자에게 출력하세요.**

### 명령어

| 명령 | 설명 |
|------|------|
| `/mas-designer:setup` | 플러그인 초기 설정 (의존성 설치, API Key 등록, 모델 확인) |
| `/mas-designer:help` | 사용 안내 (이 화면) |
| `/mas-designer:router` | **전체 파이프라인** 실행 — 기획→설계→PPT→검증 (STEP 경계 승인 3회) |
| `/mas-designer:plan` | STEP 1 기획 단독 — 문제가설·방향성·솔루션·이벤트 스토밍·유저스토리 |
| `/mas-designer:design-mas` | STEP 2 MAS 설계 단독 — LangGraph·Tool/MCP·RAG·멀티모달·에러폴백 |
| `/mas-designer:generate-pptx` | STEP 3 PPT 생성 단독 — spec.md 작성 + 이미지 생성 + pptxgenjs 빌드 |
| `/mas-designer:review` | 최종 독립 검증 — 유저스토리↔설계↔PPT 정합성 |

`@{skill-name}`으로 Skill 직접 호출 가능

### 자동 라우팅 (키워드 감지)

- "AI 기획 도와줘", "멀티에이전트 설계" → `/mas-designer:core`
- "문제가설 정의", "근본원인 분석" → `/mas-designer:plan`
- "MAS 아키텍처 설계", "LangGraph 설계" → `/mas-designer:design-mas`
- "발표 PPT 만들어", "경영진 발표 자료" → `/mas-designer:generate-pptx`
- "산출물 검증", "설계 정합성 확인" → `/mas-designer:review`

### Quick Guide

1. **최초 1회**: `/mas-designer:setup` — 런타임 의존성 설치, Gemini API Key 등록
2. **전체 수행**: `/mas-designer:router` — 도메인·주제 입력 → 프로젝트명 확정 → STEP 1/2/3 순차 수행
3. **단독 실행**: `/mas-designer:{skill-name}` - 해당되는 스킬만 실행 

### 산출물 디렉토리 구조

```
output/{project}/
├── plan/           # STEP 1 기획
├── step2/          # STEP 2 MAS 설계
├── step3/          # STEP 3 PPT 빌드 스크립트·이미지·결과
└── final/          # 최종 패키지
```

````

[Top](#skill-표준)

---

## MUST 규칙

| # | 규칙 | 근거 |
|---|------|------|
| 1 | YAML Frontmatter(name, description) + Markdown Content 구조 유지 | 메타데이터/프롬프트 분리 |
| 2 | H1 타이틀 + 목표 공통 골격 포함 (활성화 조건, 워크플로우는 권장) | 스킬 간 일관성 |
| 3 | 에이전트 위임 시 WHAT+제약만 명시, HOW는 에이전트에 맡김 | 에이전트 자율성 보장 |
| 4 | 워크플로우에서 `→ Agent:` 마커 사용 시 5항목, `→ Skill:` 마커 사용 시 3항목 포함 | 위임 품질 보장 |
| 5 | 라우팅/분기 로직은 상세히, 에이전트 위임은 간결하게 | 프롬프트 깊이 차등화 |
| 6 | 섹션명 한글 표준명 사용 (목표, 활성화 조건, 워크플로우) | 스킬 간 일관성 |
| 7 | Orchestrator 스킬: 프롬프트 구성 순서를 공통 정적 → 에이전트별 정적 → 동적 순서로 배치 | prefix 캐시 최적화 |

[Top](#skill-표준)

---

## MUST NOT 규칙

| # | 금지 사항 | 이유 |
|---|----------|------|
| 1 | 스킬이 직접 애플리케이션 코드 작성·수정·삭제 (직결형 스킬의 설정 파일·문서 작업은 예외) | 에이전트 역할 침범 |
| 2 | 에이전트 위임 시 내부 사고 방식·단계별 절차 기술 | 에이전트 자율성 저해 |
| 3 | `→ Agent:` 위임 시 5항목, `→ Skill:` 위임 시 3항목 외 추가 기술 | 간결 원칙 위반 |
| 4 | 비표준 섹션명 사용 (Overview 대신 목표 사용) | 일관성 저해 |

[Top](#skill-표준)

---

## 검증 체크리스트
- [ ] Frontmatter에 name, description, type 포함
- [ ] H1 타이틀 존재
- [ ] 목표 섹션 존재
- [ ] 유형에 맞는 고유 섹션 포함
- [ ] 실행 경로가 유형에 맞는가 (위임형: Router/Orchestrator, 직결형: Setup/Help)
- [ ] 위임형 스킬: `→ Agent:` 마커가 있는 워크플로우 단계에 5항목이 포함되는가
- [ ] 위임형 스킬: `→ Skill:` 마커가 있는 워크플로우 단계에 3항목이 포함되는가
- [ ] 직결형 스킬: Agent 위임 없이 Gateway 도구를 직접 사용하는가 (YAGNI)
- [ ] 직결형 스킬: 애플리케이션 코드 작성·수정을 하지 않는가 (설정 파일·문서만 허용)
- [ ] 위임 프롬프트에 HOW(방법) 없이 WHAT(목표)+제약만 기술했는가
- [ ] 라우팅 로직은 상세하게, 위임은 간결하게 작성했는가
- [ ] Router 스킬: 워크플로우가 라우팅 전용인가 (실행 Phase 없음)
- [ ] Setup 스킬: `disable-model-invocation: true`를 사용하지 않았는가 (사용 시 스킬 로드 불가)
- [ ] 섹션명이 한글 표준명을 사용하는가 (목표, 활성화 조건, 워크플로우)
- [ ] commands/ 진입점 파일 작성 (슬래시 명령 노출 시)
- [ ] Orchestrator 스킬: 에이전트 호출 규칙 섹션 포함
- [ ] Orchestrator 스킬: 완료 조건, 상태 정리, 재개 섹션 포함
- [ ] Orchestrator 스킬: 프롬프트 구성 순서가 공통 정적 → 에이전트별 정적 → 동적 순서인가

[Top](#skill-표준)
