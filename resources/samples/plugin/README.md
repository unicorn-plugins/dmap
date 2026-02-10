# Abra

> 자연어 한마디로 AI Agent를 뚝딱 만드는 Claude Code 플러그인

---

## 개요

Abra는 서비스 목적을 자연어로 입력하면 시나리오 생성부터 AI Agent 개발까지 5단계 워크플로우를 자동화하는 DMAP 플러그인임.
Dify 플랫폼과 연동하여 DSL 자동 생성, 프로토타이핑, 개발계획서 작성, 프로덕션 코드 구현까지 전 과정을 멀티에이전트가 수행함.

**주요 기능:**
- 서비스 목적만 입력하면 다양한 관점의 요구사항 시나리오 N개 자동 생성
- 시나리오 → Dify Workflow DSL(YAML) 자동 변환 및 사전 검증
- DSL → Dify import → publish → run → export 전 과정 자동화
- 검증된 DSL 기반으로 기술스택·아키텍처·테스트 전략 포함 개발계획서 자동 작성

---

## 설치

### 사전 요구사항

- [Claude Code](https://claude.com/claude-code) CLI 설치
- [Docker](https://www.docker.com/) + Docker Compose (Dify 실행용)
- Python 3.10+ (gateway 도구 실행용)

### 플러그인 설치

**방법 1: 마켓플레이스 — GitHub (권장)**

```bash
# 1. GitHub 저장소를 마켓플레이스로 등록
claude plugin marketplace add unicorn-inc/abra

# 2. 플러그인 설치 (형식: {플러그인명}@{마켓플레이스명})
claude plugin install abra@abra

# 3. 설치 확인
claude plugin list
```

**방법 2: 마켓플레이스 — 로컬**

```bash
# 1. 로컬 경로를 마켓플레이스로 등록
claude plugin marketplace add ./develop-agent/plugin/abra

# 2. 플러그인 설치
claude plugin install abra@abra

# 3. 설치 확인
claude plugin list
```

> **설치 후 setup 스킬 실행:**
> ```
> /abra:dify-setup
> /abra:setup
> ```
> - `dify-setup`: Dify Docker 환경 구축
> - `setup`: `.env` 설정, 가상환경 구성, 연결 테스트
> - `gateway/install.yaml`을 읽어 필수 MCP/LSP 서버 자동 설치
> - 설치 결과 검증 (`required: true` 항목 실패 시 중단)
> - 플러그인 활성화 확인 (스킬 자동 탐색)
> - 적용 범위 선택 (모든 프로젝트 / 현재 프로젝트만)

### 처음 GitHub을 사용하시나요?

다음 가이드를 참고하세요:

- [GitHub 계정 생성 가이드](https://github.com/cna-bootcamp/gen-ma-plugin/blob/main/resources/guides/github/github-account-setup.md)
- [Personal Access Token 생성 가이드](https://github.com/cna-bootcamp/gen-ma-plugin/blob/main/resources/guides/github/github-token-guide.md)
- [GitHub Organization 생성 가이드](https://github.com/cna-bootcamp/gen-ma-plugin/blob/main/resources/guides/github/github-organization-guide.md)

---

## 업그레이드

### Git Repository 마켓플레이스

저장소의 최신 커밋을 가져와 플러그인을 업데이트함.

```bash
# 마켓플레이스 업데이트 (최신 커밋 반영)
claude plugin marketplace update abra

# 플러그인 재설치
claude plugin install abra@abra

# 설치 확인
claude plugin list
```

> **버전 고정**: `marketplace.json`에 특정 `ref`/`sha`가 지정된 경우,
> 저장소 관리자가 해당 값을 업데이트해야 새 버전이 반영됨.

> **갱신이 반영되지 않는 경우**: 플러그인을 삭제 후 재설치함.
> ```bash
> claude plugin remove abra@abra
> claude plugin marketplace update abra
> claude plugin install abra@abra
> ```

### 로컬 마켓플레이스

로컬 경로의 파일을 직접 갱신한 뒤 마켓플레이스를 업데이트함.

```bash
# 1. 로컬 플러그인 소스 갱신
cd ./develop-agent/plugin/abra
git pull origin main

# 2. 마켓플레이스 업데이트
claude plugin marketplace update abra

# 3. 플러그인 재설치
claude plugin install abra@abra
```

> **갱신이 반영되지 않는 경우**: 플러그인을 삭제 후 재설치함.
> ```bash
> claude plugin remove abra@abra
> claude plugin marketplace update abra
> claude plugin install abra@abra
> ```

> **setup 재실행**: 업그레이드 후 `gateway/install.yaml`에 새 도구가 추가된 경우
> `/abra:setup`을 재실행하여 누락된 도구를 설치할 것.

---

## 사용법

### 슬래시 명령

| 명령 | 설명 |
|------|------|
| `/abra:dify-setup` | Dify Docker 환경 구축 |
| `/abra:setup` | 플러그인 초기 설정 (.env, 가상환경, 연결 테스트) |
| `/abra:scenario` | 요구사항 시나리오 생성 및 선택 |
| `/abra:dsl-generate` | Dify DSL 자동 생성 |
| `/abra:prototype` | Dify 프로토타이핑 자동화 |
| `/abra:dev-plan` | 개발계획서 작성 |
| `/abra:develop` | AI Agent 개발 및 배포 |

### 사용 예시

```
사용자: 에이전트 만들어줘: 고객 문의를 자동 분류하고 응답하는 서비스
→ 전체 5단계 워크플로우 자동 시작
  시나리오 생성 → DSL 변환 → Dify 프로토타이핑 → 개발계획서 → AI Agent 개발
```

```
사용자: 시나리오 생성해줘        → scenario 스킬
사용자: DSL 만들어줘            → dsl-generate 스킬
사용자: 프로토타이핑 해줘        → prototype 스킬
사용자: 개발계획서 써줘          → dev-plan 스킬
사용자: 코드 개발해줘            → develop 스킬
```

---

## 에이전트 구성

| 에이전트 | 티어 | 역할 |
|----------|------|------|
| scenario-analyst | MEDIUM | 비즈니스 요구사항 → 구조화된 시나리오 |
| dsl-architect | HIGH | 시나리오 → Dify DSL YAML 설계·생성 |
| prototype-runner | MEDIUM | DSL → Dify 프로토타이핑 (자동 에러 수정) |
| plan-writer | MEDIUM | DSL + 요구사항 → 개발계획서 |
| agent-developer | HIGH | 개발계획서 → 프로덕션 코드 구현 |

---

## 요구사항

### 필수 도구

| 도구 | 유형 | 용도 |
|------|------|------|
| Docker + Docker Compose | Custom | Dify 로컬 환경 실행 |
| Python 3.10+ | Custom | gateway 도구(dify_cli, validate_dsl 등) 실행 |

### 런타임 호환성

| 런타임 | 지원 |
|--------|:----:|
| Claude Code | ✅ |
| Codex CLI | 미검증 |
| Gemini CLI | 미검증 |

---

## 디렉토리 구조

```
abra/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   ├── dify-setup/
│   │   └── SKILL.md
│   ├── setup/
│   │   └── SKILL.md
│   ├── orchestrate/
│   │   └── SKILL.md
│   ├── scenario/
│   │   └── SKILL.md
│   ├── dsl-generate/
│   │   └── SKILL.md
│   ├── prototype/
│   │   └── SKILL.md
│   ├── dev-plan/
│   │   └── SKILL.md
│   └── develop/
│       └── SKILL.md
├── agents/
│   ├── scenario-analyst/
│   │   ├── AGENT.md
│   │   ├── agentcard.yaml
│   │   └── references/
│   ├── dsl-architect/
│   │   ├── AGENT.md
│   │   ├── agentcard.yaml
│   │   └── references/
│   ├── prototype-runner/
│   │   ├── AGENT.md
│   │   └── agentcard.yaml
│   ├── plan-writer/
│   │   ├── AGENT.md
│   │   ├── agentcard.yaml
│   │   └── references/
│   └── agent-developer/
│       ├── AGENT.md
│       ├── agentcard.yaml
│       └── references/
├── gateway/
│   ├── install.yaml
│   ├── runtime-mapping.yaml
│   ├── .env
│   ├── requirements.txt
│   └── tools/
│       ├── dify_cli.py
│       ├── dify_client.py
│       ├── config.py
│       └── validate_dsl.py
├── docs/
│   └── develop-plan.md
├── commands/
│   ├── dify-setup.md
│   ├── setup.md
│   ├── scenario.md
│   ├── dsl-generate.md
│   ├── prototype.md
│   ├── dev-plan.md
│   └── develop.md
└── README.md
```

---

## 라이선스

MIT License - Unicorn Inc.
