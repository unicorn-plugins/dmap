---
name: prototype
description: Dify 프로토타이핑 자동화 (STEP 3)
user-invocable: true
---

# Prototype

[PROTOTYPE 스킬 활성화]

## 목표

DSL을 Dify에 Import → Publish → Run → Export하여 프로토타이핑을 수행함.
에러 발생 시 DSL 수정 → 재검증 → 재시도 루프를 자동 실행하여 검증 완료된 DSL을 확보함.

## 활성화 조건

다음 키워드 감지 시 또는 `/abra:prototype` 호출 시:
- "프로토타이핑", "프로토타입", "Dify 업로드", "Dify 실행", "Dify 테스트"

## 에이전트 호출 규칙

### 에이전트 FQN

| 에이전트 | FQN |
|----------|-----|
| prototype-runner | `abra:prototype-runner:prototype-runner` |

### 프롬프트 조립

1. `agents/prototype-runner/` 에서 3파일 로드 (AGENT.md + agentcard.yaml + tools.yaml)
2. `gateway/runtime-mapping.yaml` 참조하여 구체화:
   - **모델 구체화**: agentcard.yaml의 `tier: MEDIUM` → `tier_mapping`에서 `claude-sonnet-4-5` 결정
   - **툴 구체화**: tools.yaml의 추상 도구 → `tool_mapping`에서 실제 도구 결정
     - `file_read` → builtin `Read`
     - `file_write` → builtin `Write`
     - `dsl_validation` → custom `validate_dsl`
     - `dify_app_management` → custom `dify_cli.py` (list, export)
     - `dify_dsl_management` → custom `dify_cli.py` (import, update, export)
     - `dify_workflow_management` → custom `dify_cli.py` (publish, run)
   - **금지액션 구체화**: agentcard.yaml의 `forbidden_actions: [file_delete, network_access, user_interact]` → `action_mapping`에서 제외할 실제 도구 결정
     - `file_delete` → `Bash(rm)` 제외
     - `network_access` → `WebFetch`, `WebSearch` 제외
     - `user_interact` → `AskUserQuestion` 제외
   - **최종 도구** = (구체화된 도구) - (제외 도구)
3. 3파일을 합쳐 하나의 프롬프트로 조립
   - **프롬프트 구성 순서**: 공통 정적(runtime-mapping) → 에이전트별 정적(3파일) → 동적(작업 지시)
4. `Task(subagent_type="abra:prototype-runner:prototype-runner", model="sonnet", prompt=조립된 프롬프트)` 호출

## 워크플로우

### Phase 0: 입력 확인

DSL 파일 존재 확인.
- 있음 → Phase 1 진행
- 없음 → dsl-generate 스킬로 위임

### Phase 1: 프로토타이핑 실행 → Agent: prototype-runner

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

### Phase 2: 결과 확인 및 보고

검증된 DSL 파일 확인, 실행 결과 사용자 보고:
- Dify 앱 ID
- 최종 상태 (성공/실패)
- 에러 수정 횟수
- Export된 DSL 파일 경로

## 완료 조건

- [ ] Dify import 성공
- [ ] publish 성공
- [ ] run 성공 (에러 0)
- [ ] export로 검증된 DSL 확보

## 검증 프로토콜

run 성공 확인 + export 파일 존재 확인.

## 상태 정리

완료 시 임시 파일 없음.

## 취소

사용자 요청 시 즉시 중단. Dify에 생성된 앱은 수동 삭제 안내.

## 재개

Dify 앱 존재 시 publish/run 단계부터 재개 가능.

## 스킬 부스팅

이 스킬은 오케스트레이션 스킬을 활용하지 않음 (단일 에이전트 위임, 반복 루프는 에이전트 자체 워크플로우로 충분).
