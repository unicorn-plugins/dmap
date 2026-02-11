---
name: help
description: DMAP 빌더 사용 안내
type: utility
user-invocable: true
---

# Help

[HELP 활성화]

---

## 목표

DMAP 빌더 플러그인의 사용 가능한 명령과 자동 라우팅 규칙을 안내함.
런타임 상주 파일(CLAUDE.md)에 라우팅 테이블을 등록하는 대신,
이 스킬이 호출 시에만 토큰을 사용하여 사용자 발견성을 제공함.

[Top](#help)

---

## 활성화 조건

사용자가 `/dmap:help` 호출 시 또는 "도움말", "뭘 할 수 있어", "DMAP 사용법" 키워드 감지 시.

[Top](#help)

---

## 워크플로우

**중요: 추가적인 파일 탐색이나 에이전트 위임 없이, 아래 내용을 즉시 사용자에게 출력하세요.**

### 사용 가능한 명령

| 명령 | 설명 |
|------|------|
| `/dmap:develop-plugin` | DMAP 플러그인 개발 (4-Phase 워크플로우) |
| `/dmap:requirement-writer` | 요구사항 정의서 작성 지원 (AI 자동 완성) |
| `/dmap:setup` | 플러그인 초기 설정 |
| `/dmap:publish` | 개발 완료된 플러그인을 GitHub에 배포 |
| `/dmap:add-ext-skill` | 외부호출 스킬(ext-{대상플러그인}) 추가 |
| `/dmap:remove-ext-skill` | 외부호출 스킬(ext-{대상플러그인}) 제거 |
| `/dmap:ext-abra` | Dify 워크플로우 기반 AI Agent 개발 자동화 (외부 플러그인 위임) |
| `/dmap:ext-github-release-manager` | GitHub Release 문서 자동 생성·수정·삭제 (외부 플러그인 위임) |
| `/dmap:help` | 사용 안내 (현재 보고 있는 화면) |

### 자동 라우팅

다음과 같은 요청은 자동으로 DMAP 빌더가 처리함:

- "플러그인 만들어줘", "DMAP 플러그인 개발" → `/dmap:develop-plugin`
- "요구사항 작성", "정의서 작성", "요구사항 정의" → `/dmap:requirement-writer`
- "DMAP 설정", "빌더 설정" → `/dmap:setup`
- "배포해줘", "publish", "GitHub에 올려줘", "플러그인 등록" → `/dmap:publish`
- "도움말", "뭘 할 수 있어" → `/dmap:help`

### 요구사항 정의서 작성

`/dmap:requirement-writer`로 요구사항 정의서를 AI 도움으로 작성 가능:
- 필수 항목(기본정보, 핵심기능, 사용자 플로우)만 입력하면 AI가 자동 완성
- 에이전트 구성 힌트, 참고 공유 자원을 자동 추천
- 완성된 정의서는 `/dmap:develop-plugin`에서 바로 활용 가능

### 플러그인 개발 워크플로우

`/dmap:develop-plugin` 실행 시 다음 4단계를 순차 수행함:

```
Phase 1: 요구사항 수집     ──→ 사용자 확인
Phase 2: 설계 및 계획      ──→ 사용자 확인
Phase 3: 플러그인 개발     ──→ 사용자 확인
Phase 4: 검증 및 완료      ──→ 사용자 확인
  └──→ (선택) GitHub 배포  ──→ /dmap:publish
```

### 참조 문서

| 문서 | 경로 |
|------|------|
| DMAP 빌더 표준 | `standards/plugin-standard.md` |
| Agent 표준 | `standards/plugin-standard-agent.md` |
| Skill 표준 | `standards/plugin-standard-skill.md` |
| Gateway 표준 | `standards/plugin-standard-gateway.md` |
| 리소스 마켓플레이스 | `resources/plugin-resources.md` |
| 플러그인 개발 가이드 | `resources/guides/plugin/plugin-dev-guide.md` |

[Top](#help)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 추가적인 파일 탐색이나 에이전트 위임 없이 즉시 출력 |
| 2 | 사용 가능한 모든 명령을 빠짐없이 나열 |
| 3 | 자동 라우팅 키워드를 정확히 안내 |

[Top](#help)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 파일 읽기/탐색 수행 금지 — 하드코딩된 내용만 출력 |
| 2 | 에이전트 위임 금지 |
| 3 | 표준 문서 내용을 해석/요약하여 출력 금지 — 경로 안내만 |

[Top](#help)

---

## 검증 체크리스트

- [ ] 모든 사용 가능한 명령이 나열되어 있는가
- [ ] 자동 라우팅 키워드가 정확한가
- [ ] 즉시 출력 방식(파일 탐색 없음)이 명시되어 있는가
- [ ] 참조 문서 경로가 정확한가
- [ ] 에이전트 위임이 없는가

[Top](#help)
