---
name: develop
description: AI Agent 개발 및 배포 (STEP 5)
user-invocable: true
---

# Develop

[DEVELOP 스킬 활성화 — STEP 5: AI Agent 개발]

## 목표

개발계획서에 따라 AI Agent를 구현하고 배포 가능한 상태로 만듦.
Option A(Dify 런타임 활용) 또는 Option B(코드 기반 전환) 방식을 사용자가 선택하며,
빌드 성공, 테스트 통과, 산출물 보고까지 전체 개발 프로세스를 완료함.

## 활성화 조건

- "코드 개발해줘", "Agent 구현", "구현해줘" 키워드 감지 시
- 사용자가 `/abra:develop` 명령 호출 시

## 에이전트 호출 규칙

### 에이전트 FQN

| 에이전트 | FQN |
|----------|-----|
| agent-developer | `abra:agent-developer:agent-developer` |

### 프롬프트 조립

1. `agents/agent-developer/` 에서 3파일 로드
   - AGENT.md (프롬프트 본문)
   - agentcard.yaml (tier, capabilities, handoff)
   - tools.yaml (추상 도구 선언)
2. `gateway/runtime-mapping.yaml` 참조하여 구체화:
   - **모델 구체화**: agentcard.yaml의 `tier: HIGH` → `tier_mapping`에서 `claude-opus-4-6` 결정
   - **툴 구체화**: tools.yaml의 추상 도구 → `tool_mapping`에서 실제 도구 결정
     - `file_read` → builtin Read
     - `file_write` → builtin Write
     - `code_execute` → builtin Bash
     - `code_search` → lsp: lsp_workspace_symbols
     - `code_diagnostics` → lsp: lsp_diagnostics, lsp_diagnostics_directory
     - `dify_dsl_management` → custom: tools/dify_cli.py (import, update, export)
     - `dify_workflow_management` → custom: tools/dify_cli.py (publish, run)
   - **금지액션 구체화**: agentcard.yaml의 `forbidden_actions: ["user_interact"]` → `action_mapping`에서 AskUserQuestion 제외
   - **최종 도구** = (구체화된 도구) - (AskUserQuestion)
3. 3파일을 합쳐 하나의 프롬프트로 조립
   - **구성 순서**: 공통 정적(runtime-mapping) → 에이전트별 정적(AGENT.md + agentcard.yaml + tools.yaml) → 동적(작업 지시)
4. `Task(subagent_type="abra:agent-developer:agent-developer", model="opus", prompt=조립된 프롬프트)` 호출

## 워크플로우

### Phase 0: 입력 확인

개발계획서(`dev-plan.md`) + 검증된 DSL(`{app-name}.dsl.yaml`) 존재 확인.

**미존재 시 조치:**
- dev-plan.md 없음 → `/abra:dev-plan` 스킬로 위임
- DSL 파일 없음 → `/abra:dsl-generate` 스킬로 위임

### Phase 1: 개발 방식 선택

AskUserQuestion으로 개발 방식 선택:

**선택지:**
- **Option A**: Dify 런타임 활용
  - DSL을 Dify에 Import → 환경 설정 → Publish → API 테스트
  - 장점: 빠른 배포, Visual Builder로 유지보수 용이
  - 적합: 프로토타입을 그대로 프로덕션 환경에 배포하는 경우
- **Option B**: 코드 기반 전환
  - DSL 구조를 참조하여 LangChain/LangGraph 등으로 코드 구현
  - 장점: 세밀한 제어, 확장성, CI/CD 통합
  - 적합: 복잡한 로직, 기존 시스템 통합, 독립 배포가 필요한 경우

### Phase 2-A: Dify 런타임 활용 (Option A 선택 시)

#### Step 1: Import
- `python gateway/tools/dify_cli.py import --yaml-file {output_dir}/{app-name}.dsl.yaml`
- 앱 ID 확보

#### Step 2: 환경 설정
- Dify Console에서 API Key, 외부 도구 연동 설정 (사용자 안내)

#### Step 3: Publish
- `python gateway/tools/dify_cli.py publish --app-id {app_id}`

#### Step 4: API 테스트
- `python gateway/tools/dify_cli.py run --app-id {app_id} --inputs '{"key": "value"}'`
- 샘플 입력으로 정상 응답 확인

#### Step 5: 문서 작성
- README.md 생성: Dify 앱 사용법, API 엔드포인트, 호출 예시

### Phase 2-B: 코드 기반 전환 (Option B 선택 시) → Agent: agent-developer (`/oh-my-claudecode:ralph` 활용)

- **TASK**: 개발계획서에 따라 AI Agent 프로덕션 코드 구현 (LangChain/LangGraph 등)
- **EXPECTED OUTCOME**: 빌드 성공 + 테스트 통과 + README.md 포함 완성 코드
- **MUST DO**:
  - `references/develop.md` 프롬프트 템플릿 활용
  - 개발계획서의 기술스택·아키텍처·모듈 설계 준수
  - DSL 구조를 참조하여 노드별 모듈 구현 (LLM 호출, 도구 연동, 조건 분기, 상태 관리)
  - 에러 핸들링 및 보안 요구사항 구현
  - 테스트 코드 작성 (단위·통합 테스트)
  - README.md 작성 (아키텍처 다이어그램, 디렉토리 구조, 실행 방법)
- **MUST NOT DO**:
  - 개발계획서 범위 외 기능 구현 금지
  - DSL 원본 수정 금지 (읽기 전용)
  - 'src' 디렉토리 하위에 결과파일 생성 금지 (Base 디렉토리 직접 사용)
- **CONTEXT**:
  - 개발계획서: `{output_dir}/dev-plan.md`
  - DSL: `{output_dir}/{app-name}.dsl.yaml`
  - 시나리오: `{output_dir}/scenario.md`
  - 출력 디렉토리: `{output_dir}/`
  - 가상환경: `gateway/.venv` (Python 도구 실행 시 사용)

### Phase 3: 빌드 오류 수정 (`/oh-my-claudecode:build-fix` 활용)

**Option B 한정.** 빌드 에러 발생 시 최소 수정 원칙으로 해결.

#### 검증 항목
- lsp_diagnostics로 파일별 오류 확인
- 빌드 명령 실행 결과 확인 (에러 0)

#### 실패 시 조치
- 에러 원인 분석 → 코드 수정 → 재빌드 → 재검증 (반복)

### Phase 4: QA/검증 (`/oh-my-claudecode:ultraqa` 활용)

#### Option A 검증
- [ ] Dify 앱 import 성공
- [ ] publish 성공
- [ ] API 호출 테스트 통과 (샘플 입력으로 정상 응답 확인)
- [ ] README.md 필수 섹션 포함 (앱 사용법, API 엔드포인트)

#### Option B 검증
- [ ] 모든 파일 lsp_diagnostics 통과 (에러 0)
- [ ] 빌드 성공 (컴파일/트랜스파일 에러 없음)
- [ ] 모든 테스트 통과
- [ ] README.md 필수 섹션 포함 (아키텍처, 디렉토리 구조, 실행 방법)
- [ ] 개발계획서의 기술스택·아키텍처와 일치

### Phase 5: 완료 및 보고

산출물 목록, 실행 방법, API 엔드포인트 등을 사용자에게 보고.

#### Option A 보고 내용
- Dify 앱 ID 및 이름
- API 엔드포인트
- 환경 변수 설정 방법
- API 호출 예시
- README.md 파일 경로

#### Option B 보고 내용
- 생성된 파일 목록 (소스 코드, 테스트, 설정 파일)
- 빌드 성공 로그
- 테스트 통과 결과
- 실행 방법 (가상환경 설정, 의존성 설치, 실행 명령)
- README.md 파일 경로

## 완료 조건

### Option A 완료 조건
- [ ] Dify 앱 배포 완료 (publish 성공)
- [ ] API 호출 테스트 통과
- [ ] README.md 작성 완료
- [ ] 산출물 목록 보고 완료

### Option B 완료 조건
- [ ] 코드 빌드 성공
- [ ] 테스트 통과
- [ ] README.md 작성 완료
- [ ] 산출물 목록 보고 완료

## 검증 프로토콜

완료 전 다음 검증 수행:

1. **빌드/배포 검증** (Option별 상이)
   - Option A: publish 성공 확인
   - Option B: 빌드 성공 + lsp_diagnostics 에러 0 확인

2. **테스트 검증**
   - Option A: API 호출 테스트 통과
   - Option B: 단위·통합 테스트 통과

3. **문서 검증**
   - README.md 필수 섹션 포함 확인

## 상태 정리

완료 시 임시 파일 정리 (상태 파일 미사용).

## 취소

사용자 요청 시 즉시 중단.
- Option A: Dify에 생성된 앱은 수동 삭제 안내
- Option B: 생성된 코드 파일은 유지 (사용자가 수동 삭제 가능)

## 재개

구현 코드 존재 시 QA 단계(Phase 4)부터 재개 가능.

## 스킬 부스팅

| 단계 | 추천 스킬 | 효과 |
|------|----------|------|
| Phase 2-B: 코드 기반 구현 | `/oh-my-claudecode:ralph` | 완료 보장 실행 워크플로우 |
| Phase 3: 빌드 오류 수정 | `/oh-my-claudecode:build-fix` | 최소 수정 원칙 |
| Phase 4: QA/검증 | `/oh-my-claudecode:ultraqa` | QA 순환 워크플로우 |
