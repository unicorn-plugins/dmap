---
name: add-ext-skill
description: 외부호출 스킬(ext-{대상플러그인}) 추가 유틸리티
type: utility
user-invocable: true
---

# Add Ext Skill

- [Add Ext Skill](#add-ext-skill)
  - [목표](#목표)
  - [활성화 조건](#활성화-조건)
  - [워크플로우](#워크플로우)
    - [Step 1: 대상 플러그인 탐색](#step-1-대상-플러그인-탐색)
    - [Step 2: 대상 플러그인 선택](#step-2-대상-플러그인-선택)
    - [Step 3: 플러그인 명세서 다운로드](#step-3-플러그인-명세서-다운로드)
    - [Step 4: 도메인 컨텍스트 수집](#step-4-도메인-컨텍스트-수집)
    - [Step 5: ext-{대상플러그인} External 스킬 생성](#step-5-ext-대상플러그인-external-스킬-생성)
    - [Step 6: commands/ 진입점 생성](#step-6-commands-진입점-생성)
    - [Step 7: help 스킬 업데이트](#step-7-help-스킬-업데이트)
  - [참고사항](#참고사항)
    - [External 스킬 frontmatter](#external-스킬-frontmatter)
    - [External 스킬 필수 섹션](#external-스킬-필수-섹션)
    - [External 스킬 commands 진입점](#external-스킬-commands-진입점)
    - [Skill→Skill 입력 전달 규약](#skillskill-입력-전달-규약)
  - [MUST 규칙](#must-규칙)
  - [MUST NOT 규칙](#must-not-규칙)
  - [검증 체크리스트](#검증-체크리스트)

[ADD-EXT-SKILL 활성화]

---

## 목표

사용자가 `/dmap:add-ext-skill`로 호출하여
외부호출 스킬(ext-{대상플러그인})을 언제든 추가할 수 있게 함.

[Top](#add-ext-skill)

---

## 활성화 조건

사용자가 `/dmap:add-ext-skill` 호출 시.

[Top](#add-ext-skill)

---

## 워크플로우

### Step 1: 대상 플러그인 탐색

- dmap 리소스 마켓플레이스에서 플러그인 카탈로그를 다운로드:
  `curl https://raw.githubusercontent.com/unicorn-plugins/dmap/refs/heads/main/resources/plugin-resources.md > .dmap/plugin-resources.md`
- `.dmap/plugin-resources.md`의 플러그인 목록 조회
- 다운로드 실패 시: `.dmap/plugin-resources.md` 캐시 파일이 있으면 재사용, 없으면 사용자에게 대상 플러그인명을 직접 입력받음

### Step 2: 대상 플러그인 선택

- AskUserQuestion으로 추가할 대상 플러그인 선택
- 이미 ext-{대상플러그인} 스킬이 존재하면 중복 안내 후 중단

### Step 3: 플러그인 명세서 다운로드

- 선택한 플러그인의 명세서를 dmap 리소스 마켓플레이스에서 다운로드:
  `curl https://raw.githubusercontent.com/unicorn-plugins/dmap/refs/heads/main/resources/plugins/{분류}/{name}.md > .dmap/plugins/{name}.md`
- `.dmap/plugins/{name}.md` 로드
- 다운로드 실패 시: 캐시 파일이 있으면 재사용, 없으면 사용자에게 안내하고 중단

### Step 4: 도메인 컨텍스트 수집

- `.dmap/dmap/requirements.md` (요구사항 정의서)
- `.claude-plugin/plugin.json` (플러그인 메타데이터)

### Step 5: ext-{대상플러그인} External 스킬 생성

- 아래 "참고사항"의 External 유형 표준 골격을 기반으로 생성
- `skills/ext-{대상플러그인}/SKILL.md` 파일 작성
- 명세서의 제공 스킬(FQN), ARGS 스키마, 실행 경로, 도메인 컨텍스트 수집 가이드를 반영
- 요구사항 정의서에서 도메인 컨텍스트를 추출하여 반영

### Step 6: commands/ 진입점 생성

- `commands/ext-{대상플러그인}.md` 파일 작성

### Step 7: help 스킬 업데이트

- `skills/help/SKILL.md`의 명령 테이블에 `/dmap:ext-{대상플러그인}` 추가

[Top](#add-ext-skill)

---

## 참고사항

External 유형 표준 골격 (자기 완결적 참조용):

### External 스킬 frontmatter

```yaml
---
name: ext-{대상플러그인}
description: 외부 플러그인 위임으로 {대상플러그인} 워크플로우 실행
user-invocable: true
---
```

### External 스킬 필수 섹션

| 섹션 | 설명 |
|------|------|
| 목표 | 외부 플러그인 워크플로우 활용 목적 |
| 선행 요구사항 | 외부 플러그인 설치 확인 방법 |
| 활성화 조건 | 슬래시 명령 및 키워드 |
| 크로스-플러그인 스킬 위임 규칙 | 외부 스킬 FQN 및 용도 테이블 |
| 도메인 컨텍스트 수집 | 수집 대상·소스·용도 테이블 |
| 워크플로우 | Phase 0: 선행 확인, Phase 1: 컨텍스트 수집, Phase 2: 경로 분기, Phase 3: 외부 스킬 위임, Phase 4: 결과 검증 |
| 완료 조건 | 체크리스트 |
| 검증 프로토콜 | 산출물 검증 방법 |
| 상태 정리 | 임시 파일 처리 |
| 취소/재개 | 중단·재시작 방법 |
| 스킬 부스팅 | OMC 스킬 활용 테이블 |
| MUST 규칙 | 필수 규칙 테이블 |
| MUST NOT 규칙 | 금지 사항 테이블 |
| 검증 체크리스트 | 검증 항목 체크리스트 |

### External 스킬 commands 진입점

```yaml
---
description: {대상플러그인} 워크플로우 실행 (외부 플러그인 위임)
allowed-tools: Read, Skill
---

Use the Skill tool to invoke the `dmap:ext-{대상플러그인}` skill with all arguments passed through.
```

### Skill→Skill 입력 전달 규약

ARGS JSON 루트 키 구조:
```json
{
  "source_plugin": "dmap",
  "{대상스킬명}_key": "value"
}
```

[Top](#add-ext-skill)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | Step 2에서 중복 ext-{} 스킬 존재 시 안내 후 중단 |
| 2 | Step 5에서 External 유형 표준 골격(참고사항 섹션)을 기반으로 생성 |
| 3 | Step 7에서 help 스킬의 명령 테이블을 반드시 업데이트 |
| 4 | 명세서의 ARGS 스키마, 실행 경로, 제공 스킬 정보를 ext-{} 스킬에 정확히 반영 |

[Top](#add-ext-skill)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 이미 존재하는 ext-{} 스킬을 덮어쓰지 않음 |
| 2 | 명세서에 정의되지 않은 스킬 FQN을 임의로 생성하지 않음 |
| 3 | help 스킬의 기존 명령 테이블 구조(헤더, 구분선)를 훼손하지 않음 |

[Top](#add-ext-skill)

---

## 검증 체크리스트

- [ ] 플러그인 카탈로그 다운로드 또는 캐시 재사용이 동작하는가
- [ ] 중복 ext-{} 스킬 존재 시 안내 후 중단되는가
- [ ] 명세서 다운로드 실패 시 적절히 처리되는가
- [ ] skills/ext-{대상플러그인}/SKILL.md가 External 유형 표준을 준수하는가
- [ ] commands/ext-{대상플러그인}.md가 생성되는가
- [ ] help 스킬의 명령 테이블에 새 명령이 추가되는가

[Top](#add-ext-skill)
