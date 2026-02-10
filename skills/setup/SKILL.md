---
name: setup
description: DMAP 빌더 플러그인 초기 설정
type: setup
user-invocable: true
---

# Setup

[SETUP 활성화]

---

## 목표

DMAP 빌더 플러그인의 초기 설정을 수행함.
이 플러그인은 외부 도구 의존성이 없으므로 도구 설치 과정 없이 활성화 확인만 수행.

[Top](#setup)

---

## 활성화 조건

사용자가 `/dmap:setup` 호출 시.

[Top](#setup)

---

## 워크플로우

### Step 1: 플러그인 활성화 확인

플러그인이 정상 로드되었는지 확인함.

- `.claude-plugin/plugin.json` 존재 확인
- `skills/` 디렉토리 존재 확인
- `commands/` 디렉토리 존재 확인

### Step 2: 표준 문서 접근성 확인

DMAP 표준 문서에 접근 가능한지 확인함.

- `standards/plugin-standard.md` 존재 확인
- `standards/plugin-standard-agent.md` 존재 확인
- `standards/plugin-standard-skill.md` 존재 확인
- `standards/plugin-standard-gateway.md` 존재 확인
- `resources/plugin-resources.md` 존재 확인

### Step 3: 설정 완료 보고

확인 결과를 사용자에게 보고함.

**출력 형식:**

```
✅ DMAP 빌더 플러그인 설정 완료

플러그인 상태:
- 플러그인 매니페스트: 확인
- 스킬 디렉토리: 확인
- 표준 문서: 전체 접근 가능

사용 가능한 명령:
- /dmap:develop-plugin  — DMAP 플러그인 개발
- /dmap:help            — 사용 안내
- /dmap:setup           — 초기 설정 (현재 실행 완료)
```

[Top](#setup)

---

## 적용 범위

현재 프로젝트에만 적용.

[Top](#setup)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 플러그인 매니페스트(`.claude-plugin/plugin.json`) 존재를 반드시 확인 |
| 2 | 표준 문서 5종 접근성을 모두 확인 후 결과 보고 |
| 3 | 설정 완료 메시지에 사용 가능한 명령 목록을 포함 |

[Top](#setup)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 파일 생성/수정/삭제 수행 금지 — 존재 확인만 수행 |
| 2 | 외부 네트워크 요청 수행 금지 |
| 3 | 표준 문서의 내용을 해석하거나 요약하지 않음 — 접근성만 확인 |

[Top](#setup)

---

## 검증 체크리스트

- [ ] `.claude-plugin/plugin.json` 존재 확인 로직 포함
- [ ] `skills/` 디렉토리 존재 확인 로직 포함
- [ ] `commands/` 디렉토리 존재 확인 로직 포함
- [ ] 표준 문서 5종 경로가 정확한가
- [ ] 설정 완료 출력 형식에 명령 목록 포함
- [ ] 에이전트 위임 없이 직접 수행하는 구조인가

[Top](#setup)
