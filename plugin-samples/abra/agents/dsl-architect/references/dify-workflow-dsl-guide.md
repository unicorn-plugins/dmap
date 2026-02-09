# Dify Workflow DSL 작성 가이드

- [Dify Workflow DSL 작성 가이드](#dify-workflow-dsl-작성-가이드)
  - [1. DSL 개요](#1-dsl-개요)
  - [2. 최상위 구조](#2-최상위-구조)
    - [2.1 전체 구조 개요](#21-전체-구조-개요)
    - [2.2 app 섹션](#22-app-섹션)
    - [2.3 dependencies 섹션](#23-dependencies-섹션)
    - [2.4 kind 및 version](#24-kind-및-version)
  - [3. workflow 섹션](#3-workflow-섹션)
    - [3.1 environment_variables (환경 변수)](#31-environment_variables-환경-변수)
    - [3.2 conversation_variables (대화 변수)](#32-conversation_variables-대화-변수)
    - [3.3 features (기능 설정)](#33-features-기능-설정)
    - [3.4 graph (그래프)](#34-graph-그래프)
      - [3.4.1 edges (엣지)](#341-edges-엣지)
      - [3.4.2 nodes (노드)](#342-nodes-노드)
      - [3.4.3 viewport (뷰포트)](#343-viewport-뷰포트)
  - [4. 변수 참조 규칙](#4-변수-참조-규칙)
    - [4.1 노드 출력 변수 참조](#41-노드-출력-변수-참조)
    - [4.2 환경 변수 참조](#42-환경-변수-참조)
    - [4.3 대화 변수 참조](#43-대화-변수-참조)
    - [4.4 시스템 변수 참조](#44-시스템-변수-참조)
    - [4.5 value_selector 방식](#45-value_selector-방식)
  - [5. 노드 유형별 DSL 작성법](#5-노드-유형별-dsl-작성법)
    - [5.1 start (시작 노드)](#51-start-시작-노드)
    - [5.2 trigger (트리거 노드)](#52-trigger-트리거-노드)
    - [5.3 llm (LLM 노드)](#53-llm-llm-노드)
    - [5.4 code (코드 노드)](#54-code-코드-노드)
    - [5.5 if-else (조건 분기 노드)](#55-if-else-조건-분기-노드)
    - [5.6 http-request (HTTP 요청 노드)](#56-http-request-http-요청-노드)
    - [5.7 tool (도구 노드)](#57-tool-도구-노드)
    - [5.8 knowledge-retrieval (지식 검색 노드)](#58-knowledge-retrieval-지식-검색-노드)
    - [5.9 question-classifier (질문 분류기 노드)](#59-question-classifier-질문-분류기-노드)
    - [5.10 agent (에이전트 노드)](#510-agent-에이전트-노드)
    - [5.11 answer (응답 노드 - Chatflow 전용)](#511-answer-응답-노드---chatflow-전용)
    - [5.12 end (출력 노드 - Workflow 전용)](#512-end-출력-노드---workflow-전용)
    - [5.13 iteration (반복 노드)](#513-iteration-반복-노드)
    - [5.14 loop (루프 노드)](#514-loop-루프-노드)
    - [5.15 template-transform (템플릿 노드)](#515-template-transform-템플릿-노드)
    - [5.16 variable-aggregator (변수 집계기 노드)](#516-variable-aggregator-변수-집계기-노드)
    - [5.17 document-extractor (문서 추출기 노드)](#517-document-extractor-문서-추출기-노드)
    - [5.18 assigner (변수 할당기 노드)](#518-assigner-변수-할당기-노드)
    - [5.19 parameter-extractor (파라미터 추출기 노드)](#519-parameter-extractor-파라미터-추출기-노드)
    - [5.20 list-operator (리스트 연산자 노드)](#520-list-operator-리스트-연산자-노드)
  - [6. 실전 예제](#6-실전-예제)
    - [6.1 간단한 Workflow: 텍스트 요약기](#61-간단한-workflow-텍스트-요약기)
    - [6.2 조건 분기 Workflow: 문의 분류 및 라우팅](#62-조건-분기-workflow-문의-분류-및-라우팅)
    - [6.3 Chatflow: 파일 번역 봇](#63-chatflow-파일-번역-봇)
  - [7. 플로우 로직 패턴](#7-플로우-로직-패턴)
    - [7.1 직렬 실행](#71-직렬-실행)
    - [7.2 병렬 실행](#72-병렬-실행)
    - [7.3 조건 분기 후 합류](#73-조건-분기-후-합류)
  - [8. 오류 처리](#8-오류-처리)
    - [8.1 노드별 오류 유형](#81-노드별-오류-유형)
  - [9. DSL Import 검증](#9-dsl-import-검증)
    - [9.1 Import 검증 흐름](#91-import-검증-흐름)
    - [9.2 Import 실패 주요 원인 Top 10](#92-import-실패-주요-원인-top-10)
    - [9.3 YAML 작성 시 주의사항](#93-yaml-작성-시-주의사항)
    - [9.4 사전 검증 도구](#94-사전-검증-도구)
  - [10. DSL 내보내기 및 가져오기](#10-dsl-내보내기-및-가져오기)
  - [11. 모범 사례 및 주의사항](#11-모범-사례-및-주의사항)

---

## 1. DSL 개요

Dify DSL(Domain-Specific Language)은 Dify 앱의 전체 구성을 YAML 형식으로 표현하는 언어임.
Dify Studio에서 구축한 워크플로우를 `.yml` 파일로 내보내거나,
DSL 파일에서 직접 앱을 생성하여 다른 Dify 인스턴스로 이식 및 공유 가능.

**두 가지 앱 유형:**

| 유형 | mode 값 | 설명 |
|------|---------|------|
| Workflow | `workflow` | 단일 턴 작업 처리, Output(End) 노드로 결과 반환 |
| Chatflow | `advanced-chat` | 대화형 앱, Answer 노드로 응답 반환 |

[Top](#dify-workflow-dsl-작성-가이드)

---

## 2. 최상위 구조

### 2.1 전체 구조 개요

DSL 파일의 최상위 구조는 다음 4개 섹션으로 구성:

```yaml
app:          # 앱 메타데이터
  ...
dependencies: # 외부 플러그인 의존성
  ...
kind: app     # 리소스 종류 (항상 'app')
version: 0.5.0  # DSL 버전
workflow:     # 워크플로우 본체
  ...
```

### 2.2 app 섹션

앱의 기본 정보를 정의:

```yaml
app:
  description: '앱에 대한 설명'
  icon: "\U0001F916"        # 이모지 아이콘 (유니코드 이스케이프)
  icon_background: '#FFEAD5' # 아이콘 배경색 (HEX)
  icon_type: emoji           # 아이콘 타입 (image, emoji, link)
  mode: workflow             # 'workflow' 또는 'advanced-chat'
  name: 앱 이름
  use_icon_as_answer_icon: false
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | O | 앱 이름 |
| `mode` | O | `workflow` (Workflow) 또는 `advanced-chat` (Chatflow) |
| `description` | X | 앱 설명 |
| `icon` | X | 이모지 아이콘 |
| `icon_background` | X | 아이콘 배경색 |
| `icon_type` | X | 아이콘 타입: `image`, `emoji`, `link` |
| `use_icon_as_answer_icon` | X | 응답 아이콘으로 앱 아이콘 사용 여부 |

### 2.3 dependencies 섹션

외부 마켓플레이스 플러그인(모델 프로바이더, 도구 등)의 의존성 목록:

```yaml
dependencies:
- current_identifier: null
  type: marketplace
  value:
    marketplace_plugin_unique_identifier: langgenius/openai:0.2.8@aae2be09...
    version: null
- current_identifier: null
  type: marketplace
  value:
    marketplace_plugin_unique_identifier: langgenius/groq:0.0.12@38f75b2f...
    version: null
```

> 플러그인을 사용하지 않는 경우 빈 배열 `[]`로 설정 가능

**의존성 타입:**

| type 값 | 설명 |
|---------|------|
| `marketplace` | Dify 마켓플레이스의 공식 플러그인 |
| `github` | GitHub 저장소 기반 플러그인 |
| `package` | 패키지 형태의 플러그인 |

**주의사항:**
- `marketplace_plugin_unique_identifier`에 포함된 해시(`@` 뒤의 값)가 실제 마켓플레이스에
  등록된 값과 일치해야 함. 가짜 해시 사용 시 Import 후 플러그인 확인 단계에서 실패
- DSL v0.1.5 이하 버전에서는 워크플로우/모델에서 의존성을 자동 추출하므로
  `dependencies` 섹션을 직접 작성할 필요 없음

### 2.4 kind 및 version

```yaml
kind: app        # 항상 'app' 고정
version: 0.5.0   # 현재 DSL 버전
```

**버전 호환성 검증 규칙:**

Import 시 DSL 파일의 `version`과 Dify 인스턴스의 현재 DSL 버전을 비교하여 처리:

| 조건 | Import 상태 | 설명 |
|------|------------|------|
| imported > current | PENDING | 사용자 확인 필요 (더 높은 버전) |
| imported.major < current.major | PENDING | 메이저 버전 차이로 호환성 확인 필요 |
| imported.minor < current.minor | COMPLETED_WITH_WARNINGS | 경고와 함께 진행 |
| 그 외 (호환) | COMPLETED | 정상 진행 |
| 파싱 실패 | FAILED | Import 실패 |

> `version` 필드는 반드시 문자열 타입이어야 함. `version: 0.5.0`(숫자)이 아닌
> `version: "0.5.0"`(문자열) 형식 사용 권장. YAML에서 따옴표 없이 `0.5.0`을 쓰면
> 문자열로 해석되지만, 명시적 따옴표가 더 안전함.

[Top](#dify-workflow-dsl-작성-가이드)

---

## 3. workflow 섹션

워크플로우의 실제 로직을 정의하는 핵심 섹션:

```yaml
workflow:
  conversation_variables: []   # 대화 변수 (Chatflow 전용)
  environment_variables: []    # 환경 변수
  features: {}                 # 앱 기능 설정
  graph:                       # 노드 및 연결 그래프
    edges: []
    nodes: []
    viewport: {}
  rag_pipeline_variables: []   # RAG 파이프라인 변수
```

### 3.1 environment_variables (환경 변수)

API 키 등 민감한 정보를 저장하는 상수 변수. 워크플로우 실행 중 변경 불가:

```yaml
environment_variables:
- description: 'Slack 결제팀 웹훅 URL'
  id: ec77ba47-3714-443f-8f90-868c5feff1ae
  name: SLACK_WEBHOOK_PAYMENT
  selector:
  - env
  - SLACK_WEBHOOK_PAYMENT
  value: https://hooks.slack.com/services/...
  value_type: string
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `id` | X | UUID 형식의 고유 식별자 |
| `name` | O | 변수 이름 (대문자 + 언더스코어 권장) |
| `value` | O | 변수 값 |
| `value_type` | O | 데이터 타입 (`string`, `number` 등) |
| `selector` | X | 참조 경로 (`['env', '변수명']`) |
| `description` | X | 설명 |

**검증 규칙:**
- `name`, `value_type`, `value` 3개 필드는 필수. 누락 시 VariableError 발생
- 변수 데이터 크기 제한: 200KB (MAX_VARIABLE_SIZE)
- `value_type`은 아래 지원 목록의 값만 허용

**지원 value_type:**

| value_type | 설명 |
|-----------|------|
| `string` | 문자열 |
| `secret` | 비밀 문자열 |
| `number` | 숫자 (정수/실수 자동 판별) |
| `integer` | 정수 |
| `float` | 실수 |
| `boolean` | 불리언 |
| `object` | 객체 |
| `array[string]` | 문자열 배열 |
| `array[number]` | 숫자 배열 |
| `array[object]` | 객체 배열 |
| `array[boolean]` | 불리언 배열 |

### 3.2 conversation_variables (대화 변수)

Chatflow 전용. 대화 세션 동안 상태를 유지하는 변수:

```yaml
conversation_variables:
- description: '번역할 텍스트'
  id: e520bb9f-da6f-49a3-9da6-a3c74f1d68d6
  name: text
  selector:
  - conversation
  - text
  value: ''             # 초기값
  value_type: string    # string, number, boolean, object, array[string] 등
```

> Variable Assigner(assigner) 노드를 통해 업데이트 가능

### 3.3 features (기능 설정)

앱의 부가 기능 설정:

```yaml
features:
  file_upload:
    allowed_file_extensions:    # 허용 확장자
    - .JPG
    - .PNG
    - .PDF
    allowed_file_types:         # 허용 파일 유형
    - image
    - document
    allowed_file_upload_methods: # 업로드 방식
    - local_file
    - remote_url
    enabled: false              # 파일 업로드 활성화 여부
    fileUploadConfig:
      file_size_limit: 15       # 파일 크기 제한 (MB)
      workflow_file_upload_limit: 10
    number_limits: 3            # 최대 파일 수
  opening_statement: ''         # 대화 시작 메시지 (Chatflow)
  retriever_resource:
    enabled: false              # 인용 표시
  sensitive_word_avoidance:
    enabled: false              # 민감어 필터링
  speech_to_text:
    enabled: false              # 음성->텍스트
  suggested_questions: []       # 제안 질문 목록
  suggested_questions_after_answer:
    enabled: false              # 답변 후 후속 질문 제안
  text_to_speech:
    enabled: false              # 텍스트->음성
    language: ''
    voice: ''
```

**모드별 검증 대상 피처:**

| 앱 모드 | 검증 대상 피처 |
|---------|--------------|
| `workflow` | file_upload, text_to_speech, sensitive_word_avoidance |
| `advanced-chat` | file_upload, opening_statement, suggested_questions, speech_to_text, text_to_speech, retriever_resource, sensitive_word_avoidance |

> workflow 모드에서 opening_statement, suggested_questions, speech_to_text 등을
> 설정해도 무시됨. advanced-chat 모드에서만 유효.

### 3.4 graph (그래프)

워크플로우의 노드와 연결을 정의하는 핵심 구조:

```yaml
graph:
  edges: []      # 노드 간 연결
  nodes: []      # 노드 목록
  viewport:      # 캔버스 뷰 설정
    x: 0
    y: 0
    zoom: 0.8
```

#### 3.4.1 edges (엣지)

노드 간 연결을 정의. 워크플로우의 실행 흐름을 결정:

```yaml
edges:
- data:
    sourceType: start        # 출발 노드 유형
    targetType: llm          # 도착 노드 유형
  id: edge-start-llm         # 엣지 고유 ID
  source: '1'                # 출발 노드 ID
  sourceHandle: source       # 출발 핸들 (source, true, false 등)
  target: '2'                # 도착 노드 ID
  targetHandle: target       # 도착 핸들 (항상 target)
  type: custom               # 항상 'custom'
```

**sourceHandle 값:**

| 값 | 사용 상황 |
|----|----------|
| `source` | 일반 노드의 기본 출력 |
| `true` | if-else 노드의 IF/ELIF 조건 충족 시 |
| `false` | if-else 노드의 ELSE 경로 |
| `{case_id}` | if-else 노드의 ELIF 분기 ID |

#### 3.4.2 nodes (노드)

각 노드의 구성 정보:

```yaml
nodes:
- data:
    desc: '노드 설명'
    selected: false
    title: 노드 제목
    type: start              # 노드 유형
    # ... 노드 유형별 추가 속성
  height: 186                # 노드 높이 (px)
  id: '1'                    # 노드 고유 ID
  position:                  # 캔버스 위치
    x: 3.75
    y: 285.75
  positionAbsolute:          # 절대 위치
    x: 3.75
    y: 285.75
  selected: false
  type: custom               # 항상 'custom' (custom-note: 메모)
  width: 242                 # 노드 너비 (px)
```

**노드 공통 필드:**

| 필드 | 설명 |
|------|------|
| `id` | 노드 고유 ID (문자열, 숫자 또는 타임스탬프 형식) |
| `data.type` | 노드 유형 (start, llm, code, if-else 등) |
| `data.title` | 캔버스에 표시되는 노드 제목 |
| `data.desc` | 노드 설명 |
| `data.selected` | 선택 상태 (보통 false) |
| `position` | 캔버스 상 위치 좌표 |
| `height`, `width` | 노드 크기 |

#### 3.4.3 viewport (뷰포트)

캔버스 뷰 설정:

```yaml
viewport:
  x: -367.9    # X 오프셋
  y: 29.4      # Y 오프셋
  zoom: 0.8    # 확대/축소 비율
```

[Top](#dify-workflow-dsl-작성-가이드)

---

## 4. 변수 참조 규칙

Dify DSL에서 변수를 참조하는 두 가지 방식이 존재:

### 4.1 노드 출력 변수 참조

프롬프트, URL, 요청 본문 등 텍스트 필드에서 사용:

```
{{#노드ID.변수명#}}
```

**예시:**
```
{{#1.customer_name#}}     -> 노드 '1'의 customer_name 변수
{{#2.text#}}               -> 노드 '2'의 text 출력
{{#9.category#}}           -> 노드 '9'의 category 변수
```

### 4.2 환경 변수 참조

```
{{#env.변수명#}}
```

**예시:**
```
{{#env.SLACK_WEBHOOK_PAYMENT#}}
{{#env.API_KEY#}}
```

### 4.3 대화 변수 참조

Chatflow에서 대화 변수 참조:

```
{{#conversation.변수명#}}
```

**예시:**
```
{{#conversation.text#}}
{{#conversation.user_preference#}}
```

### 4.4 시스템 변수 참조

```
{{#sys.변수명#}}
```

| 변수명 | 설명 |
|--------|------|
| `sys.user_id` | 사용자 ID |
| `sys.app_id` | 앱 ID |
| `sys.workflow_id` | 워크플로우 ID |
| `sys.workflow_run_id` | 실행 ID |
| `sys.timestamp` | 실행 시작 시간 |
| `sys.query` | Chatflow 사용자 입력 텍스트 |
| `sys.files` | 사용자 업로드 파일 |
| `sys.dialogue_count` | 대화 횟수 (Chatflow) |

### 4.5 value_selector 방식

노드 구성에서 프로그래밍적으로 변수를 참조할 때 배열 형식 사용:

```yaml
value_selector:
- '1'            # 노드 ID
- customer_name  # 변수명
```

**특수 셀렉터:**
```yaml
# 환경 변수
selector:
- env
- SLACK_WEBHOOK_PAYMENT

# 대화 변수
selector:
- conversation
- text

# 시스템 변수
variable_selector:
- sys
- query
```

[Top](#dify-workflow-dsl-작성-가이드)

---

## 5. 노드 유형별 DSL 작성법

### 5.1 start (시작 노드)

모든 워크플로우의 진입점. 캔버스당 하나만 존재 가능:

```yaml
- data:
    desc: '사용자 입력 수집'
    title: 시작
    type: start
    variables:
    - label: 고객명              # UI 표시 레이블
      max_length: 100            # 최대 글자 수
      options: []                # 선택 옵션 (select 타입용)
      required: true             # 필수 여부
      type: text-input           # 입력 유형
      variable: customer_name    # 변수명 (영문)
    - label: 문의채널
      options:
      - Gmail
      - 콜센터
      required: true
      type: select               # 드롭다운 선택
      variable: inquiry_channel
    - label: 문의내용
      max_length: 2000
      options: []
      required: true
      type: paragraph            # 멀티라인 텍스트
      variable: inquiry_content
    - label: 파일
      allowed_file_extensions: []
      allowed_file_types:
      - document
      allowed_file_upload_methods:
      - local_file
      - remote_url
      max_length: 5
      required: false
      type: file                 # 파일 업로드
      variable: uploaded_file
  id: '1'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 (모든 노드 공통) |
| `type` | O | `start` 고정 |
| `variables` | X | Sequence[VariableEntity], 기본값: 빈 리스트 |

**입력 유형(type) 종류:**

| type | 설명 | 주요 속성 |
|------|------|----------|
| `text-input` | 짧은 텍스트 (256자) | `max_length` |
| `paragraph` | 멀티라인 텍스트 | `max_length` |
| `select` | 드롭다운 선택 | `options: [옵션1, 옵션2]` |
| `number` | 숫자 | - |
| `file` | 단일 파일 | `allowed_file_types`, `allowed_file_extensions` |
| `file-list` | 파일 목록 | 위와 동일 |
| `json` | JSON 코드 | - |

### 5.2 trigger (트리거 노드)

Workflow에서 User Input 대신 사용할 수 있는 자동 실행 시작 노드.
스케줄 또는 외부 이벤트에 응답하여 워크플로우를 자동으로 실행:

```yaml
- data:
    desc: '매일 오전 9시 자동 실행'
    title: 트리거
    type: trigger
    trigger_mode: schedule        # schedule 또는 webhook
    schedule:
      cron: '0 9 * * *'          # Cron 표현식
      timezone: Asia/Seoul
  id: '1'
```

**주요 특성:**
- User Input과 Trigger는 상호 배타적 (동일 캔버스에서 함께 사용 불가)
- Trigger로 시작된 워크플로우는 독립 웹 앱이나 MCP 서버로 배포 불가
- Chatflow는 Trigger로 시작할 수 없음

**트리거 유형:**

| 유형 | 설명 |
|------|------|
| `schedule` | Cron 표현식 기반 정기 실행 |
| `webhook` | 외부 시스템 이벤트에 의한 실행 |

> DSL 내부의 노드 타입 값은 `trigger`가 아닌 세부 타입으로 구분됨:
> `trigger-webhook`, `trigger-schedule`, `trigger-plugin`
> 이 3가지가 Dify 소스의 NodeType enum에 정의된 유효한 트리거 타입임.

### 5.3 llm (LLM 노드)

언어 모델을 호출하여 텍스트 처리:

```yaml
- data:
    context:
      enabled: false             # 컨텍스트 변수 활성화
      variable_selector: []      # 컨텍스트 소스 (Knowledge Retrieval 결과 등)
    desc: 'LLM으로 문의 분류'
    model:
      completion_params:
        max_tokens: 2048         # 최대 토큰
        temperature: 0.1         # 0=결정론적, 1=창의적
      mode: chat                 # chat 또는 completion
      name: gpt-4o               # 모델명
      provider: langgenius/openai/openai  # 프로바이더 경로
    prompt_template:
    - id: system-prompt
      role: system               # system, user, assistant
      text: "당신은 고객 문의 분류 전문가입니다.\n..."
    - id: user-prompt
      role: user
      text: '문의 내용: {{#1.inquiry_content#}}'
    selected: false
    structured_output_enabled: false   # 구조화된 출력
    title: LLM 문의분류
    type: llm
    vision:
      enabled: false             # 비전 기능
      configs:
        detail: high             # high 또는 low
        variable_selector:       # 이미지 소스
        - '1'
        - files
    memory:                      # 메모리 설정 (Chatflow)
      query_prompt_template: '{{#sys.query#}}'
      window:
        enabled: true
        size: 15                 # 보존할 메시지 수
  id: '2'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `llm` 고정 |
| `model` | O | ModelConfig 객체. provider, name, mode, completion_params 포함 필수 |
| `model.provider` | O | 예: `langgenius/openai/openai`, `langgenius/groq/groq` |
| `model.name` | O | 예: `gpt-4o`, `llama-3.1-8b-instant` |
| `model.mode` | O | `chat` 또는 `completion` |
| `model.completion_params` | O | dict 타입 (temperature, max_tokens 등) |
| `prompt_template` | O | chat 모드: `[{role, text}]` 배열, completion 모드: text 문자열 |
| `context` | O | `{enabled: bool, variable_selector: []}` 객체 |
| `memory` | X | 메모리 설정 (Chatflow에서 주로 사용) |
| `vision` | X | 비전 설정 |
| `structured_output_enabled` | X | 구조화 출력 활성화 여부 |

> LLM 노드는 전체 노드 중 가장 복잡한 검증 로직을 가짐.
> model.provider/name 누락, context 객체 누락, prompt_template 구조 불일치가
> 가장 흔한 Import 실패 원인임.

**프롬프트 role 종류:**

| role | 설명 |
|------|------|
| `system` | 시스템 지시 (동작 정의) |
| `user` | 사용자 입력 |
| `assistant` | 어시스턴트 예시 응답 |

**구조화된 출력 (Structured Output):**

LLM이 특정 JSON 스키마에 맞는 출력을 생성하도록 강제:

```yaml
structured_output_enabled: true
structured_output:
  schema:
    type: object
    properties:
      category:
        type: string
        description: '문의 카테고리'
        enum: ['결제', '배송', '일반']
      urgency:
        type: string
        description: '긴급도'
      summary:
        type: string
        description: '요약'
    required: ['category', 'urgency', 'summary']
```

구조화된 출력의 세 가지 구성 방법:

| 방법 | 설명 | 사용 시점 |
|------|------|----------|
| 시각적 편집기 | UI에서 필드/타입 정의 | 간단한 구조 |
| JSON 스키마 | JSON Schema 직접 작성 | 복잡한 중첩 객체 |
| AI 생성 | 자연어 설명으로 자동 생성 | 빠른 프로토타이핑 |

> 구조화된 출력 활성화 시 LLM 응답이 `text` 대신 정의된 스키마 필드별 변수로 출력

**컨텍스트(RAG) 연결:**
```yaml
context:
  enabled: true
  variable_selector:
  - '3'          # Knowledge Retrieval 노드 ID
  - result       # 검색 결과 변수
```

### 5.4 code (코드 노드)

Python 또는 JavaScript 코드 실행:

```yaml
- data:
    code: |
      import json

      def main(llm_output: str) -> dict:
          try:
              result = json.loads(llm_output)
              return {
                  "category": result.get("category", "일반"),
                  "summary": result.get("summary", "")
              }
          except json.JSONDecodeError:
              return {
                  "category": "일반",
                  "summary": "파싱 실패"
              }
    code_language: python3       # python3 또는 javascript
    desc: 'JSON 파싱'
    outputs:                     # 출력 변수 정의 (필수)
      category:
        children: null
        type: string
      summary:
        children: null
        type: string
    title: JSON 파싱
    type: code
    variables:                   # 입력 변수 매핑
    - value_selector:
      - '2'                     # 소스 노드 ID
      - text                    # 소스 변수명
      variable: llm_output      # 코드 내 변수명
  id: '9'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `code` 고정 |
| `code` | O | 실행할 코드 문자열 |
| `code_language` | O | `python3` 또는 `javascript` |
| `outputs` | O | dict[str, Output] 형식 |
| `variables` | O | list[VariableSelector] 입력 변수 매핑 |

**출력 변수 type (허용/금지):**

| 구분 | type 값 |
|------|--------|
| 허용 | `string`, `number`, `object`, `boolean`, `array[string]`, `array[number]`, `array[object]`, `array[boolean]` |
| 금지 | `file`, `secret`, `array[file]` -- 사용 시 검증 실패 |

**출력 변수 제한:**

| type | 설명 |
|------|------|
| `string` | 문자열 (최대 80,000자) |
| `number` | 숫자 (-999999999 ~ 999999999) |
| `boolean` | 불리언 |
| `object` | 객체 (최대 5레벨 중첩) |
| `array[string]` | 문자열 배열 |
| `array[number]` | 숫자 배열 |
| `array[object]` | 객체 배열 |

**사용 가능한 Python 패키지:**
`json`, `math`, `datetime`, `re`, `numpy`, `pandas`, `requests`

**사용 가능한 JavaScript 패키지:**
표준 내장 객체, `lodash`, `moment`

### 5.5 if-else (조건 분기 노드)

조건에 따라 실행 경로를 분기:

```yaml
- data:
    cases:
    - case_id: 'true'                # IF 분기
      conditions:
      - comparison_operator: is      # 비교 연산자
        id: cond1
        value: 결제                   # 비교 값
        variable_selector:
        - '9'                        # 비교 대상 노드 ID
        - category                   # 비교 대상 변수명
      id: 'true'
      logical_operator: and          # 조건 결합 (and/or)
    - case_id: d8e58cc8-...          # ELIF 분기 (UUID)
      conditions:
      - comparison_operator: '>'
        id: cond2
        value: '1'
        varType: number
        variable_selector:
        - sys
        - dialogue_count
      id: d8e58cc8-...
      logical_operator: and
    desc: ''
    title: 결제문의 확인
    type: if-else
  id: '3'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `if-else` 고정 |
| `cases` | 조건부 | 새 형식. case_id, logical_operator, conditions 포함 |
| `conditions` | 조건부 | 레거시 형식 |

> `cases` 또는 `conditions` 중 하나는 반드시 존재해야 함. 둘 다 없으면 검증 실패.

**comparison_operator 종류:**

| 연산자 | 설명 | 대상 타입 |
|--------|------|----------|
| `is` | 같음 (정확히 일치) | 문자열 |
| `is not` | 같지 않음 | 문자열 |
| `contains` | 포함 | 문자열 |
| `not contains` | 미포함 | 문자열 |
| `start with` | ~로 시작 | 문자열 |
| `end with` | ~로 끝남 | 문자열 |
| `empty` | 비어 있음 | 모든 타입 |
| `not empty` | 비어 있지 않음 | 모든 타입 |
| `in` | 목록에 포함 | 문자열/숫자 |
| `not in` | 목록에 미포함 | 문자열/숫자 |
| `all of` | 모두 포함 | 배열 |
| `=` | 같음 | 숫자 |
| `≠` | 같지 않음 | 숫자 |
| `>` | 보다 큼 | 숫자 |
| `<` | 보다 작음 | 숫자 |
| `≥` | 이상 | 숫자 |
| `≤` | 이하 | 숫자 |
| `null` | null 값 | 모든 타입 |
| `not null` | null 아님 | 모든 타입 |
| `exists` | 존재함 | 모든 타입 |
| `not exists` | 존재하지 않음 | 모든 타입 |

> **주의:** `>=`, `<=`, `!=` 사용 시 Dify Import 오류 발생.
> 반드시 유니코드 기호 `≥`, `≤`, `≠`를 사용해야 함.

**엣지 연결 시 sourceHandle:**
- `'true'` -> IF 조건 충족
- `'false'` -> ELSE (모든 조건 미충족)
- `'{case_id}'` -> ELIF 분기

### 5.6 http-request (HTTP 요청 노드)

외부 API 호출:

```yaml
- data:
    authorization:
      config: null
      type: no-auth              # no-auth, api-key
    body:
      data:
      - type: text
        value: |
          {
            "text": "메시지: {{#9.summary#}}"
          }
      type: json                 # json, form-data, binary, raw-text
    desc: 'Slack 웹훅 전송'
    headers: Content-Type:application/json
    method: post                 # get, post, put, patch, delete, head
    params: ''                   # 쿼리 파라미터
    retry_config:
      max_retries: 3
      retry_enabled: true
      retry_interval: 100        # ms
    ssl_verify: true
    timeout:
      max_connect_timeout: 10    # 초
      max_read_timeout: 60
      max_write_timeout: 60
    title: Slack 결제팀
    type: http-request
    url: '{{#env.SLACK_WEBHOOK_PAYMENT#}}'
  id: '4'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `http-request` 고정 |
| `method` | O | get, post, put, patch, delete, head, options |
| `url` | O | 요청 URL 문자열 |
| `authorization` | O | 인증 설정 객체 |
| `headers` | O | 헤더 문자열 |
| `params` | O | 파라미터 문자열 |
| `body` | X | 요청 바디 |

**인증(authorization) 검증 규칙:**
- `type: "no-auth"` -> `config`은 반드시 `null`이어야 함
- `type: "api-key"` -> `config`은 반드시 dict 타입이어야 함

**인증(authorization) 유형:**
```yaml
# 인증 없음
authorization:
  config: null
  type: no-auth

# API Key (Bearer)
authorization:
  config:
    api_key: '{{#env.API_KEY#}}'
    type: bearer
  type: api-key

# API Key (Basic)
authorization:
  config:
    api_key: '{{#env.API_KEY#}}'
    type: basic
  type: api-key
```

**출력 변수:**
`body` (응답 본문), `status_code` (HTTP 상태 코드), `headers` (응답 헤더), `files` (파일)

### 5.7 tool (도구 노드)

내장/사용자 정의/MCP 도구 호출:

```yaml
- data:
    desc: 'FireCrawl로 웹 스크래핑'
    provider_id: firecrawl
    provider_name: firecrawl
    provider_type: builtin       # builtin, api, workflow, mcp
    retry_config:
      max_retries: 3
      retry_enabled: true
      retry_interval: 1000
    title: 웹 스크래핑
    tool_configurations:         # 도구 설정 (고정값)
      formats:
        type: constant
        value: markdown
      onlyMainContent:
        type: constant
        value: 1
      timeout:
        type: constant
        value: 30000
    tool_label: 단일 페이지 스크래핑
    tool_name: scrape
    tool_node_version: '2'
    tool_parameters:             # 도구 파라미터 (동적값)
      url:
        type: mixed              # mixed (변수 참조), constant (고정값)
        value: '{{#1.url#}}'
    type: tool
  id: '3'
```

### 5.8 knowledge-retrieval (지식 검색 노드)

지식 베이스에서 관련 정보 검색:

```yaml
- data:
    dataset_ids:                  # 지식 베이스 ID 목록
    - 'kb-uuid-1'
    - 'kb-uuid-2'
    desc: '제품 지식 검색'
    multiple_retrieval_config:
      reranking_model:
        provider: ''
        model: ''
      top_k: 3                   # 반환할 최대 결과 수
      score_threshold: 0.5       # 최소 유사도 점수
      reranking_enable: false
    query_variable_selector:     # 검색 쿼리 소스
    - '1'
    - query
    retrieval_mode: multiple     # single 또는 multiple
    title: 지식 검색
    type: knowledge-retrieval
  id: '3'
```

**출력 변수:** `result` (문서 청크 배열 - 콘텐츠, 메타데이터, 제목 포함)

### 5.9 question-classifier (질문 분류기 노드)

LLM 기반 질문 분류:

```yaml
- data:
    classes:
    - id: class-1
      name: 결제 문의
    - id: class-2
      name: 배송 문의
    - id: class-3
      name: 일반 문의
    desc: '고객 문의 분류'
    instructions: '결제 관련 키워드: 환불, 카드, 포인트...'
    model:
      name: gpt-4o
      provider: langgenius/openai/openai
      completion_params:
        temperature: 0.1
    query_variable_selector:
    - sys
    - query
    title: 질문 분류기
    type: question-classifier
  id: '4'
```

> 각 클래스는 별도의 출력 핸들(sourceHandle)로 엣지 연결

### 5.10 agent (에이전트 노드)

LLM이 도구를 자율적으로 선택하고 호출하여 복잡한 작업을 수행:

```yaml
- data:
    agent_strategy: function_call  # function_call 또는 react
    desc: '도구를 사용하여 사용자 요청 처리'
    instructions: |
      당신은 고객 지원 에이전트입니다.
      사용자의 요청을 분석하고 적절한 도구를 사용하여 처리하세요.
      주문 정보 조회가 필요하면 order_lookup 도구를 사용하세요.
    max_iteration: 5               # 최대 반복 횟수 (무한 루프 방지)
    memory:
      role_prefix:
        assistant: ''
        user: ''
      window:
        enabled: true
        size: 10                   # 보존할 메시지 수
    model:
      completion_params:
        temperature: 0.3
      mode: chat
      name: gpt-4o
      provider: langgenius/openai/openai
    title: 고객 지원 에이전트
    tools:
    - provider_id: google_search
      provider_name: google
      provider_type: builtin
      tool_configurations:
        result_type:
          type: constant
          value: link
      tool_label: Google 검색
      tool_name: google_search
      tool_parameters:
        query:
          type: mixed
          value: ''                # AI가 자동 결정
    - provider_id: custom_api
      provider_type: api
      tool_name: order_lookup
      tool_parameters:
        order_id:
          type: mixed
          value: ''
    type: agent
  id: '5'
```

**Agent 전략:**

| 전략 | 설명 | 적합한 모델 |
|------|------|------------|
| `function_call` | 네이티브 LLM function calling 사용 | GPT-4, Claude 3.5 등 |
| `react` | Thought -> Action -> Observation 추론 주기 | 모든 LLM (function call 미지원 포함) |

**최대 반복 횟수 가이드:**
- 간단한 작업: 3~5회
- 복잡한 연구: 10~15회

**출력 변수:**
`text` (최종 답변), `tool_results`, `reasoning_trace`, `iteration_count`, `is_success`, `logs`

### 5.11 answer (응답 노드 - Chatflow 전용)

Chatflow에서 사용자에게 응답 전달:

```yaml
- data:
    answer: |
      문서 처리 완료!

      결과: {{#2.text#}}
    desc: ''
    title: 응답
    type: answer
    variables: []
  id: '5'
```

> 정적 텍스트와 `{{#노드ID.변수명#}}` 동적 변수를 조합 가능
> Chatflow 내에서 여러 Answer 노드 사용 가능

### 5.12 end (출력 노드 - Workflow 전용)

Workflow의 최종 출력 정의:

```yaml
- data:
    desc: ''
    outputs:
    - value_selector:            # 출력할 변수 소스
      - '9'
      - category
      variable: category         # 출력 변수명
    - value_selector:
      - '9'
      - summary
      variable: summary
    - value_selector:
      - '1'
      - customer_name
      variable: customer_name
    title: 완료
    type: end
  id: '8'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `end` 고정 |
| `outputs` | O | list[OutputVariableEntity]. 각 항목에 variable, value_selector 필수 |

> 최소 하나의 출력 변수를 지정해야 함
> API로 호출 시 여기에 정의된 변수만 반환

### 5.13 iteration (반복 노드)

배열의 각 요소에 워크플로우 단계를 적용:

```yaml
- data:
    desc: '각 챕터별 요약 생성'
    error_handle_mode: terminated   # terminated, continue-on-error, remove-abnormal-output
    is_parallel: false              # 병렬 실행 여부
    parallel_nums: 10               # 병렬 시 동시 처리 수 (최대 10)
    iterator_selector:              # 입력 배열 소스
    - '3'
    - chapters
    output_selector:                # 출력 수집 대상
    - '5'
    - text
    title: 챕터별 요약
    type: iteration
    # 내부 노드는 별도로 정의
  id: '4'
```

**내장 변수:**
- `items[object]` - 현재 요소
- `index[number]` - 현재 인덱스 (0부터)

### 5.14 loop (루프 노드)

반복적으로 결과를 개선하는 루프:

```yaml
- data:
    desc: '품질 점수가 0.9 이상이 될 때까지 반복'
    loop_variables:                 # 루프 변수 (주기 간 상태 유지)
    - name: quality_score
      type: number
      value: 0
    - name: draft
      type: string
      value: ''
    break_condition: 'quality_score > 0.9'  # 종료 조건
    max_iterations: 10              # 안전 제한
    title: 품질 개선 루프
    type: loop
  id: '6'
```

**Loop vs Iteration 차이:**

| 특성 | Loop | Iteration |
|------|------|-----------|
| 처리 방식 | 순차적, 이전 결과에 의존 | 독립적, 각 항목 별도 처리 |
| 상태 유지 | 변수가 주기 간 누적 | 각 항목 독립 |
| 병렬 실행 | 불가 | 가능 (최대 10개) |
| 사용 사례 | 콘텐츠 개선, 수렴 | 일괄 처리, 대량 변환 |

### 5.15 template-transform (템플릿 노드)

Jinja2 템플릿으로 데이터 형식화:

> **주의:** DSL에서 이 노드의 `data.type` 값은 반드시 `template-transform`이어야 함.
> `template`(X)이 아닌 `template-transform`(O)이 정확한 값임.

```yaml
- data:
    desc: '보고서 형식화'
    template: |
      # 분석 보고서

      **고객명:** {{ customer_name }}
      **분류:** {{ category }}

      {% if urgency == "긴급" %}
      > 긴급 처리가 필요합니다!
      {% endif %}

      ## 상세 내용
      {% for item in items %}
      - {{ loop.index }}. {{ item }}
      {% endfor %}
    title: 보고서 템플릿
    type: template-transform
    variables:
    - value_selector:
      - '1'
      - customer_name
      variable: customer_name
    - value_selector:
      - '9'
      - category
      variable: category
  id: '10'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `template-transform` 고정 (NOT `template`) |
| `template` | O | Jinja2 템플릿 문자열 |
| `variables` | O | list[VariableSelector] 입력 변수 |

> 출력은 `text` 변수로 제공 (최대 80,000자)

**주요 Jinja2 필터:**

| 필터 | 설명 | 예시 |
|------|------|------|
| `default(value)` | 변수 미존재 시 기본값 반환 | `{{ name \| default("없음") }}` |
| `length` | 시퀀스 요소 수 반환 | `{{ items \| length }}` |
| `join(sep)` | 배열 요소를 구분자로 연결 | `{{ items \| join(", ") }}` |
| `first` / `last` | 첫 번째/마지막 요소 반환 | `{{ items \| first }}` |
| `upper` / `lower` | 대문자/소문자 변환 | `{{ name \| upper }}` |
| `capitalize` | 첫 글자 대문자 변환 | `{{ name \| capitalize }}` |
| `title` | 각 단어 첫 글자 대문자 | `{{ name \| title }}` |
| `trim` / `strip` | 앞뒤 공백 제거 | `{{ text \| trim }}` |
| `replace(old, new)` | 문자열 치환 | `{{ text \| replace("a", "b") }}` |
| `truncate(n)` | 지정 길이로 자르기 | `{{ text \| truncate(100) }}` |
| `int` / `float` | 정수/실수 변환 | `{{ value \| int }}` |
| `round(n)` | 반올림 | `{{ score \| round(2) }}` |
| `sort` | 정렬 | `{{ items \| sort }}` |
| `reverse` | 역순 | `{{ items \| reverse }}` |
| `batch(n)` | 배치 분할 | `{{ items \| batch(3) }}` |
| `groupby(attr)` | 속성별 그룹화 | `{{ users \| groupby("role") }}` |
| `reject(test)` | 조건 불일치 필터링 | `{{ items \| reject("none") }}` |
| `escape` | HTML 특수문자 이스케이프 | `{{ html \| escape }}` |
| `striptags` | HTML 태그 제거 | `{{ html \| striptags }}` |
| `urlencode` | URL 인코딩 | `{{ query \| urlencode }}` |
| `wordcount` | 단어 수 반환 | `{{ text \| wordcount }}` |
| `indent(n)` | 들여쓰기 적용 | `{{ text \| indent(4) }}` |
| `filesizeformat` | 파일 크기 형식화 | `{{ size \| filesizeformat }}` |

**Jinja2 제어 구문:**
```jinja2
{# 조건문 #}
{% if condition %}...{% elif other %}...{% else %}...{% endif %}

{# 반복문 #}
{% for item in items %}
  {{ loop.index }}. {{ item }}    {# loop.index: 1부터 시작 #}
{% endfor %}

{# 변수 설정 #}
{% set greeting = "안녕하세요" %}
```

### 5.16 variable-aggregator (변수 집계기 노드)

여러 분기의 출력을 하나의 변수로 통합:

```yaml
- data:
    advanced_settings:
      group_enabled: false
    desc: '분기 결과 통합'
    output_type: string           # 집계할 데이터 타입
    title: 결과 통합
    type: variable-aggregator
    variables:
    - - '4'                       # 분기 1의 노드 ID
      - result                    # 분기 1의 변수명
    - - '5'                       # 분기 2의 노드 ID
      - result                    # 분기 2의 변수명
  id: '7'
```

**필수 필드 (Pydantic 검증):**

| 필드 | 필수 | 검증 규칙 |
|------|------|----------|
| `title` | O | BaseNodeData 필수 |
| `type` | O | `variable-aggregator` 고정 |
| `output_type` | O | 출력 타입 문자열 |
| `variables` | O | list[list[str]] 형식 (2차원 배열) |

> 모든 집계 변수는 동일한 데이터 타입이어야 함
> 런타임에 실제로 실행된 분기의 값만 출력

### 5.17 document-extractor (문서 추출기 노드)

업로드된 파일에서 텍스트 추출:

```yaml
- data:
    desc: '문서 텍스트 추출'
    is_array_file: false          # 배열 파일 여부
    title: 문서 추출
    type: document-extractor
    variable_selector:
    - '1'                         # 파일 소스 노드 ID
    - uploaded_file               # 파일 변수명
  id: '3'
```

**지원 형식:**
TXT, Markdown, HTML, DOCX, PDF, Excel(.xls/.xlsx), CSV, PowerPoint, EPUB, JSON, YAML

**출력 변수:**
- 단일 파일: `text` (String)
- 복수 파일: `text` (Array[String])

### 5.18 assigner (변수 할당기 노드)

대화 변수 업데이트 (Chatflow 전용):

```yaml
- data:
    assigned_variable_selector:  # 대상 대화 변수
    - conversation
    - text
    desc: ''
    input_variable_selector:     # 소스 변수
    - '3'
    - text
    title: 변수 할당
    type: assigner
    write_mode: over-write       # over-write, append, clear, set 등
  id: '5'
```

**write_mode (작업 모드):**

| 타입 | 사용 가능한 모드 |
|------|-----------------|
| String | `over-write`, `clear`, `set` |
| Number | `over-write`, `clear`, `set`, `+`, `-`, `*`, `/` |
| Boolean | `over-write`, `clear`, `set` |
| Array | `over-write`, `clear`, `append`, `extend` |
| Object | `over-write`, `clear`, `set` |

### 5.19 parameter-extractor (파라미터 추출기 노드)

LLM을 활용하여 비구조화 텍스트에서 구조화된 데이터 추출:

```yaml
- data:
    desc: '주문 정보 추출'
    extraction_parameters:
    - name: order_id
      type: string
      description: '주문 번호'
      required: true
    - name: amount
      type: number
      description: '주문 금액'
      required: false
    instructions: '문의 내용에서 주문 번호와 금액을 추출하세요.'
    model:
      name: gpt-4o
      provider: langgenius/openai/openai
      completion_params:
        temperature: 0.1
    query_variable_selector:
    - '1'
    - inquiry_content
    title: 파라미터 추출
    type: parameter-extractor
    reasoning_mode: function_call  # function_call 또는 prompt
  id: '4'
```

**출력 변수:**
- 정의한 각 파라미터가 개별 변수로 출력
- `__is_success` (Boolean) - 추출 성공 여부
- `__reason` (String) - 실패 사유

### 5.20 list-operator (리스트 연산자 노드)

배열 필터링, 정렬, 선택:

```yaml
- data:
    desc: '이미지 파일만 필터링'
    filter_by:
      conditions:
      - key: type
        comparison_operator: is
        value: image
    order_by:
      enabled: false
    limit:
      enabled: true
      size: 5                    # 최대 N개 선택
    title: 이미지 필터
    type: list-operator
    variable:
    - '1'
    - files
  id: '3'
```

**출력 변수:** `result` (필터링된 배열), `first_record`, `last_record`

[Top](#dify-workflow-dsl-작성-가이드)

---

## 6. 실전 예제

### 6.1 간단한 Workflow: 텍스트 요약기

사용자 입력을 받아 LLM으로 요약 후 결과를 반환하는 기본 워크플로우:

```yaml
app:
  description: 입력 텍스트를 요약하는 워크플로우
  icon: "\U0001F4DD"
  icon_background: '#E8F5E9'
  mode: workflow
  name: 텍스트 요약기
  use_icon_as_answer_icon: false
dependencies: []
kind: app
version: 0.5.0
workflow:
  conversation_variables: []
  environment_variables: []
  features:
    file_upload:
      enabled: false
    opening_statement: ''
    retriever_resource:
      enabled: false
    sensitive_word_avoidance:
      enabled: false
    speech_to_text:
      enabled: false
    suggested_questions: []
    suggested_questions_after_answer:
      enabled: false
    text_to_speech:
      enabled: false
      language: ''
      voice: ''
  graph:
    edges:
    - data:
        sourceType: start
        targetType: llm
      id: edge-1-2
      source: '1'
      sourceHandle: source
      target: '2'
      targetHandle: target
      type: custom
    - data:
        sourceType: llm
        targetType: end
      id: edge-2-3
      source: '2'
      sourceHandle: source
      target: '3'
      targetHandle: target
      type: custom
    nodes:
    - data:
        desc: '요약할 텍스트 입력'
        selected: false
        title: 시작
        type: start
        variables:
        - label: 원문 텍스트
          max_length: 5000
          options: []
          required: true
          type: paragraph
          variable: source_text
        - label: 요약 길이
          options:
          - 1줄 요약
          - 3줄 요약
          - 상세 요약
          required: true
          type: select
          variable: summary_length
      height: 150
      id: '1'
      position:
        x: 30
        y: 300
      positionAbsolute:
        x: 30
        y: 300
      selected: false
      type: custom
      width: 242
    - data:
        context:
          enabled: false
          variable_selector: []
        desc: 'LLM으로 텍스트 요약'
        model:
          completion_params:
            max_tokens: 1024
            temperature: 0.3
          mode: chat
          name: gpt-4o
          provider: langgenius/openai/openai
        prompt_template:
        - id: system-prompt
          role: system
          text: |
            당신은 텍스트 요약 전문가입니다.
            사용자가 제공한 텍스트를 요청된 길이로 요약하세요.
            핵심 내용을 빠짐없이 포함하되 간결하게 작성하세요.
        - id: user-prompt
          role: user
          text: |
            [요약 길이] {{#1.summary_length#}}

            [원문]
            {{#1.source_text#}}
        selected: false
        title: 텍스트 요약
        type: llm
        vision:
          enabled: false
      height: 120
      id: '2'
      position:
        x: 334
        y: 300
      positionAbsolute:
        x: 334
        y: 300
      selected: false
      type: custom
      width: 242
    - data:
        desc: ''
        outputs:
        - value_selector:
          - '2'
          - text
          variable: summary
        selected: false
        title: 완료
        type: end
      height: 120
      id: '3'
      position:
        x: 638
        y: 300
      positionAbsolute:
        x: 638
        y: 300
      selected: false
      type: custom
      width: 242
    viewport:
      x: 0
      y: 0
      zoom: 1.0
  rag_pipeline_variables: []
```

**플로우:** `시작` -> `LLM 요약` -> `완료`

### 6.2 조건 분기 Workflow: 문의 분류 및 라우팅

LLM으로 고객 문의를 분류한 후 카테고리별로 다른 Slack 채널에 전송:

```
시작 -> LLM 분류 -> Code(JSON 파싱) -> If-Else(결제?)
                                        +-- true -> HTTP(결제팀 Slack) -> 완료
                                        +-- false -> If-Else(배송?)
                                                     +-- true -> HTTP(배송팀 Slack) -> 완료
                                                     +-- false -> HTTP(일반CS Slack) -> 완료
```

> 전체 DSL은 `develop-agent/examples/dify/dsl/customer-inquiry-routing.yml` 참조

**핵심 패턴:**
1. LLM으로 JSON 형식의 분류 결과를 생성
2. Code 노드로 JSON을 파싱하여 개별 변수로 분리
3. If-Else 체이닝으로 카테고리별 분기
4. 환경 변수로 웹훅 URL을 관리하여 보안 확보
5. 모든 분기가 하나의 End 노드로 합류

### 6.3 Chatflow: 파일 번역 봇

파일 업로드 -> 텍스트 추출 -> 번역 -> 후속 대화에서 스타일 조정:

```
시작 -> If-Else(첫 대화?)
         +-- true -> Doc Extractor -> Variable Assigner -> Answer("처리 완료")
         |                                                    |
         |                                              LLM 번역 -> Answer(번역 결과)
         +-- false(2회차~) -> LLM(사용자 의도 파악) -> LLM 재번역 -> Answer(수정 번역)
```

> 전체 DSL은 `develop-agent/examples/dify/dsl/File Translation.yml` 참조

**핵심 패턴:**
1. `sys.dialogue_count`로 첫 대화/후속 대화 분기
2. 대화 변수(`conversation.text`)로 추출된 텍스트 저장
3. Variable Assigner로 대화 변수 업데이트
4. 메모리 활성화로 대화 컨텍스트 유지

[Top](#dify-workflow-dsl-작성-가이드)

---

## 7. 플로우 로직 패턴

### 7.1 직렬 실행

노드가 순차적으로 연결되어 차례로 실행. 다운스트림 노드는 이전 노드의 변수에 접근 가능:

```yaml
edges:
- source: '1'    # 시작
  target: '2'    # LLM
- source: '2'    # LLM
  target: '3'    # Code
- source: '3'    # Code
  target: '4'    # 완료
```

### 7.2 병렬 실행

하나의 노드에서 여러 노드로 동시 분기. 독립적인 작업의 처리 속도 향상:

```yaml
# LLM 노드('2')에서 3개의 리뷰 LLM으로 동시 분기
edges:
- source: '2'
  target: '3'    # 리뷰어 1
- source: '2'
  target: '4'    # 리뷰어 2
- source: '2'
  target: '5'    # 리뷰어 3
# 3개 결과를 종합 LLM으로 합류
- source: '3'
  target: '6'    # 종합
- source: '4'
  target: '6'
- source: '5'
  target: '6'
```

**제약사항:**
- 최대 10개 병렬 브랜치
- 최대 3단계 중첩 병렬
- 병렬 노드 간에는 서로의 출력 참조 불가
- 합류 노드에서 모든 병렬 출력에 접근 가능

### 7.3 조건 분기 후 합류

Variable Aggregator를 사용하여 분기 결과를 통합:

```yaml
# If-Else에서 분기
edges:
- source: '3'              # If-Else
  sourceHandle: 'true'
  target: '4'              # 분기 A
- source: '3'
  sourceHandle: 'false'
  target: '5'              # 분기 B
# 합류
- source: '4'
  target: '6'              # Variable Aggregator
- source: '5'
  target: '6'
# 통합 결과 처리
- source: '6'
  target: '7'              # 후속 처리
```

[Top](#dify-workflow-dsl-작성-가이드)

---

## 8. 오류 처리

LLM, HTTP, Code, Tool 노드에서 오류 처리 전략 설정 가능:

**방식 1: 기본값 반환 (Default Value)**
```yaml
- data:
    error_strategy: default-value
    default_value:
    - id: text
      type: string
      value: '죄송합니다. 일시적으로 사용할 수 없습니다.'
    type: llm
    # ...
```

**방식 2: 대체 분기 (Fail Branch)**
```yaml
- data:
    error_strategy: fail-branch
    type: http-request
    # ...

# 엣지에서 실패 분기 연결
edges:
- source: '4'
  sourceHandle: fail          # 실패 시 경로
  target: '5'                 # 대체 처리 노드
```

**오류 변수:**
실패 시 `error_type`과 `error_message` 변수가 자동 생성되어 조건부 처리에 활용 가능

**재시도 설정:**
```yaml
retry_config:
  max_retries: 3              # 최대 재시도 횟수 (최대 10)
  retry_enabled: true
  retry_interval: 100         # 재시도 간격 (ms, 최대 5000)
```

### 8.1 노드별 오류 유형

워크플로우 디버깅 시 발생할 수 있는 주요 오류 유형:

**Code 노드 오류:**

| 오류 유형 | 설명 | 해결 방법 |
|----------|------|----------|
| `CodeNodeError` | Python/JavaScript 코드 실행 중 예외 발생 | 코드 로직 점검, 예외 처리 추가 |
| `OutputValidationError` | 반환값과 출력 변수 간 데이터 타입 불일치 | `outputs` 정의와 반환 딕셔너리 타입 일치 확인 |
| `DepthLimitError` | 중첩 데이터 구조가 5단계 초과 | 출력 객체 중첩 깊이 줄이기 |
| `CodeExecutionError` | 샌드박스에서 코드 실행 불가 | 허용된 패키지만 사용, 시스템 접근 제거 |

**LLM 노드 오류:**

| 오류 유형 | 설명 | 해결 방법 |
|----------|------|----------|
| `VariableNotFoundError` | 프롬프트에서 존재하지 않는 변수 참조 | 변수명 오타 확인, 삭제된 변수 참조 제거 |
| `InvalidContextStructureError` | 컨텍스트에 배열/객체 전달 (문자열만 허용) | 데이터 타입 변환 후 전달 |
| `NoPromptFoundError` | 프롬프트 필드가 비어 있음 | 프롬프트 작성 필수 |
| `ModelNotExistError` | 모델이 선택되지 않음 | LLM 모델 선택 |
| `LLMModeRequiredError` | 유효한 API 자격 증명 없음 | API 키 설정, 모델 권한 확인 |
| `InvalidVariableTypeError` | 비호환 Jinja2 구문 포함 | Jinja2 문법 오류 수정 |

**HTTP Request 노드 오류:**

| 오류 유형 | 설명 | 해결 방법 |
|----------|------|----------|
| `AuthorizationConfigError` | 인증 설정 누락/오류 | API 키, 토큰 재확인, 인증 유형 점검 |
| `Timeout` | 응답 시간 초과 | 타임아웃 값 증가, 외부 서비스 상태 점검 |
| `ResponseValidationError` | 응답 파싱 실패 | 응답 형식 확인, Content-Type 점검 |

**공통 오류:**

| 오류 유형 | 설명 | 해결 방법 |
|----------|------|----------|
| `VariableNotFoundError` | 참조 변수가 워크플로우에 존재하지 않음 | `value_selector` 경로, 노드 ID 점검 |
| `InvalidVariableTypeError` | 변수 타입 불일치 | 상위 노드 출력 타입과 입력 타입 일치 확인 |

[Top](#dify-workflow-dsl-작성-가이드)

---

## 9. DSL Import 검증

DSL 파일을 Dify에 Import할 때 수행되는 검증 과정과
사전에 오류를 방지하기 위한 실무 가이드.

### 9.1 Import 검증 흐름

Dify 소스 코드 기반의 전체 검증 체인:

```
HTTP POST /apps/imports
  +-- YAML 파싱 (yaml.safe_load)
  +-- 기본 구조 검증 (dict 타입 확인)
  +-- 버전 호환성 검증
  +-- app 섹션 검증
  +-- AppMode 검증
  +-- workflow 데이터 검증
  +-- 변수 빌드 및 검증 (variable_factory)
  +-- 피처 구조 검증 (validate_features_structure)
  +-- 그래프 구조 검증 (validate_graph_structure)
  +-- DB 저장
```

**단계별 검증 상세:**

| 단계 | 검증 항목 | 실패 시 동작 |
|------|----------|-------------|
| YAML 파싱 | yaml.safe_load() 성공, dict 타입 | Import 즉시 실패 |
| 버전 검증 | version이 문자열, 시맨틱 버전 형식 | PENDING 또는 FAILED |
| app 검증 | app 섹션 존재, mode 유효 | Import 실패 |
| AppMode 검증 | 유효한 모드 값 확인 | ValueError 발생 |
| workflow 검증 | workflow/advanced-chat 모드에서 필수 | Import 실패 |
| 변수 검증 | name, value_type, value 필수, 200KB 제한 | VariableError 발생 |
| 피처 검증 | 모드별 허용 피처만 검증 | 인식되지 않는 키는 무시 |
| 그래프 검증 | START/트리거 노드 공존 불가, 노드 타입 유효성 | Import 실패 |

**자동 보정 항목:**
- `version` 누락 시 -> `"0.1.0"` 자동 설정
- `kind` 누락 또는 `"app"` 아닌 경우 -> `"app"` 자동 설정

### 9.2 Import 실패 주요 원인 Top 10

| 순위 | 원인 | 설명 |
|------|------|------|
| 1 | YAML 문법 오류 | 들여쓰기, 특수문자 이스케이프 문제 |
| 2 | YAML 스칼라 스타일 오류 | `>` (folded) 대신 `\|` (literal) 사용해야 프롬프트 줄바꿈 유지 |
| 3 | version 필드 문제 | 누락 또는 잘못된 타입 (문자열 `"0.5.0"` 필수) |
| 4 | app 섹션 누락 | 최소 name, mode 필수 |
| 5 | 잘못된 AppMode | `workflow`, `advanced-chat` 등 유효한 값만 허용 |
| 6 | workflow 섹션 누락 | workflow/advanced-chat 모드에서 필수 |
| 7 | 노드 title 필드 누락 | 모든 노드에서 필수 (BaseNodeData) |
| 8 | LLM 노드 model 설정 오류 | provider, name, mode 필수 |
| 9 | 의존성 해시 불일치 | 가짜 해시 사용 시 플러그인 확인 단계에서 실패 |
| 10 | 변수 타입 불일치 | value와 value_type 간 타입 일치 필요 |

### 9.3 YAML 작성 시 주의사항

#### 리터럴 블록 (`|`) vs 폴딩 블록 (`>`)

YAML에서 여러 줄 문자열을 표현하는 두 가지 블록 스칼라 스타일:

```yaml
# | (리터럴): 줄바꿈 유지 -- 프롬프트, 코드에 사용
text: |
  첫째 줄
  둘째 줄
  셋째 줄
# 결과: "첫째 줄\n둘째 줄\n셋째 줄\n"

# > (폴딩): 줄바꿈 -> 공백으로 변환 -- 긴 문단에만 사용
text: >
  첫째 줄
  둘째 줄
  셋째 줄
# 결과: "첫째 줄 둘째 줄 셋째 줄\n"
```

**필수 규칙:** prompt_template의 text, code 노드의 code, http-request의 body에서는
반드시 `|` (리터럴 블록) 사용.
`>`를 사용하면 줄바꿈이 공백으로 변환되어 프롬프트 구조가 깨짐.
Import 자체는 성공하더라도 실행 시 의도치 않은 동작 발생.

**블록 스칼라 변형:**

| 표기 | 마지막 줄바꿈 | 사용 예시 |
|------|-------------|----------|
| `\|` | 하나의 줄바꿈 유지 | 일반적인 프롬프트, 코드 |
| `\|-` | 마지막 줄바꿈 제거 | 줄바꿈 없이 끝나야 하는 텍스트 |
| `\|+` | 모든 후행 줄바꿈 유지 | 후행 공백이 중요한 경우 |

#### 인라인 문자열의 특수문자 이스케이프

```yaml
# 쌍따옴표 안에서 이스케이프 시퀀스 동작
text: "첫째 줄\n둘째 줄\n셋째 줄"
# 결과: 실제 줄바꿈이 포함된 문자열

# 홑따옴표 안에서는 이스케이프 불가 (그대로 출력)
text: '첫째 줄\n둘째 줄'
# 결과: "첫째 줄\n둘째 줄" (리터럴 백슬래시 n)
```

> 프롬프트에 줄바꿈이 필요한 경우 인라인 쌍따옴표보다 `|` 블록 스칼라를 권장.
> 가독성이 높고 이스케이프 실수를 방지 가능.

#### YAML 특수문자 주의

```yaml
# 콜론(:) 뒤에 공백이 있으면 key-value로 해석
text: "Content-Type: application/json"   # 따옴표 필수

# 중괄호({})는 YAML flow mapping으로 해석될 수 있음
text: "결과: {{#1.text#}}"              # 따옴표 권장

# 퍼센트(%)로 시작하면 YAML 지시자로 해석
text: "%ENV_VAR%"                        # 따옴표 필수
```

#### 노드 타입 정확한 값

일부 노드 타입은 하이픈이 포함됨. 정확한 값을 사용해야 함:

| 정확한 값 (O) | 흔한 실수 (X) |
|--------------|-------------|
| `template-transform` | `template` |
| `if-else` | `ifelse`, `if_else` |
| `http-request` | `http`, `http_request` |
| `knowledge-retrieval` | `knowledge` |
| `variable-aggregator` | `variable_aggregator` |
| `question-classifier` | `question_classifier` |
| `document-extractor` | `document_extractor` |
| `parameter-extractor` | `parameter_extractor` |
| `list-operator` | `list_operator` |
| `trigger-webhook` | `trigger` |
| `trigger-schedule` | `trigger` |
| `trigger-plugin` | `trigger` |

**전체 유효 노드 타입 목록 (Dify 소스 NodeType enum):**

```
start, end, answer, llm, knowledge-retrieval, knowledge-index,
if-else, code, template-transform, question-classifier, http-request,
tool, datasource, variable-aggregator, variable-assigner, loop,
loop-start, loop-end, iteration, iteration-start, parameter-extractor,
assigner, document-extractor, list-operator, agent, trigger-webhook,
trigger-schedule, trigger-plugin, human-input
```

### 9.4 사전 검증 도구

DSL 파일을 Dify에 Import하기 전에 오프라인으로 검증할 수 있는 도구:

```bash
# DSL 파일 검증
python validate_dsl.py <yaml_file>

# 예시
python validate_dsl.py smart-inquiry-routing.yml
```

**위치:** `develop-agent/examples/dify/dsl/validation/validate_dsl.py`

**검증 항목:**
- YAML 구문 및 기본 구조 (dict 타입)
- 버전 호환성 (시맨틱 버전 비교)
- app 섹션 (mode, name, icon_type)
- 그래프 구조 (노드 ID 고유성, 엣지 참조 유효성)
- 노드별 필수 필드 (LLM, Code, If/Else, HTTP, Template Transform, End, Variable Aggregator)
- 변수 참조 일관성 (`{{#nodeId.var#}}` 패턴의 nodeId 존재 여부)
- value_selector 참조 유효성
- START/트리거 노드 상호 배타성 검증
- 환경변수/대화변수 타입 검증
- 의존성 타입 검증

**출력 예시 (통과):**
```
======================================================================
  Dify DSL Validator -- smart-inquiry-routing.yml
======================================================================

  [i] INFO (1건)
  ------------------------------------------------------------------
  [i] [FILE]
      파일 크기: 22,597 bytes

======================================================================
  결과: PASS  |  오류: 0  |  경고: 0  |  정보: 1
======================================================================

  DSL 파일이 기본 검증을 통과함. Import 가능성 높음.
```

**출력 예시 (실패):**
```
======================================================================
  Dify DSL Validator -- broken-workflow.yml
======================================================================

  [X] ERROR (2건)
  ------------------------------------------------------------------
  [X] [LLM] @ workflow.graph.nodes[1].data.model.provider
      model.provider 누락
      -> 예: langgenius/openai/openai, langgenius/groq/groq

  [X] [NODE] @ workflow.graph.nodes[3].data.title
      노드 title 누락 (BaseNodeData 필수 필드)
      -> 모든 노드에 title 필드 필수

======================================================================
  결과: FAIL  |  오류: 2  |  경고: 0  |  정보: 1
======================================================================

  오류 2건 해결 필요. Import 실패 가능성 높음.
```

> 상세 검증 분석 문서:
> `develop-agent/examples/dify/dsl/validation/dify-dsl-import-validation-analysis.md` 참조

[Top](#dify-workflow-dsl-작성-가이드)

---

## 10. DSL 내보내기 및 가져오기

DSL 파일을 통해 Dify 앱을 다른 인스턴스로 이식하고 공유 가능.

### 내보내기 (Export)

Dify Studio에서 **앱 설정 -> DSL 내보내기**로 `.yml` 파일을 다운로드.

**DSL 파일에 포함되는 항목:**

| 항목 | 설명 |
|------|------|
| 앱 설정 | `app` 섹션 (이름, 모드, 아이콘 등) |
| 워크플로우 구성 | 전체 `workflow` 섹션 (노드, 엣지, 변수) |
| 모델 매개변수 | LLM 노드의 모델명, 프로바이더, completion_params |
| 지식 베이스 연결 | `dataset_ids` (참조 ID만, 실제 콘텐츠는 미포함) |
| 플러그인 의존성 | `dependencies` 섹션의 플러그인 식별자 |
| 환경 변수 | `environment_variables` (값 포함 -- 주의 필요) |
| 기능 설정 | `features` 섹션 (파일 업로드, TTS 등) |

**DSL 파일에 포함되지 않는 항목:**

| 항목 | 사유 |
|------|------|
| API 키 | 보안 (모델 프로바이더 키는 별도 설정 필요) |
| 지식 베이스 콘텐츠 | 용량 (KB 데이터는 별도 이관 필요) |
| 분석/로그 데이터 | 환경별 데이터 (실행 이력, 대시보드 통계) |

> **보안 주의:** `environment_variables`에 저장된 웹훅 URL, API 키 등 민감 정보는
> DSL 파일에 그대로 포함되므로 파일 공유 시 값을 제거하거나 변경 필요

### 가져오기 (Import)

Dify Studio에서 **앱 생성 -> DSL 파일에서 가져오기**로 `.yml` 파일 업로드.

**가져오기 시 확인사항:**

| 확인 항목 | 설명 |
|----------|------|
| 버전 호환성 | DSL `version`과 대상 Dify 인스턴스 간 호환성 자동 검사 |
| 플러그인 설치 | `dependencies`의 플러그인이 대상 환경에 설치되어 있어야 함 |
| 모델 프로바이더 | 사용 중인 모델의 프로바이더가 설정되어 있어야 함 |
| 지식 베이스 | 참조하는 KB가 대상 환경에 존재해야 함 (ID 기반 매칭) |
| 환경 변수 | 민감 정보는 가져오기 후 대상 환경에 맞게 재설정 |

**가져오기 검증 체인 ([9.1 Import 검증 흐름](#91-import-검증-흐름) 참조):**

```
DSL 파일 선택
  +-- YAML 파싱 및 구조 검증
  +-- 버전 호환성 검사
  +-- app/workflow 데이터 검증
  +-- 변수/피처/그래프 검증
  +-- 플러그인 의존성 확인
  +-- 앱 생성 및 DB 저장
  +-- 환경 변수/KB 연결 재설정
  +-- 테스트 실행
```

[Top](#dify-workflow-dsl-작성-가이드)

---

## 11. 모범 사례 및 주의사항

### 노드 ID 관리
- 노드 ID는 고유해야 함 (숫자 문자열 `'1'`, `'2'` 또는 타임스탬프 `'1739416823091'` 형식)
- 엣지의 `source`/`target`과 변수 참조의 노드 ID가 일치해야 함
- ID 변경 시 모든 참조를 함께 업데이트해야 함

### 변수 참조
- 텍스트 필드: `{{#노드ID.변수명#}}` 형식 사용
- 셀렉터 필드: `value_selector: ['노드ID', '변수명']` 배열 형식 사용
- 두 형식을 혼동하지 않도록 주의

### 환경 변수 보안
- API 키, 웹훅 URL 등 민감 정보는 반드시 `environment_variables`에 저장
- 프롬프트나 URL에서 `{{#env.변수명#}}`으로 참조
- DSL 파일을 공유할 때 환경 변수 값이 포함되어 있으므로 주의

### Workflow vs Chatflow 선택
- **Workflow**: 단일 실행, API 통합, 일괄 처리에 적합. `end` 노드로 결과 반환
- **Chatflow**: 대화형 상호작용, 다중 턴에 적합. `answer` 노드로 응답 반환
- Chatflow는 `conversation_variables`, `memory`, `sys.query` 사용 가능

### 플로우 설계 원칙
- 하나의 캔버스에 하나의 시작 노드만 허용
- 병렬 실행 시 최대 10개 브랜치, 3단계 중첩 제한 준수
- If-Else 분기 후에는 Variable Aggregator로 합류하여 다운스트림 노드 중복 방지
- 복잡한 조건 분기보다 Question Classifier 노드 활용 권장

### Code 노드 제약
- 샌드박스 환경: 파일 시스템, 네트워크, 시스템 명령 접근 불가
- 출력 제한: 문자열 80,000자, 중첩 5레벨
- 반드시 출력 변수(`outputs`)를 선언하고 딕셔너리로 반환

### 배포 및 버전 관리
- 배포 시 즉시 라이브 버전이 교체되므로 드래프트에서 충분히 테스트
- DSL 파일로 내보내기하여 버전별 백업 유지
- 환경 간 이식 시 `dependencies`의 플러그인이 대상 환경에 설치되어 있는지 확인

### YAML 스칼라 스타일 규칙
- 프롬프트 텍스트: `|` (리터럴 블록) 사용 필수
- 코드 블록: `|` (리터럴 블록) 사용 필수
- HTTP 바디: `|` (리터럴 블록) 사용 필수
- `>` (폴딩 블록): 줄바꿈을 공백으로 변환하므로 위 항목에 사용 금지

### Import 전 체크리스트
- [ ] `version: "0.5.0"` (문자열, 따옴표 포함)
- [ ] `kind: app`
- [ ] `app.mode`가 유효한 값 (`workflow`, `advanced-chat` 등)
- [ ] `app.name` 존재
- [ ] 모든 노드에 `data.title` 존재
- [ ] 모든 노드에 유효한 `data.type` (`template-transform`, NOT `template`)
- [ ] LLM 노드: `model.provider`, `model.name`, `model.mode` 필수
- [ ] Code 노드: `outputs`의 type이 허용 값만 사용
- [ ] 엣지의 `source`/`target`이 존재하는 노드 ID 참조
- [ ] 변수 참조 `{{#nodeId.var#}}`의 nodeId가 존재하는 노드
- [ ] `dependencies`의 플러그인 해시가 실제 마켓플레이스 값
- [ ] `validate_dsl.py`로 사전 검증 실행

### 노드 타입 정확한 값
주의: 일부 노드 타입은 하이픈이 포함됨. 정확한 값을 사용해야 함:
```
template-transform (NOT template)
if-else (NOT ifelse, if_else)
http-request (NOT http, http_request)
knowledge-retrieval (NOT knowledge)
variable-aggregator (NOT variable_aggregator)
question-classifier (NOT question_classifier)
document-extractor (NOT document_extractor)
parameter-extractor (NOT parameter_extractor)
list-operator (NOT list_operator)
```

[Top](#dify-workflow-dsl-작성-가이드)
