---
name: remove-ext-skill
description: 외부호출 스킬(ext-{대상플러그인}) 제거 유틸리티
type: utility
user-invocable: true
---

# Remove Ext Skill

[REMOVE-EXT-SKILL 활성화]

---

## 목표

사용자가 `/dmap:remove-ext-skill`로 호출하여 기존 외부호출 스킬(ext-{대상플러그인})을 제거할 수 있게 함.

[Top](#remove-ext-skill)

---

## 활성화 조건

사용자가 `/dmap:remove-ext-skill` 호출 시.

[Top](#remove-ext-skill)

---

## 작업 환경 변수 로드

AGENTS.md에서 아래 환경변수 로드함. 없으면 `/dmap:setup`을 먼저 수행하도록 안내하고 종료.
- DMAP_PLUGIN_DIR: DMAP 플러그인의 루트 절대 경로

[Top](#remove-ext-skill)

---

## 워크플로우

### Step 1: 기존 ext-{} 스킬 목록 조회

- `{DMAP_PLUGIN_DIR}/skills/` 디렉토리에서 `ext-` 접두사로 시작하는 하위 디렉토리 탐색
- ext-{} 스킬이 0개이면 "제거할 외부호출 스킬이 없습니다" 안내 후 종료
- 발견된 ext-{} 스킬 목록을 사용자에게 표시

### Step 2: 제거할 스킬 선택

- AskUserQuestion으로 제거할 ext-{대상플러그인} 스킬 선택
- 선택된 스킬의 SKILL.md를 읽어 스킬 정보(name, description) 표시
- "정말 제거하시겠습니까?" 최종 확인 (AskUserQuestion: 예/아니오)
- 사용자가 취소하면 즉시 중단

### Step 3: ext-{대상플러그인} 스킬 디렉토리 삭제

- `{DMAP_PLUGIN_DIR}/skills/ext-{대상플러그인}/` 디렉토리 전체 삭제
- 삭제 성공 여부 확인

### Step 4: commands/ 진입점 삭제

- `{DMAP_PLUGIN_DIR}/commands/ext-{대상플러그인}.md` 파일 삭제
- 파일 미존재 시 무시 (이미 삭제된 상태일 수 있음)

### Step 5: help 스킬 업데이트

- `{DMAP_PLUGIN_DIR}/skills/help/SKILL.md`의 명령 테이블에서 `/dmap:ext-{대상플러그인}` 행 제거
- 제거 완료 메시지 출력: "ext-{대상플러그인} 외부호출 스킬이 제거되었습니다"

[Top](#remove-ext-skill)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 삭제 전 반드시 사용자 최종 확인을 받을 것 |
| 2 | ext-{} 접두사가 아닌 스킬(setup, help, add-ext-skill, remove-ext-skill 등)은 제거 대상에서 제외할 것 |
| 3 | help 스킬의 명령 테이블에서 해당 행만 정확히 제거할 것 (다른 행 훼손 금지) |

[Top](#remove-ext-skill)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | ext-{} 접두사가 아닌 스킬 디렉토리를 삭제하지 않을 것 |
| 2 | 사용자 확인 없이 삭제를 수행하지 않을 것 |
| 3 | help 스킬의 명령 테이블 구조(헤더, 구분선)를 훼손하지 않을 것 |

[Top](#remove-ext-skill)

---

## 검증 체크리스트

- [ ] ext-{} 스킬 0개일 때 조기 종료가 동작하는가
- [ ] 삭제 전 사용자 최종 확인 단계가 존재하는가
- [ ] {DMAP_PLUGIN_DIR}/skills/ext-{대상플러그인}/ 디렉토리가 완전히 삭제되었는가
- [ ] {DMAP_PLUGIN_DIR}/commands/ext-{대상플러그인}.md 파일이 삭제되었는가
- [ ] help 스킬의 명령 테이블에서 해당 행이 제거되었는가
- [ ] 다른 스킬/명령에 부수효과가 없는가

[Top](#remove-ext-skill)
