---
name: core
description: Abra 플러그인 의도 분류 및 스킬 라우팅
user-invocable: false
---

# Abra Core

## 목표

사용자 요청의 의도를 분석하여 적절한 Abra 스킬로 라우팅함.
자연어 요청을 감지하고, 패턴을 매칭하여 5단계 자동화 워크플로우 또는 개별 스킬로 위임함.

## 활성화 조건

다음과 같은 패턴이 감지될 때 자동 활성화:
- AI Agent 개발 관련 키워드 ("에이전트 만들어", "Agent 개발", "워크플로우 자동화")
- Dify 워크플로우 관련 키워드 ("시나리오 생성", "DSL 생성", "프로토타이핑")
- 설정 관련 키워드 ("Dify 설치", "초기 설정")

## 워크플로우

### Step 1: 의도 감지 (Intent Detection)

사용자 요청의 키워드, 패턴, 맥락을 분석하여 의도를 분류함.

**감지 대상:**
- 전체 워크플로우 실행 요청
- 개별 단계(STEP 1~5) 실행 요청
- 환경 설정 요청

### Step 2: 스킬 매칭 (Skill Matching)

감지된 의도를 다음 테이블에 따라 적절한 스킬에 매칭함:

| 감지 패턴 | 라우팅 대상 | 설명 |
|-----------|------------|------|
| "에이전트 만들어", "Agent 개발", "워크플로우 자동화", "전체 실행" | → 전체 5단계 순차 실행 | scenario → dsl-generate → prototype → dev-plan → develop 순차 호출 |
| "시나리오 생성", "요구사항 생성", "요구사항 정의", "STEP 1" | → Skill: scenario | 비즈니스 시나리오 생성 및 선택 |
| "DSL 생성", "워크플로우 DSL", "YAML 만들어", "STEP 2" | → Skill: dsl-generate | Dify Workflow DSL 자동생성 |
| "프로토타이핑", "Dify 업로드", "Dify 실행", "Dify 배포", "STEP 3" | → Skill: prototype | Dify 프로토타이핑 자동화 |
| "개발계획서", "계획서 작성", "개발 계획", "STEP 4" | → Skill: dev-plan | 개발계획서 작성 |
| "코드 개발", "Agent 구현", "구현해줘", "STEP 5" | → Skill: develop | AI Agent 개발 및 배포 |
| "Dify 설치", "Docker 실행", "Dify 환경", "Dify Docker" | → Skill: dify-setup | Dify 로컬 환경 구축 |
| "초기 설정", "setup", "설정", "플러그인 설정" | → Skill: setup | 플러그인 초기 설정 |

### Step 3: 위임

#### 전체 5단계 실행 시

scenario → dsl-generate → prototype → dev-plan → develop 스킬을 순차 호출함.

**Step 3-1: 시나리오 생성 → Skill: scenario**
- **INTENT**: 비즈니스 요구사항을 구조화된 시나리오 문서로 변환
- **ARGS**: 서비스 목적 (사용자 입력)
- **RETURN**: 선택된 시나리오 문서 (`output/scenario.md`)

**Step 3-2: DSL 생성 → Skill: dsl-generate**
- **INTENT**: 시나리오 기반 Dify Workflow DSL 자동생성
- **ARGS**: Step 3-1의 시나리오 문서
- **RETURN**: 검증된 DSL 파일 (`output/{app-name}.dsl.yaml`)

**Step 3-3: 프로토타이핑 → Skill: prototype**
- **INTENT**: DSL을 Dify에 배포하여 프로토타이핑 검증
- **ARGS**: Step 3-2의 DSL 파일
- **RETURN**: Dify 실행 결과 및 검증된 최종 DSL

**Step 3-4: 개발계획서 작성 → Skill: dev-plan**
- **INTENT**: 검증된 DSL과 시나리오 기반 개발계획서 작성
- **ARGS**: Step 3-3의 검증된 DSL + Step 3-1의 시나리오
- **RETURN**: 개발계획서 문서 (`output/dev-plan.md`)

**Step 3-5: AI Agent 개발 → Skill: develop**
- **INTENT**: 개발계획서에 따라 AI Agent 구현
- **ARGS**: Step 3-4의 개발계획서 + Step 3-3의 검증된 DSL
- **RETURN**: 프로덕션 코드 또는 Dify 앱 배포 완료

#### 개별 스킬 실행 시

매칭된 스킬로 위임:

**→ Skill: {매칭된 스킬}**
- **INTENT**: 분류된 의도에 맞는 스킬 활성화
- **ARGS**: 사용자 요청 원문 전달
- **RETURN**: 스킬 워크플로우 완료 후 사용자에게 결과 보고

#### 미매칭 시

사용 가능한 명령 목록을 안내:

```
Abra 플러그인 사용 가능한 명령:

전체 워크플로우:
- "에이전트 만들어줘", "Agent 개발해줘", "워크플로우 자동화"

개별 단계:
- "/abra:scenario" 또는 "시나리오 생성해줘"
- "/abra:dsl-generate" 또는 "DSL 생성해줘"
- "/abra:prototype" 또는 "프로토타이핑 해줘"
- "/abra:dev-plan" 또는 "개발계획서 써줘"
- "/abra:develop" 또는 "코드 개발해줘"

환경 설정:
- "/abra:dify-setup" 또는 "Dify 설치"
- "/abra:setup" 또는 "초기 설정"
```
