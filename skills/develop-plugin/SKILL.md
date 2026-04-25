---
name: develop-plugin
description: DMAP 플러그인 개발 (4-Phase 워크플로우)
type: orchestrator
user-invocable: true
---

# Develop Plugin

## 목표

사용자의 팀 기획서를 기반으로 DMAP 표준에 맞는 플러그인을 자동 생성함.
4-Phase 워크플로우를 순차 수행하며, 각 Phase 완료 시 사용자 승인을 받음.

[Top](#develop-plugin)

---

## 활성화 조건

사용자가 `/dmap:develop-plugin` 호출 시 또는 "플러그인 만들어줘", "DMAP 플러그인 개발" 키워드 감지 시.

[Top](#develop-plugin)

---

## 작업 환경 변수 로드 
AGENTS.md에서 아래 환경변수 로드함. 없으면 '/dmap:team-panner'를 먼저 수행하도록 안내하고 종료.   
- AI_RUNTIME: 런타임 종류. Claude Code 또는 Claude CoWork 
- DMAP_PLUGIN_DIR: DMAP 플러그인의 루트 절대 경로 
- PLUGIN_DIR: 생성할 플러그인의 루트 절대 경로 
- PLUGIN_NAME: 생성할 플러그인 이름 

[Top](#develop-plugin)

---

## 참조

| 문서 | 경로 | 용도 |
|------|------|------|
| DMAP 빌더 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md` | 디렉토리 구조, 배포, 네임스페이스 |
| Agent 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md` | 에이전트 패키지 작성 규칙 |
| Skill 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md` | 스킬 작성 규칙, 유형별 템플릿 |
| Gateway 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-gateway.md` | install.yaml, runtime-mapping.yaml 작성 |
| 리소스 마켓플레이스 | `{DMAP_PLUGIN_DIR}/resources/plugin-resources.md` | 공유 자원 카탈로그 (office 카테고리에 pptx/xlsx/docx 가이드·템플릿·샘플 포함) |
| README 템플릿 | `{DMAP_PLUGIN_DIR}/resources/templates/plugin/README-plugin-template.md` | README.md 작성 참고 |
| README 예제 | `{DMAP_PLUGIN_DIR}/resources/samples/plugin/README.md` | README.md 작성 예시 |
| Publish 스킬 | `{DMAP_PLUGIN_DIR}/skills/publish/SKILL.md` | GitHub 배포 자동화 |

[Top](#develop-plugin)

---


[Top](#develop-plugin)

---

## 워크플로우

(중요) 특별한 언급이 없는 경우 한글로 작성함   

### Phase 1: 요구사항 수집

`{PLUGIN_DIR/output/team-plan-{PLUGIN_NAME}.md}` 팀 기획서를 분석하고, 부족한 정보를 사용자에게 문의하여 수집함.

#### Step 1. 요구사항 파악

사용자가 제공한 팀 기획서의 각 항목을 분석함.  
팀 기획서 탐색 순서:
1. `{PLUGIN_DIR}/output/team-plan-{PLUGIN_NAME}.md` 파일이 존재하면 자동 로드하여 사용
2. 파일이 없거나 불완전하면, 사용자에게 `/dmap:team-planner` 스킬을 먼저 수행하도록 안내하고 종료

#### Step 2. 플러그인 적합여부 판단

요구사항이 DMAP 플러그인으로 구현하기 적합한지 판단함.

| 기준 | 적합 | 부적합 |
|------|------|--------|
| 반복 가능성 | 반복 사용할 워크플로우 | 일회성 작업 |
| 역할 분리 | 2개 이상 전문가 역할 필요 | 단일 작업 수행 |
| 도구 의존성 | 외부 도구/API 연동 필요 | 순수 대화만으로 해결 |
| 도메인 지식 | 특정 도메인 가이드/참조 필요 | 범용 지식으로 충분 |

부적합 시 사용자에게 검토결과 및 보완사항 추천.

#### Step 3. 사용자에게 문의하여 정보 수집

팀 기획서에서 누락되거나 모호한 항목을 파악하여 질문 목록 작성.
아래 기본 항목 외에도 요구사항의 특성에 따라 충분히 문의할 내용을 취합.

**기본 확인 항목:**
- 미작성 필수 항목 (플러그인명, 목적, 핵심기능, 사용자 플로우)
- 핵심기능과 사용자 플로우 간 불일치
- 에이전트 역할 구분이 필요한 부분
- 외부 시스템 연동 여부 (API, DB, 파일 시스템 등)
- 기술 요건 (프로그래밍 언어, 프레임워크, 프로토콜, 데이터 형식 등)

**요구사항에 따른 추가 확인 (예시):**
- 인증/보안 요건 (API Key, OAuth, 접근 권한 등)
- 데이터 입출력 형식 및 저장소
- 기존 시스템과의 호환성 제약
- 성능/비용 요건 (응답 시간, 토큰 사용량 등)
- 에러 처리 및 예외 상황 대응 방침


#### Step 4. 요구사항 정의서 작성

수집된 정보를 반영하여 완성된 요구사항 정의서를 `{PLUGIN_DIR}/output/requirements.md`에 저장함.

> **Phase 1 완료**: 업데이트된 팀 기획서를 사용자에게 보고하고 승인 요청.

---

### Phase 2: 설계 및 계획

수집된 요구사항(`{PLUGIN_DIR}/output/requirements.md`)을 기반으로 플러그인 구조를 설계하고 개발 계획 수립.

#### Step 0. Office 산출물 패턴 적용 (해당 시)

team-planner에서 감지·매칭된 office 형식(pptx/xlsx/docx)을 기반으로,
플러그인 구조 설계 단계에서 형식별 표준 패턴을 자동 반영함.

**입력**: 팀 기획서(`{PLUGIN_DIR}/output/team-plan-{플러그인명}.md`)의
`## 공유자원` 테이블에 등록된 office 형식별 가이드·템플릿
(예: `pptx-build-guide`, `pptx-spec-writer-AGENT`, `xlsx-builder-SKILL` 등).

**처리**:
1. 공유자원 테이블에서 office 카테고리 자원 식별
2. 형식별 패턴 적용:
   - **pptx**: spec-writer 에이전트 + 빌더 스킬 **2단계 패턴** (시각 명세 분리)
   - **xlsx/docx**: 빌더 스킬 단독 **1단계 패턴** (입력 데이터/본문 직수신)
3. 개발 계획서의 에이전트·스킬 섹션에 다음을 명시:
   - **pptx만**: 신규 에이전트 `pptx-spec-writer` (티어 MEDIUM, 시각 명세 작성 전담)
   - **xlsx/docx**: 별도 spec-writer 에이전트 미생성, 빌더 스킬에 입력 직수신 Phase 명시
   - 신규 또는 기존 오케스트레이터 스킬에 "Build & Verify" Phase 추가
     (`generate-pptx` / `generate-xlsx` / `generate-docx` 스킬 또는 통합 스킬에 포함)

**감지 안 됨 처리** (team-planner를 거치지 않은 경우 폴백):
- 요구사항 정의서·핵심기능·산출물 항목을 직접 키워드 스캔하여 office 형식 식별 시도
  (키워드 표는 `{DMAP_PLUGIN_DIR}/skills/team-planner/SKILL.md` Step4-2-A와 동일)
- 식별 결과를 사용자에게 AskUserQuestion으로 확인 후 진행

**참고**: office 감지 자체는 team-planner 책임.
develop-plugin은 적용·구체화만 수행함 (책임 분리).

#### Step 1. 플러그인 구조 설계

"참조 표준"컬럼에 있는 DMAP 표준 문서를 읽고 표준에 맞춰 플러그인의 전체 구조 설계.

| 설계 항목 | 설계 내용 | 참조 표준 |
|----------|----------|----------|
| 에이전트 구성 | 역할별 에이전트 정의 (이름, 티어, 도구) | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md` |
| 스킬 구성 | 스킬 목록 및 유형 결정 (Router/Setup/Planning/Orchestrator/Utility) | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md` |
| Gateway 설정 | 티어 매핑, 도구 매핑, 액션 매핑 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-gateway.md` |
| 디렉토리 구조 | 표준 디렉토리 구조 확정 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md` |


#### Step 2. 개발 계획 수립

아래와 같은 개발 계획서 템플릿에 따라 개발 계획 수립. 
요구사항 구현을 위해 추가로 필요한 섹션은 자유롭게 추가   
`{PLUGIN_DIR}/output/develop-plan.md`에 저장.

개발 계획서 구성:
```markdown
# 팀 기획서

## 기본 정보
- 플러그인명: {영문 kebab-case. 예: my-plugin}
- 목표: {플러그인이 해결하는 문제 또는 달성 목표. 한 줄 요약}
- 대상 도메인: {예: 교육, 개발 자동화, 비즈니스 프로세스, 콘텐츠 제작}
- 대상 사용자: {예: 개발자, 기획자, 디자이너, 도메인 전문가}

---

## 핵심기능
- {핵심기능1}: 
  {요구사항 정의 기반으로 기능 상세 설명}
- {핵심기능2}: 
  {요구사항 정의 기반으로 기능 상세 설명}

---

## 업무 플로우

### {업무명1}
- Step 1. {작업명}: 
  {요구사항 정의 기반으로 작업 상세 설명}
- Step 2. {작업명}: 
  {요구사항 정의 기반으로 작업 상세 설명}

### {업무명2}
- Step 1. {작업명}: 
  {요구사항 정의 기반으로 작업 상세 설명}
- Step 2. {작업명}: 
  {요구사항 정의 기반으로 작업 상세 설명}

---

## 기술 요구사항
### 기술 스택

### {요구사항에 따른 섹션 추가}

---

## 공유자원 
| 자원 유형 | 자원명 | 자원 경로 |
|----------|--------|------------|
| {자원유형} | {자원명} | {자원경로} |

### 커스텀 도구 개발 계획
{요구사항 구현을 위해 필요하나 '## 공유자원'에 없는 도구에 대한 개발 계획 기술}  

---

## 플러그인 구조 설계

---

### 에이전트 구성 설계
#### 에이전트 목록 및 역할
| 에이전트 | 티어 | 역할 | 책임 |
#### 에이전트 간 의존성

---

#### 스킬 목록

| 스킬명 | 유형 | 필수 | 설명 | 워크플로우 |

---

#### 스킬 워크플로우

---

### Gateway 설정 설계

#### install.yaml (설치 매니페스트)

#### runtime-mapping.yaml (추상 → 구체 매핑)

---

### 디렉토리 구조 설계
{디렉토리 트리 구조 형식으로 설계 내용 기술}

---

## 개발 계획

### 3.1 개발 순서 (순차적)
| 순번 | 단계 | 파일/디렉토리 | 예상 시간 | 검증 방법 |

### 3.2 병렬 가능 단계

### 3.3 공유 자원 활용 계획

### 3.4 기술 요구사항 확인
#### Python 라이브러리
{요구사항 구현에 필요한 Python 라이브러리 목록과 버전 기술}

#### 환경 변수 (`.env`)
{요구사항 구현에 필요한 환경 변수 목록 정의}

---

{추가로 필요한 항목은 자유롭게 추가}

```

(중요) 주의사항
- 공유자원에 있는 도구는 추가 개발하지 않음   

#### Step 3. 사용자 검토 및 보완

사용자에게 개발 계획서 검토 요청.
피드백에 따라 계획서 보완 후 재승인.

> **Phase 2 완료**: 확정된 개발 계획서를 사용자에게 보고하고 개발 착수 승인 요청.

---

### Phase 3: 플러그인 개발

`/oh-my-claudecode:ralph` 스킬 부스팅 패턴을 적용하여 개발 계획서에 따라 플러그인 개발.

개발 계획서(`{PLUGIN_DIR}/output/develop-plan.md`)에 따라 플러그인 개발.

#### Step 1. 플러그인 스켈레톤 생성

표준 디렉토리 구조와 필수 매니페스트 파일 생성.

```
{PLUGIN_DIR}/
├── .claude-plugin/
│   ├── plugin.json              # 플러그인 매니페스트 (필수)
│   └── marketplace.json         # 마켓플레이스 매니페스트 (필수)
├── skills/
├── agents/                      # 에이전트 SSOT
├── .claude/agents/              # 런타임 어댑터 (Step 4-A에서 자동 채움)
├── .cursor/agents/              # 런타임 어댑터 (Step 4-A에서 자동 채움)
├── .codex/agents/               # 런타임 어댑터 (Step 4-A에서 자동 채움)
├── .antigravity/agents/         # 런타임 어댑터 (Step 4-A에서 자동 채움)
├── gateway/
├── commands/
├── .gitignore
└── README.md

```

**1)marketplace.json 작성**:      
아래 형식으로 작성. '{마켓플레이스명}'을 '{플러그인명}'과 동일하게 함. '{사용자명}'은 사용자에게 요청.     
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "{마켓플레이스명}",
  "owner": {
    "name": "{사용자명}"
  },
  "plugins": [
    {
      "name": "{플러그인명}",
      "version": "0.0.1",
      "source": "./"
    }
  ]
}
```

**2)plugin.json 작성:**           
'{플러그인 설명}', '{키워드}'는 적절히 작성       
```
{
  "name": "{플러그인명}",
  "version": "0.0.1",
  "description": "{플러그인 설명}",
  "author": {
    "name": "{사용자명}"
  },
  "license": "MIT",
  "keywords": ["{키워드1}", "{키워드2}", ]
}
```


> `plugin.json`과 `marketplace.json` 작성 시
> DMAP 메인 표준(`{DMAP_PLUGIN_DIR}/standards/plugin-standard.md`)의 `## 배포 > plugin.json`과 `## 배포 > marketplace.json` 섹션 참조.

**3)`.gitignore` 작성**: 
- `.dmap/secrets/`, `__pycache__/`, `.env` 등 보안·임시 파일 제외
- `.dmap/`, `.omc/` 디렉토리 제외 
- `output/` 디렉토리는 제외하지 않음


#### Step 2. Gateway 설정
공통 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md`와  
Gateway 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard-gateway.md`를 반드시 준수하여   
추상 선언과 구체 매핑을 연결하는 Gateway 파일 생성.
(중요) 'tier_mapping:'의 모델명은 **AI_RUNTIME에 따라** 아래 기준으로 지정  
- Claude Code / Cursor / AntiGravity: Claude 모델 지원 → **플러그인 생성 시점의 최신 Claude 버전**을 검색하여 지정  
- Codex: OpenAI 모델만 지원 → `gpt-5.4`(flagship), `gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.4-mini` 중 **플러그인 생성 시점의 최신 버전**을 검색하여 지정  

(중요) `tier_mapping`은 **claude-code / cursor / codex / antigravity 4런타임 모두에 대한 tier별 모델 엔트리를 포함**해야 함.  
Step 4-A(런타임 어댑터 포인터 생성)가 이 매핑을 읽어 각 런타임 스텁의 frontmatter `model:`을 결정하므로 누락 시 Step 4-A가 에러 보고 후 중단.  
세부 구조는 `{DMAP_PLUGIN_DIR}/resources/guides/agent-runtime-adapters.md`의 "tier → model 해결 규칙" 참조.  

| 파일 | 내용 |
|------|------|
| `{PLUGIN_DIR}/gateway/install.yaml` | MCP 서버, LSP 서버, 커스텀 도구, 런타임 의존성 설치 매니페스트 |
| `{PLUGIN_DIR}/gateway/runtime-mapping.yaml` | 티어→모델 매핑, 추상도구→구체도구 매핑, 금지액션→제외도구 매핑 |

> Gateway 설정이 없으면 에이전트 호출 시 모델/도구 구체화 불가.

**Office 산출물 생성 플러그인 추가 규칙** (Phase 2 Step 0에서 감지된 경우):

- `install.yaml`의 **`runtime_dependencies` 섹션에 형식별 라이브러리 자동 등록**
  (Gateway 표준 6번 MUST 규칙):

  | 감지 형식 | 라이브러리 | runtime | install | check |
  |-----------|-----------|---------|---------|-------|
  | pptx | pptxgenjs | node | `npm install pptxgenjs` | `node -e "require('pptxgenjs')"` |
  | xlsx | openpyxl | python | `pip install openpyxl` | `python -c "import openpyxl"` |
  | docx | python-docx | python | `pip install python-docx` | `python -c "import docx"` |

- `runtime-mapping.yaml` **변경 불필요**:
  빌더 스킬은 builtin `Bash`/`Write`로 직접 `node build.js`/`python build.py` 실행 →
  추상 도구 매핑 대상 아님 (가이드 표준 tool_mapping 영역에 빌트인 도구는 포함하지 않음)
- `runtime_dependencies`는 **custom_tools와 구분**:
  - `runtime_dependencies` = npm/pip 등 **외부 라이브러리** (예: pptxgenjs)
  - `custom_tools` = 플러그인이 직접 구현한 **소스 파일** (예: `tools/complexity.py`)

#### Step 3. 공유자원 복사

- 개발계획서 `{PLUGIN_DIR}/output/develop-plan.md` 의 "## 공유 자원" 섹션애서 공유 자원 파악.  
  예제)
  ```
  | 자원 유형 | 자원명 | 자원 경로 |
  |----------|--------|------------|
  | 가이드 | dify-workflow-dsl-guide | {DMAP_PLUGIN_DIR}/resources/guides/dify/dify-workflow-dsl-guide.md |
  | 템플릿 | dsl-generation-prompt | {DMAP_PLUGIN_DIR}/resources/templates/dify/dsl-generation-prompt.md |
  | 샘플 | README | {DMAP_PLUGIN_DIR}/resources/samples/plugin/README.md |
  | 도구 | generate_image | {DMAP_PLUGIN_DIR}/resources/tools/generate_image.py |
  ``` 
- 아래 규칙에 따라 정확한 위치에 복사
  - **도구**: `{PLUGIN_DIR}/gateway/tools/` 
  - **가이드/템플릿/샘플**
    | 자원 유형 | 복사 위치 |
    |----------|----------|
    | 가이드 | `{PLUGIN_DIR}/resources/guides/` | 
    | 템플릿 | `{PLUGIN_DIR}/resources/templates/` |
    | 샘플 | `{PLUGIN_DIR}/resources/samples/` | 

  - `{DMAP_PLUGIN_DIR}/resources/guides/combine-prompt.md`는 반드시 포함

- '도구' 유형의 자원은 복사 후 아래 규칙을 적용
  - **`.env` 위치 고정**: `{PLUGIN_DIR}/gateway/tools/.env` 단일 파일로 관리 (개별 도구 서브디렉토리에 생성 금지)
  - **`.env` 로드 코드 검증·수정**: 복사한 도구가 아래 표준 패턴을 따르는지 확인. 불일치 시 수정
    ```python
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(env_path)
    ```
    (`Path(__file__).resolve()`는 실행 위치와 무관하게 스크립트 파일 기준 절대 경로를 보장)

#### Step 4. 에이전트 개발
공통 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md`와  
에이젼트 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md`을 반드시 준수하여 에이전트 패키지 작성.  
에이전트별 패키지(디렉토리) `{PLUGIN_DIR}/agents/{agent-name}/` 하위에 생성.

| 파일 | 필수 | 내용 |
|------|:----:|------|
| `AGENT.md` | 필수 | 프롬프트 (목표, 참조, 워크플로우, 출력 형식, 검증) |
| `agentcard.yaml` | 필수 | 메타데이터 (정체성, 역량, 제약, 핸드오프) |
| `tools.yaml` | 선택 | 추상 도구 선언 (이름, 설명, 파라미터) |
| `references/` | 선택 | 에이전트 전용 참조 문서 |

**Office 산출물 생성 플러그인 추가 규칙** (Phase 2 Step 0에서 감지된 경우):

- **pptx만**: `{PLUGIN_DIR}/agents/pptx-spec-writer/AGENT.md` 생성
  - 시작점: `{DMAP_PLUGIN_DIR}/resources/templates/office/pptx-spec-writer-AGENT.md` 복사
  - 가이드 참조: Phase 2 Step 0에서 `pptx-build-guide`를 `pptx-spec-writer` 에이전트의
    참조 자원으로 명시하면, Step 3(공유자원 복사) 표 규칙에 의해
    `{PLUGIN_DIR}/resources/references/pptx-build-guide.md`로 자동 복사됨
    (Step 0에서 매핑 누락 시 수동 복사 필요)
  - 도메인 특화 안내 섹션을 플러그인 도메인에 맞춰 보강
- **xlsx/docx**: spec-writer 에이전트 생성 안 함 (빌더 스킬이 입력 직수신)
- 에이전트 핸드오프 정의: `pptx-spec-writer` → 빌더 스킬 (`generate-pptx`)에 spec.md 경로 전달

#### Step 4-A. 런타임 어댑터 포인터 생성

공통 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md`의
"런타임 어댑터 포인터 파일 구조" 섹션을 준수하여,
에이전트 SSOT(`{PLUGIN_DIR}/agents/{name}/`)를 가리키는 **얇은 포인터 스텁**을
모든 지원 런타임에 대해 일괄 생성함.

##### 생성 대상

| 런타임 | 경로 | 포맷 | 템플릿 |
|--------|------|------|--------|
| Claude Code / Claude CoWork | `{PLUGIN_DIR}/.claude/agents/{name}.md` | Markdown + YAML frontmatter | `{DMAP_PLUGIN_DIR}/resources/templates/runtime-adapters/claude-code.md.tmpl` |
| Cursor | `{PLUGIN_DIR}/.cursor/agents/{name}.md` | Markdown + YAML frontmatter | `{DMAP_PLUGIN_DIR}/resources/templates/runtime-adapters/cursor.md.tmpl` |
| Codex | `{PLUGIN_DIR}/.codex/agents/{name}.toml` | TOML | `{DMAP_PLUGIN_DIR}/resources/templates/runtime-adapters/codex.toml.tmpl` |
| Antigravity | `{PLUGIN_DIR}/.antigravity/agents/{name}.md` | Markdown (Manager UI 수동 로드 안내 포함) | `{DMAP_PLUGIN_DIR}/resources/templates/runtime-adapters/antigravity.md.tmpl` |

##### 수행 절차

1. `{PLUGIN_DIR}/agents/` 하위 각 에이전트 디렉토리를 순회
2. 에이전트별로 다음 메타를 수집:
   - `name` = 디렉토리명 (= frontmatter.name)
   - `description` = `AGENT.md` frontmatter의 `description`
   - `tier` = `agentcard.yaml`의 `tier`
   - `plugin` = `{PLUGIN_NAME}`
   - `fqn` = `{plugin}:{name}:{name}`
3. `{PLUGIN_DIR}/gateway/runtime-mapping.yaml`의 `tier_mapping` 섹션을 읽어
   **각 런타임별로 해결된 model**을 계산:
   - Claude Code / CoWork / Cursor / Antigravity: Claude 모델 (예: `opus`, `sonnet`, `haiku`)
   - Codex: OpenAI 모델 (예: `gpt-5.4`, `gpt-5.4-mini`)
4. 런타임별 템플릿을 로드하고 치환 변수(`{name}`, `{description}`, `{model}`, `{plugin}`, `{fqn}`) 적용
5. 결과 파일을 해당 경로에 Write (필요 시 디렉토리 생성)
6. 생성 결과 요약을 사용자에게 보고 (에이전트 N개 × 런타임 4개 = 파일 N*4개)

##### MUST 규칙
- SSOT(`agents/{name}/`) 내용은 본 단계에서 수정하지 않음
- 포인터 스텁은 `.gitignore`에 포함하지 않음 (Git 커밋 대상)
- tier→model 매핑은 본 단계에서 해결하여 스텁 frontmatter에 기록 (setup 단계에서 재계산하지 않음)
- Antigravity 지원이 불확실하므로, 해당 런타임은 "최선 노력" 생성하고 Manager UI 안내 주석 포함
- 필수 메타(name/description) 부재 시 빈 문자열 치환하지 말고 에러 보고 후 중단

##### 참조
- 상세 템플릿·변환 규칙: `{DMAP_PLUGIN_DIR}/resources/guides/agent-runtime-adapters.md`

#### Step 5. 스킬 개발
공통 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md`와  
스킬 표준 `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md`을 반드시 준수하여   
스킬별 디렉토리 및 SKILL.md 생성. setup 스킬은 반드시 포함.

(중요) **`## 에이전트 호출 규칙` 섹션은 위임형 스킬(Planning, Orchestrator, Core)에서 필수로 생성**   
- AI_RUNTIME(Claude Code, Claude CoWork, Cursor, AntiGravity, Codex 등)에 따라 해당 섹션을
  자동으로 무시·축약하는 경우가 있으므로, 스킬 표준의 형식(에이전트 FQN, 프롬프트 조립 절차,
  모델·도구·금지액션 구체화 규칙)을 **명시적으로 작성**하여 런타임과 무관하게 강제 적용됨
- 해당 섹션 누락 시 검증 실패로 처리하여 Step 5를 통과시키지 않음
- 세부 작성 규칙은 `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md`의
  "에이전트 호출 규칙 > 작성 가이드" 준수

| 스킬 | 유형 | 필수 | 설명 |
|------|------|:----:|------|
| setup | Setup (직결형) | 필수 | 플러그인 설치 및 초기 설정 |
| core | Core (위임형) | 선택 | 각 기능 스킬을 파이프라인으로 연결하여 특정 작업을 수행할 필요가 있는 경우만 생성 |
| help | Utility (직결형) | 권장 | 사용 가능한 명령 및 자동 라우팅 안내 |
| {기능 스킬} | Orchestrator/Planning | 상황별 | 핵심기능별 워크플로우 |

setup 스킬 필수 수행 사항:
- `{PLUGIN_DIR}/gateway/install.yaml` 기반 도구 설치
- `{PLUGIN_DIR}/gateway/runtime-mapping.yaml` 기반 tier-mapping의 모델을 최신 버전으로 업데이트하고 사용자에게 확인 요청. 갱신 확정 시 `{PLUGIN_DIR}/.claude/agents/*.md`, `.cursor/agents/*.md`, `.codex/agents/*.toml`, `.antigravity/agents/*.md` frontmatter의 `model:` 필드도 동일 매핑으로 일괄 치환 (본문은 수정 금지)   
- 커스텀 도구에 필요한 환경변수(.env) 파일 생성 및 설정
  - **생성 위치**: `{PLUGIN_DIR}/gateway/tools/.env` (고정 경로, 모든 커스텀 도구 공유)
  - API Key 등 민감 정보는 사용자에게 입력 요청하여 설정
- **Office 산출물 생성 플러그인의 경우 `install.yaml`의 `runtime_dependencies` 섹션 처리**:
  - setup 스킬이 `gateway/install.yaml` 읽을 때 `runtime_dependencies` 항목도 함께 처리
  - 항목별로 `runtime` 환경(node/python) 사전 요구 확인 → `check` 명령으로 기설치 여부 확인 → 미설치 시 `install` 명령 실행
  - 형식별 라이브러리 매핑은 Phase 3 Step 2 (Gateway 설정)에서 자동 등록됨
  - 런타임 미설치 시 명확한 에러 + 설치 안내 메시지 출력

setup 스킬 권장 사항:
- `help` 유틸리티 스킬 제공 (사용 가능한 명령 및 자동 라우팅 안내)

**Office 산출물 생성 플러그인 추가 규칙** (Phase 2 Step 0에서 감지된 경우):

- 형식별 빌더 스킬을 `{PLUGIN_DIR}/skills/{generate-pptx|generate-xlsx|generate-docx}/SKILL.md`에 작성
- 시작점: `{DMAP_PLUGIN_DIR}/resources/templates/office/{format}-builder-SKILL.md` 복사
- 빌더 스킬은 다음 Phase를 반드시 포함:
  1. **pptx만**: Spec Agent 위임 (5항목 프롬프트) → `spec.md` 산출
     **xlsx/docx**: 입력 데이터/본문 수집 (사용자 제공 또는 선행 에이전트 산출물)
  2. 가이드 로드 (`{DMAP_PLUGIN_DIR}/resources/guides/office/{format}-build-guide.md`)
  3. Build script 작성 (Write 도구) — 가이드의 검증 규칙 항 모두 준수
  4. Build 실행 (Bash 도구)
  5. 파일 존재·크기 검증 A — 빌드 확인 (실패 시 재시도 ≤3)
  6. **pptx만** — 검증 B — PowerShell COM 시각적 검토:
     - 아래 PS1 템플릿으로 `.temp/export-pptx.ps1`을 생성 후 슬라이드별 PNG 추출
     ```powershell
     $pptxPath = '<절대경로\{산출물}.pptx>'
     $outDir   = '<절대경로\preview>'
     if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
     Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint
     $ppt  = New-Object -ComObject PowerPoint.Application
     $pres = $ppt.Presentations.Open($pptxPath, 0, 0, 0)
     foreach ($i in 1..$pres.Slides.Count) {
         $pres.Slides.Item($i).Export("$outDir\slide-$i.png", 'PNG', 1600, 900)
     }
     $pres.Close(); $ppt.Quit()
     ```
     - PowerShell 실행 전 `Get-Process POWERPNT -ErrorAction SilentlyContinue | Stop-Process -Force`로 파일 잠금 해제
     - 추출된 PNG를 Read 도구로 열어 레이아웃·이미지 비율·텍스트 잘림 시각 확인
     - 이상 발견 시 build script 수정 → 재빌드 → 재검토 (최대 2회)
     - **기존 이미지 파일(`images/` 폴더)은 절대 삭제하지 말 것 — 레이아웃·크기만 조정**
     - 시각 검토 완료 후 임시 파일 정리: `Remove-Item '<preview경로>\*.png' -Force; Remove-Item '.temp\export-pptx.ps1' -Force`
  7. 사용자 보고 (절대 경로, 크기, 빌드 스크립트 경로, 시각 검토 결과 요약)
- 외부 변환 스킬(`anthropic-skills:pptx`/`xlsx` 등) 호출 금지 (모든 런타임 호환성 확보)

help 스킬 작성 규칙:
- SKILL.md에 명령 목록과 자동 라우팅 규칙을 **하드코딩**하여 즉시 출력하는 방식으로 작성
- 워크플로우 시작 부분에 다음 지시문 삽입:
  `**중요: 추가적인 파일 탐색이나 에이전트 위임 없이, 아래 내용을 즉시 사용자에게 출력하세요.**`
- `skills/` 디렉토리 스캔 등 런타임 탐색 금지 (토큰 낭비 방지)

#### Step 6. commands/ 진입점 생성

슬래시 명령으로 노출할 스킬의 진입점 파일 생성.

```markdown
# commands/{skill-name}.md
---
description: {스킬 설명}
---

1. 현재 작업 중인 프로젝트의 `{PLUGIN_DIR}/AGENTS.md` 파일을 "view_file" 등으로 꼼꼼히 읽으세요.
2. 파일에서 `DMAP_PLUGIN_DIR`의 위치를 파악할 뿐만 아니라, 그 안에 적힌 팀 행동원칙, 대화 가이드, 정직한 보고 등 "모든 프로젝트 지침"을 이번 작업 전체에 걸쳐 우선적으로 엄격히 준수하세요.
3. `{PLUGIN_DIR}/skills/{skill-name}/SKILL.md` 파일을 읽고 지시사항을 실행하세요.

```

#### Step 7. 커스텀 앱/CLI 개발

개발 계획서에 명시된 커스텀 도구 개발.

| 단계 | 내용 |
|------|------|
| 개발 | `{PLUGIN_DIR}/gateway/tools/{tool-name}/`에 소스 파일 생성. `.env` 로드는 아래 표준 패턴 사용 |
| 테스트 | 단위 테스트 및 통합 테스트 수행 |
| Gateway 등록 | `install.yaml`의 `custom_tools`에 등록, `runtime-mapping.yaml`의 `tool_mapping`에 매핑 |
| 리소스 카탈로그 등록 | `{PLUGIN_DIR}/resources/resource.md`에 도구 설명 및 사용법 기록 |

**커스텀 도구 `.env` 로드 표준 패턴** (Python):
```python
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"  # gateway/tools/.env
load_dotenv(env_path)
```
실행 위치와 무관하게 `{PLUGIN_DIR}/gateway/tools/.env`를 항상 정확히 참조함.

#### Step 8. README.md 작성

`{DMAP_PLUGIN_DIR}/resources/templates/plugin/README-plugin-template.md`를 참고하여 README.md 작성.

- 필수 섹션: 개요, 설치, 업그레이드, 사용법, 요구사항, 라이선스.
- {owner},{repo}, {marketplace-name}, {plugin-name}, {skill-name}, {HIGH/MEDIUM/LOW} 등 변수들을 실제값으로 치환 

> **Phase 3 완료**: 개발된 플러그인의 구조와 기능을 사용자에게 보고하고 검토 요청.

---


### Phase 4: AGENTS.md, CLAUDE.md 생성 

#### Step 1. AGENTS.md 생성
`{PLUGIN_DIR/output/team-plan-{PLUGIN_NAME}.md}` 파일과 을 기반으로 `{PLUGIN_DIR}/AGENTS.md` 생성

**AGENTS.md 구조:**

````markdown
# 팀 소개
## 팀명: `기본정보 > {플러그인명}
## 목표
`기본정보 > {목표}`

## 팀 행동원칙
- 'M'사상을 믿고 실천한다. : Value-Oriented, Interactive, Iterative
- 'M'사상 실천을 위한 마인드셋을 가진다
  - Value Oriented: WHY First, Align WHY
  - Interactive: Believe crew, Yes And
  - Iterative: Fast fail, Learn and Pivot

## 멤버
```
{역할}
- 프로파일: {이름}/{별명}/{성별}/{나이}
- 성향: {style 정보}
- 경력: {background 정보}

...반복...
```

## 대화 가이드
- 언어: 특별한 언급이 없는 경우 한국어를 사용
- 호칭: 실명 사용하지 않고 닉네임으로 호칭
- 질문: 프롬프트가 'q:'로 시작하면 질문을 의미함
  - Fact와 Opinion으로 나누어 답변
  - Fact는 출처 링크를 표시

## 최적안 도출
프롬프트가 'o:'로 시작하면 최적안 도출을 의미함
1. 각자의 생각을 얘기함
2. 의견을 종합하여 동일한 건 한 개만 남기고 비슷한 건 합침
3. 최적안 후보 5개를 선정함
4. 각 최적안 후보 5개에 대해 평가함
5. 최적안 1개를 선정함
6. `1)번 ~ 5)번` 과정을 3번 반복함
7. 최종으로 선정된 최적안을 제시함

## Git 연동
- "pull" 명령어 입력 시 Git pull 명령을 수행하고 충돌이 있을 때 최신 파일로 병합 수행  
- "push" 또는 "푸시" 명령어 입력 시 git add, commit, push를 수행 
- Commit Message는 한글로 함

## URL링크 참조
- URL링크는 WebFetch가 아닌 'curl {URL} > .temp/{filename}'명령으로 저장하여 참조함  
- 동일한 파일이 있으면 덮어 씀 

## 마크다운 작성 가이드
- 문서 작성 시 명사체(명사형 종결어미) 사용
  - 예시: "~한다" → "~함", "~이다" → "~임", "~된다" → "~됨"
  - 예시: "지원한다" → "지원", "사용할 수 있다" → "사용 가능"
- 한 줄은 120자 이내로 작성, 긴 문장은 적절히 줄바꿈
- 줄바끔 시 문장 끝에 스페이스 2개 + 줄바꿈
- 빈 줄(`\n\n`) 없이 줄바꿈하는 모든 경우, 줄 끝에 스페이스 2개 필수 (없으면 렌더링 시 한 줄로 합쳐짐)
- 간결하고 객관적인 기술 문서 스타일 유지

## 정직한 보고 규칙
### 핵심 원칙
- **실행하지 않은 것을 완료라고 보고하지 않는다**
- 문서 작성 ≠ 작업 완료. 문서는 실제 결과를 기록하는 것이지, 문서를 쓰면 완료가 되는 것이 아님
- 코드 작성 ≠ 동작 확인. 빌드 통과는 "코드가 컴파일된다"일 뿐, "서비스가 동작한다"가 아님

### 보고 시 체크리스트
1. 이 단계의 "완료 기준"이 무엇인지 먼저 확인
2. 그 기준을 실제로 충족했는지 증거(로그, 응답, 스크린샷) 확인

## Lessons Learned
> skill/agent 실행 중 확인된 시행착오와 교훈을 기록한다.
> 모든 에이전트는 작업 전 이 섹션을 반드시 참고한다.

### 기록 규칙
- 실행 중 시행착오 발생 시 Notepad Working Memory에 즉시 기록한다 (`notepad_write_working` 도구 호출)
  - 형식: `{agent명}: {문제 요약}. {해결 방법}. {관련 파일}`
- 반복 검증된 핵심 교훈만 이 섹션(AGENTS.md)에 승격한다 (Edit 도구로 추가)
  - 형식: `- [HIGH/MED] {교훈 한 줄} — {출처: agent명/단계명}`
- 최대 20항목 유지, 넘으면 오래된 MED부터 정리
- 기존 항목과 중복되는 내용은 기록하지 않음

### 교훈 목록

## {플러그인명} 플러그인
`@{스킬명}` 입력 시 해당 스킬(`/{플러그인명}:{스킬명}`)을 즉시 실행함.

- `@setup`: 플러그인 초기 설정
- `@help`: 사용 안내
- `@{스킬명}`: {skills/*/SKILL.md frontmatter description 값}

## 플러그인 변수 
- AI_RUNTIME: 런타임 종류. Claude Code 또는 Claude CoWork 
- DMAP_PLUGIN_DIR: DMAP 플러그인의 루트 절대 경로 
- PLUGIN_DIR: 생성할 플러그인의 루트 절대 경로 
- PLUGIN_NAME: 생성할 플러그인 이름

## Advisor 활용 규칙
- Advisor 모델은 Opus 가장 최신 버전으로 설정  
- 실제 작업을 시작하기 전에 먼저 Advisor를 호출
- 작업 진행 중 Advisor의 자문이 필요하면 호출. 단, 최대 3번까지만 호출
- 작업 완료 후 한번 더 Advisor를 호출
- Advisor의 응답은 최대 200자를 초과하지 않게 함 

```

````

**스킬 약어 구성 규칙:**
- `skills/*/SKILL.md` frontmatter의 `name`과 `description`을 읽어 구성
- `@{스킬명}` = frontmatter `name` 값
- `{설명}` = frontmatter `description` 값
- setup, help는 항상 첫 두 항목으로 고정, 나머지는 생성된 기능 스킬 순으로 나열
- 외부호출 스킬(ext-*)은 목록에서 제외

**멤버 구성 규칙:**
- `agents/*/agentcard.yaml`에서 `persona.profile`과 `persona.style`, `persona.background`를 읽어 구성
- `{역할}` = `persona.profile.role`
- `{이름}` = `persona.profile.name`
- `{별명}` = `persona.profile.nickname`
- `{성별}` = `persona.profile.gender`
- `{나이}` = `persona.profile.age`
- `{style 정보}` = `persona.style` (첫 줄만 요약)
- `{background 정보}` = `persona.background` (첫 줄만 요약)


#### Step 2. CLAUDE.md 생성
`{PLUGIN_DIR}/CLAUDE.md`을 아래 내용을 제일 상단에 삽입하여 생성
```
@AGENTS.md

```

#### Step 3. Codex/Antigravity 시스템 프롬프트 추가   
Codex와 Antigravity를 위한 플러그인 설정을 하려면 추가 파일들이 필요하고  
플러그인과 마켓플레이스를 이중으로 관리하게 되어 복잡도가 증가하므로,   
각 AI 런타임의 시스템 프롬프트 파일에 아래 내용을 추가합     

아래 두 파일에 추가함.    
Codex:  `~/.codex/AGENTS.md`에 아래 지침을 추가함   
Antigravity: `~/.gemini/antigravity/knowledge/AGENTS.md`에 아래 지침을 추가함

```
## 플러그인 슬래시 명령 규칙

- `/{plugin}:{skill}` 형태의 슬래시 명령이 들어오면 일반 텍스트가 아니라 플러그인 수행으로 간주함
- 이 패턴은 일반 명령 해석 및 일반 스킬 트리거 규칙보다 우선 적용함
- 먼저 `claude plugin marketplace list`를 수행하여 `{plugin}` 이름과 일치하는 marketplace 항목을 찾음
- marketplace 항목을 찾지 못하면 플러그인을 찾지 못한 것으로 보고 중단함

### Source: Directory

- marketplace 항목의 Source가 `Directory`이면 해당 디렉토리를 플러그인 루트로 사용함
- `{directory}/skills/{skill}/SKILL.md`를 읽고 그 스킬 절차를 수행함
- `SKILL.md`가 없으면 스킬 문서를 찾지 못한 것으로 보고 중단함

### Source: Git

- marketplace 항목의 Source가 `Git`이면 `claude plugin list`를 수행하여 `*@{plugin}` 형식의 설치 항목을 찾음
- 해당 항목의 `Version` 값을 구함
- 버전을 찾았으면 `~/.claude/plugins/cache/{plugin}/{version}/skills/{skill}/SKILL.md`를 읽고 그 스킬 절차를 수행함
- 설치 항목 또는 Version을 찾지 못하면 설치된 플러그인 버전 확인 실패로 보고 중단함
- `SKILL.md`가 없으면 스킬 문서를 찾지 못한 것으로 보고 중단함

### 추가 규칙

- `claude plugin marketplace list`의 marketplace 이름을 `{plugin}`의 기준값으로 사용함
- `claude plugin list`에서는 `package@marketplace` 표기 중 marketplace 부분이 `{plugin}`과 일치하는 항목을 사용함
- 플러그인 스킬 해석에 성공한 경우 해당 `SKILL.md`의 지침을 실제로 수행함
- 플러그인 또는 스킬을 찾지 못한 경우 추측으로 대체 수행하지 않음
```

---

### Phase 5: 검증 및 완료

개발된 플러그인이 DMAP 표준을 준수하는지 최종 검증.

#### Step 1. 전체 검증

| 검증 항목 | 확인 내용 |
|----------|----------|
| 프로젝트 구조 | 표준 디렉토리 구조를 준수 |
| 필수 파일 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 존재 |
| 필수 파일 구조 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 이 스킬 메인 표준 준수 |
| 공유자원 복사 | `combine-prompt.md` 복사 확인 | 
| 에이전트 쌍 | 모든 에이전트에 `AGENT.md` + `agentcard.yaml` 존재 |
| 스킬 구조 | 모든 스킬에 `SKILL.md` 존재, frontmatter 포함 |
| setup 스킬 | setup 스킬 존재 |
| help 스킬 (권장) | help 유틸리티 스킬 존재, 즉시 출력 방식 |
| Gateway | `install.yaml` + `runtime-mapping.yaml` 존재 |
| 슬래시 명령 | `commands/` 진입점 파일 존재 |
| 도구 매핑 | `tools.yaml`의 추상 도구가 `runtime-mapping.yaml`에 매핑 |
| 티어 매핑 | `agentcard.yaml`의 tier가 `runtime-mapping.yaml`에 매핑 |
| 오케스트레이션 구조 | 에이전트가 다른 에이전트를 호출하는 구조가 아닌지 확인 |
| README | 필수 섹션(개요, 설치, 업그레이드, 사용법, 요구사항, 라이선스) 포함 |
| Office 산출물 생성 패턴 (해당 시) | pptx는 spec-writer 에이전트 + 빌더 스킬 2단계 패턴, xlsx/docx는 빌더 스킬 단독 1단계 패턴 준수 |
| Office 빌드 검증 규칙 (해당 시) | 빌더 스킬 SKILL.md가 가이드 검증 규칙(pptx 6절 11항 / xlsx 4절 9항 / docx 4절 9항) 명시 적용 |
| Office pptx 시각적 검토 규칙 (pptx 해당 시) | 빌더 스킬 SKILL.md에 PowerShell COM 시각적 검토 Phase 포함 (PNG 추출 → 레이아웃 확인 → 재빌드 ≤2회), `images/` 기존 이미지 삭제 금지 규칙 명시 |
| Office 런타임 의존성 (해당 시) | `gateway/install.yaml`의 `runtime_dependencies` 섹션에 형식별 빌드 라이브러리(`pptxgenjs`/`openpyxl`/`python-docx`) 등록, setup 스킬이 이를 참조 |
| Office 외부 변환 스킬 의존 금지 | 빌더 스킬 SKILL.md에 `anthropic-skills:pptx`/`xlsx` 등 외부 호출 없음 (모든 런타임 호환성 확보) |
| `.env` 경로 | `gateway/tools/.env` 존재 확인, 모든 커스텀 도구가 `Path(__file__).resolve().parent.parent / ".env"` 패턴으로 로드하는지 코드 검증 |

#### Step 2. 사용자에게 개발완료 보고

최종 산출물 요약 보고:
- 플러그인 디렉토리 구조 (트리)
- 생성된 에이전트/스킬 목록
- 슬래시 명령 목록
- 설치 방법

#### Step 3. GitHub 배포 여부 문의

사용자에게 "개발 완료된 플러그인을 GitHub에 배포할까요?" 문의.
- 동의 시: `CHAIN>>>/dmap:publish` 출력으로 스킬 전환 (플러그인 디렉토리 경로, 플러그인명 전달)
- 거절 시: "나중에 `/dmap:publish`로 언제든 배포할 수 있습니다" 안내

> **Phase 4 완료**: 플러그인 개발 완료. 사용자에게 최종 보고.

[Top](#develop-plugin)

---

## 완료 조건

- 4-Phase 모두 사용자 승인 완료
- 검증 항목 전체 통과
- README.md 필수 섹션 포함

[Top](#develop-plugin)

---

## 취소/재개

- 취소: `/oh-my-claudecode:cancel` 또는 사용자 요청 시 즉시 중단
- 재개: 마지막 완료된 Phase부터 재시작 가능

[Top](#develop-plugin)
