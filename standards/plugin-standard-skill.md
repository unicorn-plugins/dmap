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
| 위임형 | 지휘자스킬 | Orchestrator | 워크플로우 조율, 병렬 실행, 분석, 리뷰 | analyze |
| 직결형 | 설정스킬 | Setup | 설치 · 설정 마법사 제공 | setup |
| 직결형 | 도움말스킬 | Help | 사용 도움말 제공 | help |

### 스킬 수 지침
- 설정, 도움말 스킬은 플러그인 당 1개만 생성
- 지휘자스킬은 플러그인의 수행 업무에 따라 N개 이상 생성 
- 라우터 스킬은 지휘자스킬이 2개 이상일때 생성

### 위임 규정

스킬은 유형에 따라 아래와 같은 위임 규정을 반드시 준수   

| 유형 | 의미 | 위임 |
|----------|------|----------|
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
| `type` | ✅ | 스킬 유형 | router / setup / orchestrator / help 중 하나 |
| `user-invocable` | 선택 | 사용자 직접 호출 가능 여부 (기본값: true) | `true` |
| `disable-model-invocation` | 선택 | 런타임 자동 호출 차단. **주의: `true` 설정 시 스킬 로드 자체가 안 되므로 사용 금지** | `false` |
| `allowed-tools` | 선택 | 허용 도구 목록 | `["Read", "Agent"]` |
| `model` | 선택 | 기본 모델 | `sonnet` |
| `context` | 선택 | 컨텍스트 힌트 | `["code-quality"]` |

### Markdown Content 골격

| 순서 | 표준 섹션명 | 필수 | 설명 |
|------|------------|------|------|
| 1 | `# {스킬명}` | 필수 | 스킬명 |
| 2 | `[{스킬명} 활성화]` | 선택 | 스킬 시작 시 화면에 출력하는 메시지 |
| 3 | `## 목표` | 필수 | 이 스킬이 달성하려는 핵심 목적 |
| 4 | `## 활성화 조건` | 필수 | 이 스킬이 활성화되는 조건 · 상황 (자기 선언) |
| 5 | `## 작업 환경 변수 로드` | 조건부 필수 | 환경변수로딩. Router, Orchestrator, Setup 유형 스킬 필수 |
| 6 | `## 에이전트 호출 규칙` | 조건부 필수 | 서브 에이전트 호출 규칙. Orchestrator 유형 스킬 필수 |
| 7 | `## 진행상황 업데이트 및 재개` | 조건부 필수 | AGENTS.md에 기록.  Orchestrator, Setup 유형 스킬 필수 |
| 8 | `## 워크플로우` | 조건부 필수 | 워크플로우 / 단계별 수행 지침. Router, Orchestrator, Setup 유형 스킬 필수 |
| 9 | `## 완료 조건` | 조건부 필수 | 스킬 완료 체크 리스트. Router, Orchestrator, Setup 유형 스킬 필수 |
| 10 | `## 상태 정리` | 권장 | 임시 파일 삭제 등 정리 작업 |

(중요) 라우터 스킬은 '진행상황 업데이트 및 재개' 섹션 비대상  
(중요) Help 스킬은 "공통 골격 중 목표/활성화 조건만 필요, 진행상황 업데이트 및 재개 등 나머지 비대상" 

(중요) 동일 목적의 섹션은 표준명 사용 필수:
예시: 
```
| 목적 | 표준명 | 비권장 (혼용 사례) |
|------|--------|-------------------|
| 핵심 목적 | `## 목표` | Overview, What It Does, Core Concept, 개요 |
| 활성화 조건 | `## 활성화 조건` | Activation, When to Use, Magic Keywords |
| 워크플로우 | `## 워크플로우` | Workflow, Phases, Approach, Step N |
| 에이전트 호출 규칙 | `## 에이전트 호출 규칙` | - |
```

[Top](#skill-표준)

---

## 섹션별 작성 가이드 

### 활성화 조건
아래 직접 활성화와 Router 경유 활성화 조건을 기술함

| 경로 | 흐름 | 설명 |
|------|------|------|
| **직접 활성화** | 런타임 → 특정 스킬 | 슬래시 명령(`/plugin:skill`) 또는 자연어 매칭(frontmatter description 기반) |
| **Router 경유 활성화** | 런타임 → Router → 특정 스킬 | 모호한 사용자 요청에 대해 Router 스킬이 요청의 의도를 판별하고 적절한 스킬로 라우팅  |

[Top](#skill-표준)

---

### 작업 환경 변수 로드 
Router, Orchestrator 스킬 유형은 아래 지침 기술함
```
AGENTS.md 파일에서 `## 환경변수`섹션의 환경변수 로딩. 로딩 실패 시 사용자에게 Setup 스킬을 먼저 수행하라고 안내하고 종료
```  

Setup 스킬은 순환 참조를 방지하기 위해 아래 문구 사용함   
```
AGENTS.md 파일에서 `## 환경변수`섹션의 환경변수 로딩. 로딩 실패 시에도 계속 진행
```  

[Top](#skill-표준)

---

### 에이전트 호출 규칙

Orchestrator 유형 스킬이 `Agent` 도구로 에이전트를 호출할 때의 규칙.

아래 3가지 서브 섹션으로 구성:
```
### 에이전트 FQN

### 프롬프트 조립

### 서브 에이전트 호출
```

#### 에이전트 FQN
런타임이 `agents/` 디렉토리를 재귀 탐색하여 자동 생성하는 전체 이름을 작성 예시와 같은 형식으로 작성   

| 형식 | 예시 |
|------|------|
| `{plugin}:{에이전트명}:{에이전트명}` | `abra:architect:architect` |

> 두 {에이전트명}은 반드시 동일. 첫 번째는 디렉토리명, 두 번째는 AGENT.md의 frontmatter-name

작성 예시:  
```
### 에이전트 FQN

| 에이전트 | FQN |
|----------|-----|
| scenario-analyst | `abra:scenario-analyst:scenario-analyst` |
```

#### 프롬프트 조립
`resources/guides/combine-prompt.md`을 수행하여 프롬프트 조립 
이 파일이 없는 경우 `{DMAP_PLUGIN_DIR}/resources/guides/combine-prompt.md`을 `{PLUGIN_DIR}/resources/guides/combine-prompt.md`에 복사하고 수행  

작성 예시:  
```
### 프롬프트 조립
- `resources/guides/combine-prompt.md`에 따라 AGENT.md + agentcard.yaml + tools.yaml 합치기
- `Agent(subagent_type=FQN, model=tier_mapping 결과, prompt=조립된 프롬프트)` 호출
- tier → 모델 매핑은 `{ABRA_PLUGIN_DIR}/gateway/runtime-mapping.yaml` 참조
```

(중요) 프롬프트 캐싱을 위해 프롬프트 구성 순서를 반드시 공통 정적 → 에이전트별 정적 → 동적 순서로 배치

#### 서브 에이전트 호출
아래 서브 섹션을 추가하여 반드시 서브 에이전트를 수행하도록 강제  
```
### 서브 에이전트 호출
워크플로우 단계에 `Agent: {agent-name}`이 명시된 경우,
메인 에이전트는 해당 단계를 직접 수행하지 않고,
반드시 위 프롬프트 조립 규칙에 따라 해당 에이전트를 호출하여 결과를 받아야 함.

서브에이전트 호출 없이 메인 에이전트가 해당 산출물을 직접 작성하면
스킬 미준수로 간주함.
```

[Top](#skill-표준)

---

### 진행상황 업데이트 및 재개
아래 지침을 기입함.  

````
## 진행상황 업데이트 및 재개
`{PLUGIN_DIR}/AGENTS.md`에 각 Phase 완료 시 `{skill-name}: {완료된 Phase}`형식으로 저장. 최종 완료 시 'Done'으로 표기.   
```
## 워크플로우 진행상황
- scenario: Phase3
```
진행상황 정보가 있는 경우 마지막 완료 단계 이후부터 자동 재개 
````

[Top](#skill-표준)

---

### 워크플로우
Router와 Orchestrator 유형 스킬은 **라우터(Router)와 지휘자(Orchestrator)** 역할에 집중함.
직접 작업을 수행하는 것이 아니라, 요청을 분석하고 적절한 에이전트에게 위임하는 것이 핵심 역할임.

| 스킬 수행 유형 | 역할 | 
|---------------|----------------------|
| 직접 수행 | 요청 의도 분류, 워크플로우 분기 결정, 사용자 상호작용 (질문, 안내), 상태 관리 (진행률, 반복 카운트), 에이전트 결과 취합·보고, AI 런타임 직접 수행 필요 작업 |
| 에이전트 위임 | 코드 작성·수정, 탐색·분석·조사, 문서 작성, 검증·테스트, 설계·아키텍처 결정 |
| 스킬 라우팅 | 다른 스킬로 전환 |

**AI 런타임 직접 수행 필요 작업**: AI 런타임이 직접 수행하는게 더 나은 품질을 보장하는 작업  
- MS 오피스 문서 작성 
  
#### 프롬프트 깊이 차등화
**핵심**: 위임형 스킬 프롬프트가 에이전트의 작업 방법까지 상세히 기술하면 에이전트의 자율성이 떨어지고
유지보수 비용이 증가함. **"무엇을 달성할 것인가"**에 집중하고, **"어떻게 달성할 것인가"**는 에이전트에 맡김.

#### 위임 표기법 (Delegation Notation)
워크플로우 단계에서 Agent 또는 Skill에 위임할 때, **단계 제목에 마커**를 붙여 위임을 선언함.
마커가 있는 단계는 해당 위임 유형의 필수 항목을 본문에 반드시 포함해야 함.

**마커 형식:**
| 마커 | 의미 | 필수 항목 | 도구 |
|------|------|----------|------|
| `→ Agent: {name}` | Agent에 작업 위임 | 5항목 | Agent |
| `→ Skill: {name}` | 다른 Skill에 위임 | 3항목 | Skill |

##### 서브 역할 표시  
Agent 호출 시 서브 역할만 필요한 경우 아래와 같이 sub_role을 지정함  
```
→ Agent: mas-architect (sub_role=graph-designer) (`ralplan` 활용)
```

##### 스킬 부스팅 활용  
아래 유즈케이스 작업에 대해 스킬 부스팅 사용(스킬부스팅이 사용 가능할 때)  

| 유즈케이스 | 추천 스킬 부스팅 |
|----------------|----------|
| 개발 계획 수립 | `/ralplan` |
| 기능 구현 | `/ralph` |
| QA/검증 | `/ultraqa` |
| 보안 검토 | `/security-review` |

아래 형식으로 Agent 정의 뒤의 괄호안에 명시함.   
```
Agent: {서브에이전트 정의} (`{스킬 부스팅 이름}` 활용)
```

예시: 
```
### Phase 3: 개발 계획 수립 → Agent: mas-architect (sub_role=graph-designer) (`ralplan` 활용)
```

> **직결형 스킬 미사용**: 직결형 스킬은 스킬부스팅 사용 안함
  
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

### Step 3: 구현 → Agent: executor (`ralph` 활용)
- **TASK**: Step 2의 분석 결과를 기반으로 기능 구현
- **EXPECTED OUTCOME**: 컴파일 에러 없는 구현 코드
- **MUST DO**: 기존 패턴과 일관성 유지
- **MUST NOT DO**: 요청 범위 외 리팩터링 금지
- **CONTEXT**: Step 2의 탐색 결과 참조

### Step 4: QA 전환 → Skill: ultraqa (`ultraqa` 활용)
- **INTENT**: 구현 완료 후 QA 사이클 진입
- **ARGS**: 구현된 파일 목록, 테스트 대상
- **RETURN**: 모든 테스트 통과 시 완료
```

[Top](#skill-표준)

---

## 유형별 필수/권장 섹션

### Router (라우터스킬)

항상 활성화되어 모호한 사용자 요청의 의도를 판별하여 적절한 스킬로 라우팅 

#### 고유 섹션
없음

#### 워크플로우 작성 패턴

Router 스킬의 `## 워크플로우`는 **라우팅 전용**으로 구성됨.
매 메시지마다 요청 의도를 감지하고 적절한 스킬로 분배하는 흐름을 정의함.

**라우팅 워크플로우 구성:**

| 단계 | 이름 | 설명 |
|------|------|------|
| 1 | 의도 감지 (Intent Detection) | 요청을 분류하는 규칙 정의 (키워드 매칭, 패턴 분석 등) |
| 2 | 스킬 매칭 (Skill Matching) | 분류된 의도를 어떤 스킬에 라우팅할지 조건 테이블로 정의 |
| 3 | 위임 (Dispatch) | 매칭된 스킬에 `→ Skill:` 마커로 위임. 미매칭 시 기본 동작 정의 |

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

## 작업 환경 변수 로드 
AGENTS.md 파일에서 `## 환경변수`섹션의 환경변수 로딩. 로딩 실패 시 사용자에게 Setup 스킬을 먼저 수행하라고 안내하고 종료.  

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
완료 시 임시 생성 파일 삭제  

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
최초 수행하는 스킬이므로 환경변수 셋팅 작업을 워크플로우의 첫단계에서 반드시 수행  
아래 예시에서 `### Phase 0: 환경변수 셋팅` 참조하여 작성   

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

## 작업 환경 변수 로드 
AGENTS.md 파일에서 `## 환경변수`섹션의 환경변수 로딩. 로딩 실패 시에도 계속 진행

## 진행상황 업데이트 및 재개
`{PLUGIN_DIR}/AGENTS.md`에 각 Phase 완료 시 저장. 최종 완료 시 'Done'으로 표기.   
```
## 워크플로우 진행상황
- setup: Phase3
```
진행상황 정보가 있는 경우 마지막 완료 단계 이후부터 자동 재개 

## 워크플로우
### Phase 0: 환경변수 셋팅
- 플러그인 디렉토리 생성 확인
  사용자에게 AskUserQuestion으로 현재 디렉토리가 플러그인 디렉토리 루트인지 물어보고 아닌 경우    
  플러그인 디렉토리를 생성하고 그 디렉토리로 이동 후 다시 수행하라고 안내하고 종료     

  사용자가 'YES'로 답한 경우 현재 디렉토리 경로를 변수 `{PLUGIN_DIR}`에 셋팅   

- DMAP 플러그인 디렉토리 경로 설정 
  `{PLUGIN_DIR}/AGENTS.md` 파일에 `{DMAP_PLUGIN_DIR}` 변수가 설정되어 있는지 확인함.
  미설정 시 아래 수행 
  사용자에게 DMAP 플러그인 디렉토리 경로를 입력받음(경로명은 `~/path1/path2` 형식으로 안내)   
  <!--ASK_USER-->
  {"title":"{플러그인 이름} 플러그인 디렉토리","questions":[
    {"question":"{플러그인 이름} 플러그인 디렉토리 경로를 입력해주세요.","type":"text"}
  ]}
  <!--/ASK_USER-->

- AGENTS.md에 환경변수 저장
  ```
  ## 환경변수
  - AI_RUNTIME: 현재 구동중인 런타임(Claude Code, Claude Cowork, Cursor, Antigravity, Codex 등)
  - PLUGIN_DIR: `{PLUGIN_DIR}`
  - DMAP_PLUGIN_DIR: `{DMAP_PLUGIN_DIR}`
  ```
- AI Runtime이 Claude Code 또는 Claude Cowork인 경우 `{PLUGIN_DIR}/CLAUDE.md` 생성하고 아래 내용 저장  
  ```
  @AGENTS.md
  ```  

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
| `## 에이전트 호출 규칙` | 필수 | 에이전트 FQN, 프롬프트 조립, 모델·툴·금지액션 구체화 규칙 |
| `## 출력 형식` | 권장 | 보고서/출력 텍스트 템플릿 (분석·리뷰 오케스트레이터용) |

#### 에이전트 호출 규칙 작성 가이드

상위 "## 섹션별 작성 가이드 > ### 에이전트 호출 규칙"을 따름.
(중요) '## 에이전트 호출 규칙 > ### 서브 에이전트 호출' 문구 반드시 포함  

#### 워크플로우 작성 패턴
- Orchestrator 스킬은 `## 워크플로우` 안에 `### Phase N: {Name}` 패턴으로 순차/병렬 단계를 정의함.

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
name: scenario
description: 요구사항 시나리오 생성 및 선택 
user-invocable: true
type: orchestrator
---

# Scenario

[SCENARIO 스킬 활성화]

## 목표

비즈니스 요구사항을 N개의 구조화된 시나리오로 변환하고 사용자가 하나를 선택하도록 함.
STEP 1: 시나리오 생성 및 선택 단계를 담당.

## 활성화 조건

다음 키워드 감지 시 자동 활성화:
- "시나리오 생성", "요구사항 생성", "요구사항 정의"
- "시나리오 만들어", "요구사항 만들어"

또는 `/abra:scenario` 명령 호출 시.

## 작업 환경 변수 로드 
AGENTS.md 파일에서 `## 환경변수`섹션의 환경변수 로딩. 로딩 실패 시 사용자에게 Setup 스킬을 먼저 수행하라고 안내하고 종료.  

## 에이전트 호출 규칙

### 에이전트 FQN

| 에이전트 | FQN |
|----------|-----|
| scenario-analyst | `abra:scenario-analyst:scenario-analyst` |

### 프롬프트 조립
- `{ABRA_PLUGIN_DIR}/resources/guides/combine-prompt.md`에 따라 AGENT.md + agentcard.yaml + tools.yaml 합치기
- `Agent(subagent_type=FQN, model=tier_mapping 결과, prompt=조립된 프롬프트)` 호출
- tier → 모델 매핑은 `{ABRA_PLUGIN_DIR}/gateway/runtime-mapping.yaml` 참조

### 서브 에이전트 호출
워크플로우 단계에 `Agent: {agent-name}`이 명시된 경우,
메인 에이전트는 해당 단계를 직접 수행하지 않고,
반드시 위 프롬프트 조립 규칙에 따라 해당 에이전트를 호출하여 결과를 받아야 함.

서브에이전트 호출 없이 메인 에이전트가 해당 산출물을 직접 작성하면
스킬 미준수로 간주함.

## 진행상황 업데이트 및 재개
`{PLUGIN_DIR}/AGENTS.md`에 각 Phase 완료 시 저장. 최종 완료 시 'Done'으로 표기.   
```
## 워크플로우 진행상황
- scenario: Phase3
```
진행상황 정보가 있는 경우 마지막 완료 단계 이후부터 자동 재개 

## 워크플로우
### Phase 0: 입력 수집 

Step1. 사용자 요청 정보 수집: 
사용자에게 아래 양식을 제공하고 입력 요청   
```
생략
```

Step2. AskUserQuestion 생성할 비즈니스 시나리오 갯수 요청:
| 항목 | 필수 | 기본값 | 설명 |
|------|:----:|--------|------|
| 생성 갯수 | 선택 | 3 | 생성할 시나리오 버전 수 (1~5 권장) |

### Phase 1: 시나리오 생성 → Agent: scenario-analyst

scenario-analyst 에이전트에 위임:

- **TASK**: 서비스 목적을 기반으로 N개의 요구사항 시나리오 자동 생성. 각 시나리오는 서로 다른 관점(업무자동화, 고객경험, 비용절감, 의사결정 지원, 협업효율화)으로 작성
- **EXPECTED OUTCOME**: 각 시나리오에 8개 섹션(서비스개요, 사용자시나리오, 에이전트역할, 워크플로우설계, 외부도구, AI지시사항, 품질요구사항, 검증시나리오) 포함 + 버전 간 비교표 포함한 마크다운 문서
- **MUST DO**: 다양한 관점(업무자동화, 고객경험, 비용절감, 의사결정, 협업효율화) 반영, 비즈니스 용어 사용(기술 용어 최소화), 각 시나리오 차별화(서비스명, 우선순위, 품질 지표), 사용자 제공 외부 기능 요구사항을 시나리오에 우선 반영, 각 기능에 대해 구현 방식은 명시하지 않고 기능 수준으로만 기술
- **MUST NOT DO**: 사용자에게 직접 질문 금지, 시나리오 선택 금지, DSL 생성 금지
- **CONTEXT**: 서비스 목적: `{service_purpose}`, 사업 배경 및 맥락: `{domain_context}`, 세부 요구사항: `{requirement}`, 외부 기능 연동 요건: `{external_capabilities}`, 참고 자료: `{references}`, 생성 갯수: `{count}`


## 완료 조건
- [ ] N개 시나리오 생성 완료
- [ ] 각 시나리오에 8개 섹션 포함
- [ ] 버전 간 비교표 포함
- [ ] 사용자 선택 완료
- [ ] scenario.md 파일 저장 완료

## 상태 정리
임시 생성 파일 삭제  

````

[Top](#skill-표준)

---

### Help 스킬

사용자 도움말을 제공하는 직결형 스킬.

#### 고유 섹션

예제를 참고하여 최소한으로 구성. 아래 Help 스킬 고유 섹션 포함함:
(중요) Help 스킬은 "공통 골격 중 목표/활성화 조건만 필요, 나머지 비대상"   

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
type: help
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
type: help
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

- "AI 기획 도와줘", "멀티에이전트 설계" → `/mas-designer:router`
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
| 1 | YAML Frontmatter(name, description, type) + Markdown Content 구조 유지 | 메타데이터/프롬프트 분리 |
| 2 | H1 타이틀 + 목표 + 활성화 조건은 모든 스킬 필수, 워크플로우는 유형별 조건부 필수 | 스킬 간 일관성 |
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
| 3 | 비표준 섹션명 사용 (Overview 대신 목표 사용) | 일관성 저해 |

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
- [ ] Setup 스킬: `disable-model-invocation: true`를 사용하지 않았는가 (사용 시 스킬 로드 불가)
- [ ] 섹션명이 한글 표준명을 사용하는가 (목표, 활성화 조건, 워크플로우)
- [ ] Orchestrator 스킬: 에이전트 호출 규칙 섹션 포함
- [ ] Orchestrator 스킬: 완료 조건, 상태 정리 포함
- [ ] Orchestrator 스킬: 프롬프트 구성 순서가 공통 정적 → 에이전트별 정적 → 동적 순서인가
- [ ] Help 스킬 검증 항목: ## 사용 안내, ## 산출물 디렉토리 구조 포함 여부
- [ ] Setup 스킬: 진행상황 업데이트 및 재개 섹션 포함

[Top](#skill-표준)
