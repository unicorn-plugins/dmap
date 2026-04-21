# Agent Runtime Adapters Guide

에이전트 SSOT(`agents/{name}/`)를 각 AI 런타임에서 인식시키기 위한
**얇은 포인터 스텁** 생성·동기화 가이드.

---

## 목차
- [1. 개요 (SSOT + Pointer 원칙)](#1-개요-ssot--pointer-원칙)
- [2. 런타임별 포맷 비교](#2-런타임별-포맷-비교)
- [3. 치환 변수 사전](#3-치환-변수-사전)
- [4. 런타임별 템플릿](#4-런타임별-템플릿)
- [5. tier → model 해결 규칙](#5-tier--model-해결-규칙)
- [6. MUST / MUST NOT](#6-must--must-not)
- [7. 검증 체크리스트](#7-검증-체크리스트)

---

## 1. 개요 (SSOT + Pointer 원칙)

### SSOT
```
agents/{name}/AGENT.md + agentcard.yaml + tools.yaml
```
에이전트의 역할·워크플로우·정체성·도구 명세를 담는 **유일한 원본**.
개발자는 여기만 편집함.

### Pointer 스텁
```
.claude/agents/{name}.md        # Claude Code / CoWork
.cursor/agents/{name}.md        # Cursor
.codex/agents/{name}.toml       # Codex
.antigravity/agents/{name}.md   # Antigravity (Manager UI 수동 로드)
```
각 런타임이 에이전트를 스폰할 때 주입하는 초기 프롬프트가
"SSOT 3파일을 읽고 그에 따라 행동하라"는 지시문이 되도록 하는 **얇은 스텁**.

### 원칙
- 스텁은 develop-plugin Step 4-A가 자동 생성
- **Git 커밋 대상** (`.gitignore` 제외)
- 수동 편집 금지 — SSOT 변경 후 develop-plugin 재실행으로만 갱신
- setup의 tier-mapping 갱신 시 frontmatter `model:` 필드만 동기화 허용

---

## 2. 런타임별 포맷 비교

| 런타임 | 경로 | 포맷 | frontmatter 필드 |
|--------|------|------|----------------|
| Claude Code / CoWork | `.claude/agents/{name}.md` | Markdown + YAML frontmatter | name, description, model |
| Cursor | `.cursor/agents/{name}.md` | Markdown + YAML frontmatter | name, description, model |
| Codex | `.codex/agents/{name}.toml` | TOML | name, description, model, developer_instructions |
| Antigravity | `.antigravity/agents/{name}.md` | Markdown + YAML frontmatter (UI 수동 로드 주석 포함) | name, description, model |

---

## 3. 치환 변수 사전

모든 템플릿은 아래 5개 변수만 사용.

| 변수 | 의미 | 출처 |
|------|------|------|
| `{name}` | 에이전트 식별자 (kebab-case) | 에이전트 디렉토리명 = `AGENT.md` frontmatter `name` |
| `{description}` | 에이전트 설명 (한 줄) | `AGENT.md` frontmatter `description` |
| `{model}` | 런타임별로 해결된 구체 모델명 | `gateway/runtime-mapping.yaml`의 tier→model 매핑 결과 |
| `{plugin}` | 플러그인 이름 | `{PLUGIN_DIR}/CLAUDE.md`의 `PLUGIN_NAME` 변수 |
| `{fqn}` | 정규화된 이름 | `{plugin}:{name}:{name}` 패턴으로 조합 |

---

## 4. 런타임별 템플릿

각 템플릿은 `{DMAP_PLUGIN_DIR}/resources/templates/runtime-adapters/` 하위에 존재.

| 런타임 | 템플릿 파일 |
|--------|------------|
| Claude Code / CoWork | `claude-code.md.tmpl` |
| Cursor | `cursor.md.tmpl` |
| Codex | `codex.toml.tmpl` |
| Antigravity | `antigravity.md.tmpl` |

### 공통 구조
- **Header 주석**: "AUTO-GENERATED ... DO NOT EDIT"
- **Frontmatter**: name, description, model (Codex는 TOML 상위 키)
- **본문**: 에이전트 정체성 선언(FQN) + SSOT 3파일 읽기 필수 지시

### Codex(TOML) 특이사항
본문은 `developer_instructions` 멀티라인 문자열로 감싸며,
Claude Code의 본문과 의미가 동일한 영문 지시문을 포함.

### Antigravity 특이사항
본문은 Claude Code와 동일. 추가로 "Manager UI에서 수동 로드" 안내 주석이
헤더에 포함됨. 프로그래매틱 스폰 API가 확인될 때까지 최선 노력 지원.

---

## 5. tier → model 해결 규칙

### 기본 규칙
develop-plugin Step 4-A는 `{PLUGIN_DIR}/gateway/runtime-mapping.yaml`의 `tier_mapping` 섹션을
읽어 **각 런타임별로 해결된 model**을 계산하고 스텁 frontmatter에 기록.

### runtime-mapping.yaml 4런타임 강제 규칙
`tier_mapping`은 Claude Code/CoWork · Cursor · Codex · Antigravity **4런타임 모두에 대한
tier별 모델 엔트리를 포함해야 함**. 누락 시 develop-plugin Step 4-A가 에러 보고 후 중단.

예시 구조:
```yaml
tier_mapping:
  HIGH:
    claude-code: opus
    cursor: opus
    codex: gpt-5.4
    antigravity: opus
  MEDIUM:
    claude-code: sonnet
    cursor: sonnet
    codex: gpt-5.4-mini
    antigravity: sonnet
  LOW:
    claude-code: haiku
    cursor: haiku
    codex: gpt-5.4-mini
    antigravity: haiku
```

### 모델 범위
- Claude Code / CoWork / Cursor / Antigravity: **Claude 모델**(`opus`, `sonnet`, `haiku` 등)
- Codex: **OpenAI 모델**(`gpt-5.4`, `gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.4-mini` 등)

### 갱신 전파 규칙 (setup 스킬용)
setup이 `runtime-mapping.yaml`의 tier-mapping을 갱신하면, **모든 런타임 스텁의
frontmatter `model:`을 동일 매핑으로 치환**. 본문은 불변.

런타임별 치환 위치:
- Markdown(claude-code / cursor / antigravity): YAML frontmatter의 `model:` 라인
- TOML(codex): 상위 `model = "..."` 라인

스텁 본문·AUTO-GENERATED 주석·FQN·지시문은 절대 변경하지 않음.

---

## 6. MUST / MUST NOT

### MUST
1. 스텁은 develop-plugin Step 4-A에서만 생성 (setup 등 다른 단계에서 생성 금지)
2. `tier_mapping`에 4런타임(claude-code / cursor / codex / antigravity) 모두 엔트리 필수
3. 스텁 생성 결과는 Git 커밋 대상 (`.gitignore`에 포함 금지)
4. setup이 tier-mapping을 갱신하면 모든 스텁의 frontmatter `model:` 동기화 갱신
5. 템플릿 치환 변수는 `{name}`, `{description}`, `{model}`, `{plugin}`, `{fqn}` 5종으로 제한

### MUST NOT
1. 스텁 본문 수동 편집 금지 (SSOT 변경 후 develop-plugin 재실행만 허용)
2. 스텁을 SSOT로 취급하지 말 것 (실제 역할 정의는 `agents/{name}/`에만 존재)
3. `.claude/agents/` 등 런타임 디렉토리를 `.gitignore`에 추가 금지
4. setup에서 스텁 본문·지시문·FQN 수정 금지 (frontmatter `model:`만 동기화 허용)
5. 필수 메타(name/description) 부재 시 빈 문자열로 치환하지 말고 에러 보고 후 중단

---

## 7. 검증 체크리스트

- [ ] 모든 에이전트에 대해 4런타임 스텁(`.claude/`, `.cursor/`, `.codex/`, `.antigravity/`)이 존재하는가
- [ ] 스텁 frontmatter의 `model:` 값이 `runtime-mapping.yaml`의 tier 해결 결과와 일치하는가
- [ ] 스텁 본문의 FQN이 `{plugin}:{name}:{name}` 패턴과 일치하는가
- [ ] 스텁이 `.gitignore`에 포함되지 않았는가
- [ ] 수동 편집 흔적이 없는가 (AUTO-GENERATED 주석 보존)
- [ ] `tier_mapping`에 4런타임(claude-code / cursor / codex / antigravity) 모두 엔트리 존재하는가
- [ ] setup이 tier-mapping을 갱신한 경우 모든 스텁의 frontmatter `model:`이 동일 매핑으로 동기화되었는가
