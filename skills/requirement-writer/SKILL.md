---
name: requirement-writer
description: 요구사항 정의서 작성 지원 (AI 자동 완성)
user-invocable: true
---

# Requirement Writer

[REQUIREMENT-WRITER 활성화]

---

## 목표

사용자가 필수 항목(기본정보, 핵심기능, 사용자 플로우)만 입력하면
AI가 에이전트 구성 힌트와 참고 공유 자원을 자동 분석/추천하여
완성된 요구사항 정의서를 `{GEN-DMAP 프로젝트}/output/requirement-{플러그인명}.md`에 저장함.

[Top](#requirement-writer)

---

## 활성화 조건

- 슬래시 명령: `/dmap:requirement-writer`
- 자연어 키워드: "요구사항 작성", "정의서 작성", "요구사항 정의"

[Top](#requirement-writer)

---

## 참조

| 문서 | 경로 | 용도 |
|------|------|------|
| 플러그인 개발 가이드 | `resources/guides/plugin/plugin-dev-guide.md` | 정의서 양식, 에이전트 유형, 4-Tier 모델 |
| 리소스 마켓플레이스 | `resources/plugin-resources.md` | 공유 자원 카탈로그 |

[Top](#requirement-writer)

---

## 스킬 부스팅

| 단계 | 부스팅 스킬 | 용도 |
|------|------------|------|
| Step 3 (AI 자동 완성) | `/oh-my-claudecode:research` | 도메인 지식 리서치로 에이전트 구성 힌트 정확도 향상 |
| Step 4 (사용자 확인) | `/oh-my-claudecode:review` | 생성된 요구사항 정의서 품질 검토 |
| 기타 단계 | `ulw` 매직 키워드 | 범용 병렬 실행 폴백 |

[Top](#requirement-writer)

---

## 에이전트 호출 규칙

이 스킬은 에이전트를 호출하지 않음.
요구사항 분석, 에이전트 구성 힌트 추천, 공유 자원 매칭 등 모든 분석은
스킬 프롬프트 내에서 직접 수행함.

근거:
- requirement-writer는 DMAP **빌더 자체**의 Planning 스킬이며,
  빌더가 생성하는 **대상 플러그인**의 에이전트가 아님
- 분석 로직이 정형화되어 있어 (유형 매칭 테이블 + 카탈로그 검색)
  별도 에이전트의 자율적 추론이 불필요

[Top](#requirement-writer)

---

## 워크플로우

### Step 1: 입력 모드 판별 (`ulw` 활용)

사용자 메시지를 분석하여 Interview 모드 또는 Direct 모드를 결정함.

**Direct 모드 활성화 조건** (하나라도 충족 시):
- 사용자 메시지에 요구사항 정의서의 필수 항목(플러그인명, 목적, 핵심기능) 중
  2개 이상 포함
- 사용자가 `--direct` 인자를 명시적으로 전달
- 사용자가 정의서 파일 경로를 함께 전달
  (예: "이 파일로 요구사항 정의서 완성해줘")

| 조건 | 분기 |
|------|------|
| Direct 모드 조건 충족 | Step 3으로 이동 |
| 조건 미충족 | Step 2 (Interview 모드)로 이동 |

### Step 2: 사용자 인터뷰 -- Interview 모드 (`ulw` 활용)

AskUserQuestion 도구를 활용하여 필수 항목을 순차 수집함.
한 번에 최대 4개의 질문을 묶어 문의 가능.

수집할 항목은 `resources/guides/plugin/plugin-dev-guide.md`의
"정의서 작성 양식"에 정의된 필수 항목(기본 정보, 핵심기능, 사용자 플로우)을 따름.

### Step 3: AI 자동 완성 (`ulw` 활용)

수집된 필수 항목을 기반으로 선택 항목(에이전트 구성 힌트, 참고 공유 자원)을
자동 완성함.
이 단계의 모든 분석은 스킬 프롬프트가 직접 수행함.

**3-1. 에이전트 구성 힌트 추천**

핵심기능과 사용자 플로우를 분석하여 적절한 에이전트 역할을 추천함.

`resources/guides/plugin/plugin-dev-guide.md`의
"에이전트 유형 참조" 테이블과 "4-Tier 모델" 섹션을 참조하여 분석 수행:
1. 각 핵심기능이 필요로 하는 역할 유형 매칭
2. 사용자 플로우의 Step 간 역할 전환 패턴 분석으로 에이전트 분리 필요성 판단
3. 동일 역할의 연속 Step은 하나의 에이전트로 통합 가능 제안
4. 각 추천 에이전트에 적합한 4-Tier 모델 제안

**3-2. 참고 공유 자원 매칭**

`resources/plugin-resources.md` 카탈로그를 직접 참조하여 매칭함.

| 매칭 대상 | 매칭 기준 | 예시 |
|----------|----------|------|
| 가이드 | 대상 도메인 키워드 | Dify 자동화 → `dify-workflow-dsl-guide` |
| 템플릿 | 핵심기능의 산출물 유형 | DSL 생성 → `dsl-generation-prompt` |
| 샘플 | 유사 도메인 | Dify 관련 → `abra` 샘플 |
| 도구 | 핵심기능의 필요 도구 유형 | 라이브러리 문서 → `context7` |

매칭 결과 없음 시:
- "해당 자원 없음 -- 플러그인 개발 시 직접 작성 필요" 안내
- 유사한 자원이 있으면 참고용으로 제안

**3-3. 정의서 초안 생성**

수집된 필수 항목 + 자동 완성된 선택 항목을 조합하여
`resources/guides/plugin/plugin-dev-guide.md`의
"정의서 작성 양식"과 동일한 포맷으로 요구사항 정의서 초안을 생성함.

### Step 4: 사용자 확인 및 수정 (`ulw` 활용)

생성된 정의서 초안을 사용자에게 제시하고 확인을 요청함.

- 에이전트 구성 힌트의 추천 근거를 함께 설명
- 참고 공유 자원의 매칭 이유를 함께 설명
- 수정 요청 시 해당 부분을 반영하고 재확인
- 사용자가 승인하면 Step 5로 진행

### Step 5: 정의서 저장 (`ulw` 활용)

완성된 요구사항 정의서를 파일로 저장함.

1. `{GEN-DMAP 프로젝트}/output/` 디렉토리 존재 여부 확인
   미존재 시 자동 생성
2. `{GEN-DMAP 프로젝트}/output/requirement-{플러그인명}.md` 파일 존재 여부 확인
   존재 시 AskUserQuestion으로 덮어쓰기 확인
3. `{GEN-DMAP 프로젝트}/output/requirement-{플러그인명}.md`에 저장
4. 사용자에게 완료 안내:
   - 저장 경로 안내
   - `/dmap:develop-plugin` 명령으로 이어서
     플러그인 개발을 시작할 수 있음을 안내

[Top](#requirement-writer)

---

## 에러 처리

| 상황 | 대응 |
|------|------|
| `output/` 디렉토리 미존재 | 자동 생성 후 진행 |
| `output/requirement-{플러그인명}.md` 이미 존재 | AskUserQuestion으로 덮어쓰기 여부 확인 |
| 필수 항목 입력이 불완전 | 부족한 항목을 구체적으로 안내하고 재질문 |
| `plugin-resources.md`에 매칭 자원 없음 | "해당 자원 없음" 명시 + 유사 자원 참고 제안 |
| 인터뷰 중 취소 요청 | 수집된 내용을 `output/requirement-draft.md`에 임시 저장 후 안내 |

[Top](#requirement-writer)

---

## 품질 기준

- 에이전트 구성 힌트 추천 시 근거(기능 특성 → 유형 매칭)를 명시할 것
- 공유 자원 매칭 시 적합성 이유를 명시할 것
- 생성된 정의서가 `plugin-dev-guide.md`의 "정의서 작성 양식"과
  동일한 포맷일 것
- 모든 필수 항목이 빠짐없이 포함될 것

[Top](#requirement-writer)

---

## 계획 저장

결과 파일: `{GEN-DMAP 프로젝트}/output/requirement-{플러그인명}.md`

[Top](#requirement-writer)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 필수 항목(플러그인명, 목적, 핵심기능, 사용자 플로우) 누락 시 반드시 문의 |
| 2 | 에이전트 구성 힌트 추천 시 근거(기능 특성 → 유형 매칭)를 명시 |
| 3 | 공유 자원 매칭 시 적합성 이유를 명시 |
| 4 | 생성된 정의서 포맷은 `plugin-dev-guide.md`의 정의서 작성 양식과 동일 |
| 5 | 정의서 저장 전 반드시 사용자 확인(승인) 획득 |

[Top](#requirement-writer)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 에이전트를 호출하지 않음 — 모든 분석은 스킬 프롬프트 내에서 직접 수행 |
| 2 | 사용자가 입력하지 않은 필수 항목을 임의로 추정/생성하지 않음 |
| 3 | 기존 정의서 파일을 사용자 확인 없이 덮어쓰지 않음 |

[Top](#requirement-writer)

---

## 검증 체크리스트

- [ ] Interview 모드와 Direct 모드 분기 로직이 명확한가
- [ ] AskUserQuestion 도구 활용이 명시되어 있는가
- [ ] `plugin-dev-guide.md` 참조 경로가 정확한가
- [ ] `plugin-resources.md` 참조 경로가 정확한가
- [ ] 에이전트 구성 힌트 추천에 4-Tier 모델 참조가 포함되는가
- [ ] 출력 파일 경로(`output/requirement-{플러그인명}.md`)가 명시되어 있는가
- [ ] 에러 처리(디렉토리 미존재, 파일 중복, 불완전 입력) 대응이 있는가

[Top](#requirement-writer)
