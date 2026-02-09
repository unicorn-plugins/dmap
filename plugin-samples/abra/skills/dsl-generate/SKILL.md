---
name: dsl-generate
description: Dify DSL 자동생성 (STEP 2)
user-invocable: true
---

# DSL Generate

[DSL-GENERATE 활성화]

## 목표

선택된 시나리오 문서를 기반으로 Dify Workflow DSL(YAML)을 자동 생성함.
DSL 구조 검증을 통과한 유효한 파일을 산출하며, 에러 발생 시 수정 루프를 통해 자동 복구함.

## 활성화 조건

- "DSL 생성", "워크플로우 DSL", "YAML 만들어", "dsl-generate" 키워드 감지 시
- `/abra:dsl-generate` 명령 호출 시

## 에이전트 호출 규칙

### 에이전트 FQN

| 에이전트 | FQN |
|----------|-----|
| dsl-architect | `abra:dsl-architect:dsl-architect` |

### 프롬프트 조립

1. `agents/dsl-architect/` 에서 3파일 로드 (AGENT.md + agentcard.yaml + tools.yaml)
2. `gateway/runtime-mapping.yaml` 참조하여 구체화:
   - **모델 구체화**: agentcard.yaml의 `tier: HIGH` → `tier_mapping`에서 `claude-opus-4-6` 결정
   - **툴 구체화**: tools.yaml의 추상 도구 → `tool_mapping`에서 실제 도구 결정
     - `file_read` → builtin `Read`
     - `file_write` → builtin `Write`
     - `dsl_validation` → custom `validate_dsl.py`
   - **금지액션 구체화**: agentcard.yaml의 `forbidden_actions: ["code_execute", "network_access", "file_delete"]` → `action_mapping`에서 제외할 도구 결정
     - `code_execute` → `Bash` 제외
     - `network_access` → `WebFetch`, `WebSearch` 제외
     - `file_delete` → `Bash(rm)` 제외
   - **최종 도구** = (Read, Write, validate_dsl) - (제외 도구)
3. 프롬프트 조립: AGENT.md + agentcard.yaml + tools.yaml을 합쳐 하나의 프롬프트로 구성
   - **구성 순서**: 공통 정적(runtime-mapping) → 에이전트별 정적(3파일) → 동적(작업 지시)
4. `Task(subagent_type="abra:dsl-architect:dsl-architect", model="opus", prompt=조립된 프롬프트)` 호출

## 워크플로우

### Phase 0: 입력 확인

scenario.md 파일 존재 여부를 확인함.

- **존재**: Phase 1로 진행
- **없음**: scenario 스킬로 위임 (`/abra:scenario`)

### Phase 1: DSL 생성 → Agent: dsl-architect

- **TASK**: 시나리오 문서를 기반으로 Dify Workflow DSL(YAML) 생성 및 사전 검증
- **EXPECTED OUTCOME**: `validate_dsl` 검증을 통과한 유효한 DSL YAML 파일 + DSL 구조 설명서
- **MUST DO**:
  - `references/dsl-generation-prompt.md` 프롬프트 템플릿 활용
  - `references/dify-workflow-dsl-guide.md` DSL 작성 가이드 준수
  - 생성 후 `{tool:dsl_validation}`으로 반드시 사전 검증
  - 노드 설계 (Start → LLM/Tool/IF-ELSE → End)
  - 엣지 연결 및 변수 흐름 정의
  - 프롬프트 템플릿 작성
- **MUST NOT DO**:
  - Dify 실행 금지 (프로토타이핑은 별도 STEP)
  - 시나리오 수정 금지
  - 사용자에게 직접 질문 금지
- **CONTEXT**:
  - 시나리오 파일: `output/scenario.md` (기본값)
  - 출력 위치: `output/{app-name}.dsl.yaml`
  - references 경로: `agents/dsl-architect/references/`

### Phase 2: DSL 검증 루프

생성된 DSL 파일에 대해 검증을 수행함.

#### 검증 절차

1. `validate_dsl` 도구로 DSL YAML 파일 검증
2. 검증 결과 판정:
   - **PASS**: Phase 3로 진행
   - **FAIL**: 에러 항목 분석 → DSL 수정 → 재검증 (Phase 2 반복)

#### 에러 수정 루프

```
validate_dsl → [FAIL?] → 에러 분석 → DSL 수정 → validate_dsl → [PASS] → Phase 3
                ↑_______________________________________________|
```

최대 3회 반복. 3회 초과 시 사용자에게 보고하고 중단.

### Phase 3: 결과 보고

DSL 파일 생성 완료를 사용자에게 보고함.

**보고 내용:**
- DSL 파일 경로
- DSL 구조 설명서
- 다음 단계 안내: `/abra:prototype` (프로토타이핑)

## 완료 조건

- [ ] DSL YAML 파일 생성 완료
- [ ] validate_dsl 검증 통과
- [ ] DSL 구조 설명서 출력 완료

## 검증 프로토콜

완료 전 검증:
- DSL 파일이 `output/` 디렉토리에 존재하는지 확인
- validate_dsl 검증 결과가 PASS인지 확인
- DSL 구조 설명서가 출력되었는지 확인

## 상태 정리

완료 시 임시 파일 없음. 상태 파일 미사용.

## 취소

사용자가 "cancelomc" 또는 "stopomc" 키워드 입력 시 즉시 중단.

## 재개

DSL 파일이 이미 존재하는 경우, 검증 단계(Phase 2)부터 재개 가능.
사용자에게 기존 파일 사용 여부를 확인 후 진행.

## 스킬 부스팅

이 스킬은 오케스트레이션 스킬을 직접 활용하지 않음.
dsl-architect 에이전트가 자체 워크플로우(AGENT.md)로 DSL 생성 및 검증을 완료함.
