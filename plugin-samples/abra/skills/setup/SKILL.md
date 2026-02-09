---
name: setup
description: Abra 플러그인 초기 설정
user-invocable: true
disable-model-invocation: true
---

# setup

[SETUP 활성화]

## 목표

Abra 플러그인의 초기 설정을 수행함:
- Dify 접속 정보 확인 및 `.env` 파일 생성
- Python 가상환경 생성 및 의존성 설치
- Dify 연결 테스트
- 프로젝트 루트 `CLAUDE.md`에 라우팅 테이블 등록

## 선행 조건

`/abra:dify-setup` 완료 (Dify 실행 중)

## 워크플로우

### Step 1: install.yaml 로드

`gateway/install.yaml`을 읽어 설치 대상 파악.

### Step 2: Dify 접속 정보 수집

AskUserQuestion으로 Dify 접속 정보 수집:
- `DIFY_BASE_URL` (기본값: `http://localhost/console/api`)
- `DIFY_EMAIL`
- `DIFY_PASSWORD`

### Step 3: .env 파일 생성

`gateway/.env` 파일 생성 또는 갱신.

```env
DIFY_BASE_URL=http://localhost/console/api
DIFY_EMAIL=admin@example.com
DIFY_PASSWORD=your_password
```

### Step 4: Python 가상환경 생성 및 의존성 설치

```bash
cd gateway
python -m venv .venv
# Windows
.venv\Scripts\activate && pip install -r requirements.txt
# macOS/Linux
source .venv/bin/activate && pip install -r requirements.txt
```

### Step 5: 도구 동작 확인

```bash
# Windows
gateway\.venv\Scripts\python gateway\tools\dify_cli.py list
# macOS/Linux
gateway/.venv/bin/python gateway/tools/dify_cli.py list
```

Dify 연결 테스트 (앱 목록 조회 성공 여부 확인).

### Step 6: CLAUDE.md 라우팅 테이블 등록

프로젝트 루트 `CLAUDE.md` 파일에 라우팅 테이블 추가.
- 기존 파일 존재 시: 기존 내용 유지하고 끝에 추가
- 기존 파일 없으면: 새로 생성

추가할 라우팅 테이블:

```markdown
# abra 플러그인

## 사용 가능한 명령

| 명령 | 설명 |
|------|------|
| `/abra:dify-setup` | Dify Docker 환경 구축 |
| `/abra:setup` | 플러그인 초기 설정 (.env, 가상환경, 연결 테스트) |
| `/abra:scenario` | 요구사항 시나리오 생성 및 선택 |
| `/abra:dsl-generate` | Dify DSL 자동 생성 |
| `/abra:prototype` | Dify 프로토타이핑 자동화 |
| `/abra:dev-plan` | 개발계획서 작성 |
| `/abra:develop` | AI Agent 개발 및 배포 |

## 자동 라우팅

다음과 같은 요청은 자동으로 abra 플러그인이 처리합니다:
- "에이전트 만들어줘", "Agent 개발" → 전체 5단계 워크플로우
- "시나리오 생성해줘", "요구사항 정의" → /abra:scenario
- "DSL 생성해줘", "워크플로우 DSL" → /abra:dsl-generate
- "프로토타이핑 해줘", "Dify 업로드" → /abra:prototype
- "개발계획서 써줘" → /abra:dev-plan
- "코드 개발해줘", "Agent 구현" → /abra:develop
- "Dify 설치", "Docker 실행" → /abra:dify-setup
```

### Step 7: 결과 보고

설치 결과 요약:
- `.env` 설정 완료 여부
- 가상환경 및 의존성 설치 완료 여부
- Dify 연결 테스트 결과
- 라우팅 테이블 등록 완료 여부
- 사용 가능한 슬래시 명령 목록

## 사용자 상호작용

AskUserQuestion으로 Dify 접속 정보 수집 (Step 2).
