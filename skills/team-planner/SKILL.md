---
name: team-planner
description: 팀 기획서 작성 지원 (AI 자동 완성)
user-invocable: true
type: orchestrator
---

# Team Planner

## 목표

사용자가 필수 항목(기본정보, 핵심기능, 사용자 플로우)만 입력하면
AI가 에이전트 구성 힌트와 참고 공유 자원을 자동 분석/추천하여
완성된 팀 기획서를 생성  

[Top](#team-planner)

---

## 활성화 조건

- 슬래시 명령: `/dmap:team-planner`
- 자연어 키워드: "AI팀 기획", "AI 팀기획서 작성"

[Top](#team-planner)

---

## {DMAP_PLUGIN_DIR} 변수 해석
오케스트레이터는 실행 시작 시 다음 순서로 `{DMAP_PLUGIN_DIR}`를 결정:
1. 아래 후보 경로 중 존재하는 첫 번째를 `PLUGIN_BASE_DIR`로 선택
   - `/mnt/.local-plugins/cache/unicorn/dmap` (Cowork VM)
   - `~/.claude/plugins/cache/unicorn/dmap` (Mac/Linux CLI)
   - `%APPDATA%/Claude/plugins/cache/unicorn/dmap` (Windows CLI)
2. `PLUGIN_BASE_DIR` 하위의 버전 디렉토리를 시맨틱 버전 비교하여 최신 버전 선택
3. 해당 디렉토리의 절대 경로를 `{DMAP_PLUGIN_DIR}`에 바인딩
4. 이후 모든 `{DMAP_PLUGIN_DIR}/...` 경로를 절대 경로로 치환하여 파일을 읽음
5. 현재 프로젝트의 CLAUDE.md에 {CLAUDE_RUNTIME}과 {DMAP_PLUGIN_DIR}을 기록하여 이후 중복 계산 안하게 함     
   - CLAUDE_RUNTIME: Claude Code | Claude CoWork
   - DMAP_PLUGIN_DIR: '2번에서 결정한 절대경로'

[Top](#team-planner)

---

## 참조
| 문서 | 경로 | 용도 |
|------|------|------|
| 플러그인 개발 가이드 | `{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md` | 기획서 양식, 에이전트 유형, 4-Tier 모델 |
| 리소스 마켓플레이스 | `{DMAP_PLUGIN_DIR}/resources/plugin-resources.md` | 공유 자원 카탈로그 |

[Top](#team-planner)

---

## 스킬 부스팅

| 단계 | 부스팅 스킬 | 용도 |
|------|------------|------|
| Step 3 (AI 자동 완성) | `/oh-my-claudecode:research` | 도메인 지식 리서치로 에이전트 구성 힌트 정확도 향상 |
| Step 4 (사용자 확인) | `/oh-my-claudecode:review` | 생성된 팀 기획서 품질 검토 |
| 기타 단계 | `ulw` 매직 키워드 | 범용 병렬 실행 폴백 |

[Top](#team-planner)

---

## 에이전트 호출 규칙

이 스킬은 에이전트를 호출하지 않음.
요구사항 분석, 에이전트 구성 힌트 추천, 공유 자원 매칭 등 모든 분석은
스킬 프롬프트 내에서 직접 수행함.

근거:
- team-planner는 DMAP **빌더 자체**의 Planning 스킬이며,
  빌더가 생성하는 **대상 플러그인**의 에이전트가 아님
- 분석 로직이 정형화되어 있어 (유형 매칭 테이블 + 카탈로그 검색)
  별도 에이전트의 자율적 추론이 불필요

[Top](#team-planner)

---

## 워크플로우

### Step1: 대상 프로젝트 디렉토리 확인

새 플러그인을 생성할 프로젝트 디렉토리를 생성하였고   
플러그인 프로젝트 디렉토리에서 {CLAUDE_RUNTIME}을 수행하였는지 AskUserQuestion 도구로 문의함.
- Yes: CLAUDE.md에 현재 디렉토리의 절대 경로를 {PLUGIN_DIR}로 저장 
- No: 플러그인 프로젝트 디렉토리를 생성하고 그 디렉토리로 이동하여 {CLAUDE_RUNTIME}을 수행하도록 안내 
 
### Step 2: 입력 모드 판별 (`ulw` 활용)

사용자 메시지를 분석하여 Interview 모드 또는 Direct 모드를 결정함.

**Direct 모드 활성화 조건** (하나라도 충족 시):
- 사용자 메시지에 팀 기획서의 필수 항목(플러그인명, 목적, 핵심기능) 중
  2개 이상 포함
- 사용자가 `--direct` 인자를 명시적으로 전달
- 사용자가 기획서 파일 경로를 함께 전달
  (예: "이 파일로 팀 기획서 완성해줘")

| 조건 | 분기 |
|------|------|
| Direct 모드 조건 충족 | Step 4으로 이동 |
| 조건 미충족 | Step 3 (Interview 모드)로 이동 |

### Step 3: 사용자 인터뷰 -- Interview 모드 (`ulw` 활용)

사용자에게 `{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md`의
"### 기획서 작성 양식"에 정의된 기본정보, 핵심기능, 사용자플로우를 입력하도록 템플릿과 샘플을 제공함 


### Step 4: AI 자동 완성 (`ulw` 활용)

수집된 필수 항목을 기반으로 선택 항목(에이전트 구성 힌트, 참고 공유 자원)을 자동 완성함.  
이 단계의 모든 분석은 스킬 프롬프트가 직접 수행함.

**Step4-1. 에이전트 구성 힌트 추천**
핵심기능과 사용자 플로우를 분석하여 적절한 에이전트 역할을 추천함.

`{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md`의
"에이전트 유형 참조" 테이블과 "4-Tier 모델" 섹션을 참조하여 분석 수행:
1. 각 핵심기능이 필요로 하는 역할 유형 매칭
2. 사용자 플로우의 Step 간 역할 전환 패턴 분석으로 에이전트 분리 필요성 판단
3. 동일 역할의 연속 Step은 하나의 에이전트로 통합 가능 제안
4. 통합된 에이전트 내에서 작업 성격이 구분되면 세부역할(sub-roles)로 분리 제안
   - 세부역할 판단 기준: 동일 전문 영역 내에서 워크플로우가 독립적으로 분리되는 경우
   - 세부역할 표현: 에이전트 구성 힌트에서 들여쓰기로 표현
5. 각 추천 에이전트에 적합한 4-Tier 모델 제안

**Step4-2. 참고 공유 자원 매칭**

`{DMAP_PLUGIN_DIR}/resources/plugin-resources.md` 카탈로그를 직접 참조하여 매칭함.

| 매칭 대상 | 매칭 기준 | 예시 |
|----------|----------|------|
| 가이드 | 대상 도메인 키워드 | Dify 자동화 → `dify-workflow-dsl-guide` |
| 템플릿 | 핵심기능의 산출물 유형 | DSL 생성 → `dsl-generation-prompt` |
| 샘플 | 유사 도메인 | Dify 관련 → `abra` 샘플 |
| 도구 | 핵심기능의 필요 도구 유형 | 라이브러리 문서 → `context7` |

매칭 결과 없음 시:
- "해당 자원 없음 -- 플러그인 개발 시 직접 작성 필요" 안내
- 유사한 자원이 있으면 참고용으로 제안

**Step4-3. 기획서 초안 생성**

수집된 필수 항목 + 자동 완성된 선택 항목을 조합하여  
`{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md`의  
"기획서 작성 양식"과 동일한 포맷으로 팀 기획서 초안을 `{PLUGIN_DIR}/output/team-plan-{플러그인명}.md`에 생성함.  
(중요) **CLAUDE.md에 `{PLUGIN_NAME}` 변수 등록**      

### Step 5: 사용자 확인 및 수정 (`ulw` 활용)

생성된 기획서 초안을 사용자에게 제시하고 확인을 요청함.

- 에이전트 구성 힌트의 추천 근거를 함께 설명
- 참고 공유 자원의 매칭 이유를 함께 설명
- 수정 요청 시 해당 부분을 반영하고 재확인
- 사용자가 승인하면 Step 6으로 진행

### Step 6: 기획서 저장 (`ulw` 활용)
사용자의 피드백을 추가하여 완성된 팀 기획서를 파일로 저장함.  
1. `{PLUGIN_DIR}/output/team-plan-{PLUGIN_NAME}.md` 파일을 덮어씀 
2. 사용자에게 완료 안내 및 플러그인 개발 전환 문의:
   - 저장 경로 안내
   - 사용자에게 "바로 플러그인 개발을 시작할까요?" 문의
   - 동의 시: `CHAIN>>>/dmap:develop-plugin` 출력으로 스킬 전환 (팀 기획서 경로 전달)
   - 거절 시: "나중에 `/dmap:develop-plugin`으로 언제든 개발 시작 가능합니다" 안내

[Top](#team-planner)

---

## 에러 처리

| 상황 | 대응 |
|------|------|
| 필수 항목 입력이 불완전 | 부족한 항목을 구체적으로 안내하고 재질문 |
| 인터뷰 중 취소 요청 | 수집된 내용을 `{PLUGIN_DIR}/output/team-plan-draft.md`에 임시 저장 후 안내 |

[Top](#team-planner)

---

## 품질 기준

- 에이전트 구성 힌트 추천 시 근거(기능 특성 → 유형 매칭)를 명시할 것
- 공유 자원 매칭 시 적합성 이유를 명시할 것
- 생성된 기획서가 `plugin-dev-guide.md`의 "기획서 작성 양식"과 동일한 포맷일 것
- 모든 필수 항목이 빠짐없이 포함될 것

[Top](#team-planner)

---

## 계획 저장

결과 파일: `{PLUGIN_DIR}/output/team-plan-{PLUGIN_NAME}.md`

[Top](#team-planner)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 필수 항목(플러그인명, 목적, 핵심기능, 사용자 플로우) 누락 시 반드시 문의 |
| 2 | 에이전트 구성 힌트 추천 시 근거(기능 특성 → 유형 매칭)를 명시 |
| 3 | 공유 자원 매칭 시 적합성 이유를 명시 |
| 4 | 생성된 기획서 포맷은 `plugin-dev-guide.md`의 기획서 작성 양식과 동일 |
| 5 | 기획서 저장 전 반드시 사용자 확인(승인) 획득 |

[Top](#team-planner)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 에이전트를 호출하지 않음 — 모든 분석은 스킬 프롬프트 내에서 직접 수행 |
| 2 | 사용자가 입력하지 않은 필수 항목을 임의로 추정/생성하지 않음 |

[Top](#team-planner)

---

## 검증 체크리스트

- [ ] Interview 모드와 Direct 모드 분기 로직이 명확한가
- [ ] AskUserQuestion 도구 활용이 명시되어 있는가
- [ ] 에이전트 구성 힌트 추천에 4-Tier 모델 참조가 포함되는가

[Top](#team-planner)
