# Claude Code 플러그인 가이드

> **Skills · Agents · Commands · Plugin**
> Claude Code의 네 가지 핵심 확장 메커니즘에 대한 완전 가이드

---

## 목차

1. [개요 및 관계](#개요-및-관계)
2. [Skills](#skills)
3. [Agents (Subagents)](#agents-subagents)
4. [Commands](#commands)
5. [Plugin](#plugin)
6. [통합 비교 및 선택 가이드](#통합-비교-및-선택-가이드)

---

## 개요 및 관계

Claude Code는 네 가지 확장 메커니즘을 제공합니다. 각각은 독립적으로 동작하지만 서로 조합해서 사용할 수 있습니다.

| 기능 | 한 줄 정의 | 위치 |
|------|-----------|------|
| **Skills** | Claude가 특정 작업을 수행하는 방법을 담은 지침 파일 | `.claude/skills/` 또는 `.claude/commands/` |
| **Agents** | 고유한 역할·도구·모델을 가진 맞춤형 AI 서브에이전트 | `.claude/agents/` |
| **Commands** | Skills의 이전 기능으로 Skills에 통합 | `.claude/commands/` |
| **Plugin** | Skills + Agents + Hooks + MCP를 하나로 묶어 공유 가능한 패키지 | `.claude-plugin/plugin.json` |

```
Plugin (배포·공유 단위)
  └── Skills      ← /plugin-name:skill-name 으로 호출
  └── Agents      ← 특정 역할 수행용 서브에이전트
  └── Hooks       ← 이벤트 기반 자동화
  └── MCP Servers ← 외부 서비스 연결
```

---

## Skills

### Skills란?

Skills는 Claude가 할 수 있는 작업을 확장하는 **지침 파일**입니다.   
`SKILL.md` 파일에 지침을 작성하면 Claude가 이를 자신의 도구 모음에 추가합니다.

- **직접 호출**: `/skill-name` 으로 명시적으로 실행
- **자동 호출**: 작업 컨텍스트에 따라 Claude가 관련 skill을 자동으로 선택해 사용

> **참고**: 기존 `.claude/commands/deploy.md` 방식과 `.claude/skills/deploy/SKILL.md` 방식은 동일하게 `/deploy`를 생성합니다. Commands가 Skills로 통합된 것입니다.

공식문서: https://code.claude.com/docs/ko/skills
  
### 파일 구조

```
.claude/
  skills/
    code-review/
      SKILL.md          ← 핵심 지침
      checklist.md      ← 지원 파일 (선택)
    deploy/
      SKILL.md
```

### SKILL.md 기본 형식

```markdown
---
description: 이 skill이 하는 일과 언제 사용하는지 설명 (필수)
user-invocable: true 							# 사용자 슬래시 명령으로 호출 허용 (선택. Default는 true)					
allowed-tools: Bash, Read         # 사용 가능한 도구 제한 (선택)
---

# Skill 이름

Claude에게 전달할 지침 내용을 여기에 작성합니다.

사용자 입력은 $ARGUMENTS 로 받습니다.
```

### Frontmatter 주요 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `description` | Claude의 자동 호출 판단 기준. 구체적일수록 정확히 트리거됨 | 필수 |
| `user-invocable` | 사용자가 슬래시 명령으로 호출 허용 여부 | `false` |
| `allowed-tools` | 이 skill에서 사용 가능한 도구 목록 | 제한 없음 |

### 인수 전달

`$ARGUMENTS` 자리 표시자로 사용자 입력을 받습니다.

```markdown
# 번역 Skill

"$ARGUMENTS" 언어로 다음 텍스트를 번역해 주세요.
```

호출 예시:
```
/translate 한국어
```

### 번들 Skills (내장 Skills)

Claude Code와 함께 제공되며 별도 설치 없이 사용 가능한 skills입니다.

| Skill | 목적 | 사용 빈도 |
|-------|------|----------|
| `/batch <instruction>` | 코드베이스 전체에서 대규모 변경을 병렬로 조율. 작업을 5~30개 단위로 분해하고 각 단위당 하나의 백그라운드 에이전트를 격리된 git worktree에서 생성. 예: `/batch migrate src/ from Solid to React` | ⭐⭐⭐⭐⭐ |
| `/simplify [focus]` | 최근 변경된 파일에서 코드 재사용, 품질, 효율성 문제를 검토 후 수정. 3개의 검토 에이전트를 병렬 생성하여 결과 집계 및 적용. 예: `/simplify focus on memory efficiency` | ⭐⭐⭐⭐ |
| `/claude-api` | 프로젝트 언어(Python, TypeScript, Java, Go, Ruby, C#, PHP, cURL)에 대한 Claude API 참조와 Agent SDK 참조 로드. 도구 사용, 스트리밍, 배치, 구조화된 출력 다룸 | ⭐⭐⭐⭐ |
| `/debug [description]` | 현재 세션에 대해 디버그 로깅을 활성화하고 세션 디버그 로그를 읽어 문제 해결. 선택적으로 문제를 설명하여 분석에 초점 | ⭐⭐⭐ |
| `/loop [interval] <prompt>` | 세션이 열려 있는 동안 프롬프트를 주기적으로 반복 실행. 배포 폴링, PR 감시 등에 유용. 예: `/loop 5m check if the deploy finished` | ⭐⭐ |

### Skills 위치

```
# 프로젝트별 (팀 공유)
.claude/skills/<skill-name>/SKILL.md

# 전역 (개인)
~/.claude/skills/<skill-name>/SKILL.md

# 플러그인 내
my-plugin/skills/<skill-name>/SKILL.md
```

---

## Agents (Subagents)

### Agents란?

Agents는 **고유한 역할·시스템 프롬프트·도구 제한·모델**을 가진 맞춤형 서브에이전트입니다. Claude가 복잡한 작업을 처리할 때 전문화된 에이전트에게 서브태스크를 위임합니다.

공식문서: https://code.claude.com/docs/ko/sub-agents
  
### 파일 구조

```
.claude/
  agents/
    security-reviewer.md    ← 에이전트 정의
    frontend-specialist.md
    data-analyst.md
```

### 에이전트 정의 파일 형식

```markdown
---
name: security-reviewer
description: 보안 취약점 분석 전문 에이전트. 코드 리뷰 시 보안 관련 판단이 필요할 때 사용.
model: claude-opus-4-5          # 이 에이전트에 사용할 모델 (선택)
allowed-tools: Read, Bash       # 허용 도구 제한
---

당신은 보안 전문가입니다. 다음 기준으로 코드를 분석합니다:

1. OWASP Top 10 취약점
2. 인증/인가 로직
3. 데이터 노출 위험
4. 의존성 취약점

각 발견사항에 대해 심각도(Critical / High / Medium / Low)와 수정 방안을 함께 제시합니다.
```

### 에이전트 팀 실행

여러 에이전트를 동시에 실행하여 병렬 처리할 수 있습니다.

```
# 단일 에이전트 호출
/agents → security-reviewer 선택

# 에이전트 팀 실행 (Claude가 자동으로 태스크 분배)
전체 코드베이스를 보안, 성능, 코드품질 관점에서 동시에 분석해 줘
```

### Plugin의 settings.json으로 기본 에이전트 지정

플러그인에서 기본 활성 에이전트를 지정할 수 있습니다:

```json
{
  "agent": "security-reviewer"
}
```

---

## Commands

### Commands란?

Commands는 **Skills의 이전 형태**로, 현재는 Skills로 완전히 통합되었습니다. 기존 `.claude/commands/` 파일은 그대로 계속 작동합니다.

| 방식 | 파일 위치 | 생성되는 명령어 |
|------|-----------|----------------|
| Commands (구) | `.claude/commands/deploy.md` | `/deploy` |
| Skills (신) | `.claude/skills/deploy/SKILL.md` | `/deploy` |

두 방식 모두 동일하게 작동하지만, Skills는 다음 추가 기능을 제공합니다:

- 지원 파일을 위한 디렉토리 구조
- `disable-model-invocation` 등 frontmatter 옵션
- Claude가 컨텍스트에 따라 자동으로 로드하는 기능

### Commands 형식 (하위 호환)

```markdown
<!-- .claude/commands/code-review.md -->

다음 코드를 리뷰해 주세요: $ARGUMENTS

## 리뷰 기준
1. 보안 취약점
2. 성능 병목
3. 코드 가독성
```

### 내장 명령어 (Built-in Commands)

Skills와 별개로 Claude Code에서 기본 제공하는 명령어입니다. 고정 로직으로 직접 실행됩니다.

| 명령어 | 기능 |
|--------|------|
| `/help` | 사용 가능한 skills·명령어 목록 표시 |
| `/clear` | 대화 컨텍스트 초기화 |
| `/compact` | 대화 내용 압축 |
| `/model` | 사용 모델 변경 |
| `/reload-plugins` | 플러그인 변경사항 즉시 적용 |

---

## Plugin

### Plugin이란?

Plugin은 Skills, Agents, Hooks, MCP Servers를 **하나의 디렉토리로 묶어 팀·커뮤니티와 공유**할 수 있는 패키지입니다. 마켓플레이스를 통해 배포하고 `/plugin install`로 설치합니다.

### 독립 실행형 vs 플러그인 비교

| 구분 | 독립 실행형 (`.claude/`) | 플러그인 |
|------|--------------------------|---------|
| 적합 용도 | 개인 워크플로우, 단일 프로젝트 | 팀 공유, 커뮤니티 배포 |
| skill 이름 | `/deploy` (짧은 이름) | `/my-plugin:deploy` (네임스페이스) |
| 공유 방법 | 수동 복사 | `/plugin install`로 설치 |
| 버전 관리 | 없음 | `plugin.json`의 semver |
| 실험·빠른 반복 | ✅ 적합 | 공유 준비 후 전환 |

> **권장 워크플로우**: `.claude/`로 실험 → 공유할 준비가 되면 플러그인으로 변환

### 플러그인 디렉토리 구조

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json         ← 필수: 플러그인 메타데이터
├── skills/
│   └── code-review/
│       └── SKILL.md
├── agents/
│   └── security-reviewer.md
├── hooks/
│   └── hooks.json
├── .mcp.json               ← MCP 서버 구성
├── .lsp.json               ← LSP 서버 구성 (선택)
├── settings.json           ← 기본 설정 (선택)
└── README.md
```

> ⚠️ **주의**: `skills/`, `agents/`, `hooks/`는 `.claude-plugin/` 안이 아닌 **플러그인 루트**에 위치해야 합니다. `.claude-plugin/` 안에는 `plugin.json`만 들어갑니다.

### plugin.json (매니페스트)

```json
{
  "name": "my-plugin",
  "description": "팀 공통 코드 품질 도구 모음",
  "version": "1.0.0",
  "author": {
    "name": "홍길동"
  },
  "homepage": "https://github.com/org/my-plugin",
  "license": "MIT"
}
```

| 필드 | 역할 |
|------|------|
| `name` | 플러그인 고유 식별자 + skill 네임스페이스 접두사 |
| `description` | 마켓플레이스에 표시되는 설명 |
| `version` | 의미 있는 버전 관리 (semver) |
| `author` | 제작자 정보 (선택) |

### 로컬 테스트

```bash
# 플러그인 로드
claude --plugin-dir ./my-plugin

# 변경사항 반영 (재시작 없이)
/reload-plugins

# 여러 플러그인 동시 로드
claude --plugin-dir ./plugin-a --plugin-dir ./plugin-b
```

### 플러그인에 Skills 추가 예시

```markdown
<!-- my-plugin/skills/code-review/SKILL.md -->
---
name: code-review
description: 코드를 검토하고 보안·성능·가독성 이슈를 찾을 때 사용
---

코드를 다음 기준으로 리뷰합니다:
1. 보안 취약점 (OWASP Top 10)
2. 성능 병목 가능성
3. 코드 가독성 및 명명 규칙
4. 테스트 커버리지
```

호출:
```
/my-plugin:code-review
```

### 기존 구성을 플러그인으로 마이그레이션

```bash
# 1. 플러그인 구조 생성
mkdir -p my-plugin/.claude-plugin

# 2. 메타데이터 파일 생성
cat > my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-plugin",
  "description": "독립 실행형에서 마이그레이션",
  "version": "1.0.0"
}
EOF

# 3. 기존 파일 복사
cp -r .claude/commands  my-plugin/
cp -r .claude/agents    my-plugin/   # 있는 경우
cp -r .claude/skills    my-plugin/   # 있는 경우

# 4. 테스트
claude --plugin-dir ./my-plugin
```

마이그레이션 시 변경사항:

| 독립 실행형 | 플러그인 |
|-------------|---------|
| `.claude/commands/` | `my-plugin/commands/` |
| `settings.json`의 hooks | `hooks/hooks.json` |
| skill 이름: `/deploy` | skill 이름: `/my-plugin:deploy` |

### 마켓플레이스 제출

공식 Anthropic 마켓플레이스 제출:
- **Claude.ai**: [claude.ai/settings/plugins/submit](https://claude.ai/settings/plugins/submit)
- **Console**: [platform.claude.com/plugins/submit](https://platform.claude.com/plugins/submit)

---

## 통합 비교 및 선택 가이드

### 기능 한눈에 비교

| 기능 | Skills | Agents | Commands | Plugin |
|------|--------|--------|----------|--------|
| 주요 목적 | 작업 지침 확장 | 역할 특화 AI | Skills의 이전 형태 | 패키지·배포 단위 |
| 호출 방식 | `/skill-name` 또는 자동 | `/agents`에서 선택 | `/command-name` | `/plugin:skill-name` |
| 네임스페이스 | 없음 | 없음 | 없음 | `plugin-name:` 접두사 |
| 공유 방식 | 수동 복사 | 수동 복사 | 수동 복사 | 마켓플레이스 |
| 버전 관리 | 없음 | 없음 | 없음 | semver |
| 포함 가능 요소 | 지침 + 지원 파일 | 시스템 프롬프트 + 도구 | 지침 | Skills + Agents + Hooks + MCP |

### 시나리오별 선택

| 상황 | 선택 |
|------|------|
| 개인 반복 작업 자동화 | Skills (독립 실행형) |
| 팀 공통 코드 리뷰 기준 | Plugin으로 Skills 배포 |
| 보안 분석 전담 AI | Agents |
| 기존 `/command` 파일 활용 | Commands → 그대로 사용 가능 |
| 팀 전체에 도구 배포 | Plugin (마켓플레이스) |
| 단일 프로젝트 빠른 실험 | 독립 실행형 `.claude/` |

### 도입 단계별 권장 경로

```
1단계 (개인 실험)
  └── .claude/commands/ 또는 .claude/skills/ 로 시작
  └── 내장 skill 목록 파악 (/batch, /build, /test, /review)

2단계 (팀 표준화)
  └── 공통 Skills 정의 → .claude/skills/ 에 등록
  └── 전담 역할 Agents 생성 → .claude/agents/ 에 등록

3단계 (공유·배포)
  └── Plugin으로 묶기 → .claude-plugin/plugin.json 생성
  └── 마켓플레이스 제출 또는 팀 내부 배포
```

---

## 참고 링크

| 문서 | URL |
|------|-----|
| Skills 공식 문서 | https://code.claude.com/docs/ko/skills |
| Subagents 공식 문서 | https://code.claude.com/docs/ko/sub-agents |
| Plugin 만들기 | https://code.claude.com/docs/ko/plugins |
| Plugin 발견·설치 | https://code.claude.com/docs/ko/discover-plugins |
| Plugin Reference | https://code.claude.com/docs/ko/plugins-reference |
| Hooks 가이드 | https://code.claude.com/docs/ko/hooks-guide |
| MCP 연동 | https://code.claude.com/docs/ko/mcp |
