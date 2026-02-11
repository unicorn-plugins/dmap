# {플러그인 표시명}

> {플러그인 한 줄 설명}

---

## 개요

{플러그인이 해결하는 문제와 주요 기능을 2~3문장으로 설명}

**주요 기능:**
- {기능 1}
- {기능 2}
- {기능 3}

---

## 설치

### 사전 요구사항

- [Claude Code](https://claude.com/claude-code) CLI 설치
- {추가 요구사항 있으면 기술}

### 플러그인 설치

**방법 1: 마켓플레이스 — GitHub (권장)**

```bash
# 1. GitHub 저장소를 마켓플레이스로 등록
claude plugin marketplace add {owner}/{repo}

# 2. 플러그인 설치 (형식: {플러그인명}@{마켓플레이스명})
claude plugin install {plugin-name}@{marketplace-name}

# 3. 설치 확인
claude plugin list
```

**방법 2: 마켓플레이스 — 로컬**

```bash
# 1. 로컬 경로를 마켓플레이스로 등록
claude plugin marketplace add ./{plugin-path}

# 2. 플러그인 설치
claude plugin install {plugin-name}@{marketplace-name}

# 3. 설치 확인
claude plugin list
```

> **설치 후 setup 스킬 실행:**
> ```
> /{plugin-name}:setup
> ```
> - `gateway/install.yaml`을 읽어 필수 MCP/LSP 서버 자동 설치
> - 설치 결과 검증 (`required: true` 항목 실패 시 중단)
> - 플러그인 활성화 확인 (스킬 자동 탐색)
> - 적용 범위 선택 (모든 프로젝트 / 현재 프로젝트만)

### 처음 GitHub을 사용하시나요?

다음 가이드를 참고하세요:

- [GitHub 계정 생성 가이드](https://github.com/unicorn-plugins/gen-ma-plugin/blob/main/resources/guides/github/github-account-setup.md)
- [Personal Access Token 생성 가이드](https://github.com/unicorn-plugins/gen-ma-plugin/blob/main/resources/guides/github/github-token-guide.md)
- [GitHub Organization 생성 가이드](https://github.com/unicorn-plugins/gen-ma-plugin/blob/main/resources/guides/github/github-organization-guide.md)

---

## 업그레이드

### Git Repository 마켓플레이스

저장소의 최신 커밋을 가져와 플러그인을 업데이트함.

```bash
# 마켓플레이스 업데이트 (최신 커밋 반영)
claude plugin marketplace update {marketplace-name}

# 플러그인 재설치
claude plugin install {plugin-name}@{marketplace-name}

# 설치 확인
claude plugin list
```

> **버전 고정**: `marketplace.json`에 특정 `ref`/`sha`가 지정된 경우,
> 저장소 관리자가 해당 값을 업데이트해야 새 버전이 반영됨.

> **갱신이 반영되지 않는 경우**: 플러그인을 삭제 후 재설치함.
> ```bash
> claude plugin remove {plugin-name}@{marketplace-name}
> claude plugin marketplace update {marketplace-name}
> claude plugin install {plugin-name}@{marketplace-name}
> ```

### 로컬 마켓플레이스

로컬 경로의 파일을 직접 갱신한 뒤 마켓플레이스를 업데이트함.

```bash
# 1. 로컬 플러그인 소스 갱신 (예: git pull 또는 파일 복사)
cd {plugin-source-path}
git pull origin main

# 2. 마켓플레이스 업데이트
claude plugin marketplace update {marketplace-name}

# 3. 플러그인 재설치
claude plugin install {plugin-name}@{marketplace-name}
```

> **갱신이 반영되지 않는 경우**: 플러그인을 삭제 후 재설치함.
> ```bash
> claude plugin remove {plugin-name}@{marketplace-name}
> claude plugin marketplace update {marketplace-name}
> claude plugin install {plugin-name}@{marketplace-name}
> ```

> **setup 재실행**: 업그레이드 후 `gateway/install.yaml`에 새 도구가 추가된 경우
> `/{plugin-name}:setup`을 재실행하여 누락된 도구를 설치할 것.

---

## 사용법

### 슬래시 명령

| 명령 | 설명 |
|------|------|
| `/{plugin-name}:setup` | 플러그인 초기 설정 |
| `/{plugin-name}:{skill-name}` | {스킬 설명} |

### 사용 예시

```
사용자: {예시 요청}
→ 플러그인이 {수행 내용}을 자동으로 처리
```

---

## 에이전트 구성

| 에이전트 | 티어 | 역할 |
|----------|------|------|
| {agent-name} | {HIGH/MEDIUM/LOW} | {역할 설명} |

---

## 요구사항

### 필수 도구

| 도구 | 유형 | 용도 |
|------|------|------|
| {도구명} | MCP/LSP/Custom | {용도 설명} |

### 런타임 호환성

| 런타임 | 지원 |
|--------|:----:|
| Claude Code | ✅ |
| Codex CLI | {✅/❌/미검증} |
| Gemini CLI | {✅/❌/미검증} |

---

## 디렉토리 구조

```
{plugin-name}/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── setup/
│   │   └── SKILL.md
│   └── {skill-name}/
│       └── SKILL.md
├── agents/
│   └── {agent-name}/
│       ├── AGENT.md
│       ├── agentcard.yaml
│       └── tools.yaml
├── gateway/
│   ├── install.yaml
│   └── runtime-mapping.yaml
├── commands/
│   └── {skill-name}.md
└── README.md
```

---

## 라이선스

{라이선스 정보 (예: MIT License)}
