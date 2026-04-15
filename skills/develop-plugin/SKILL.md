---
name: develop-plugin
description: DMAP 플러그인 개발 (4-Phase 워크플로우)
type: orchestrator
user-invocable: true
---

# Develop Plugin

## 목표

사용자의 팀 기획서를 기반으로 DMAP 표준에 맞는 플러그인을 자동 생성함.
4-Phase 워크플로우를 순차 수행하며, 각 Phase 완료 시 사용자 승인을 받음.

[Top](#develop-plugin)

---

## 활성화 조건

사용자가 `/dmap:develop-plugin` 호출 시 또는 "플러그인 만들어줘", "DMAP 플러그인 개발" 키워드 감지 시.

[Top](#develop-plugin)

---

## 작업 환경 변수 로드 
CLAUDE.md에서 아래 환경변수 로드함. 없으면 '/dmap:team-panner'를 먼저 수행하도록 안내하고 종료.   
- CLAUDE_RUNTIME: 런타임 종류. Claude Code 또는 Claude CoWork 
- DMAP_PLUGIN_DIR: DMAP 플러그인의 루트 절대 경로 
- PLUGIN_DIR: 생성할 플러그인의 루트 절대 경로 
- PLUGIN_NAME: 생성할 플러그인 이름 

[Top](#develop-plugin)

---

## 참조

| 문서 | 경로 | 용도 |
|------|------|------|
| 플러그인 개발 가이드 | `{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md` | 상세 워크플로우 참조 |
| DMAP 빌더 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md` | 디렉토리 구조, 배포, 네임스페이스 |
| Agent 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md` | 에이전트 패키지 작성 규칙 |
| Skill 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md` | 스킬 작성 규칙, 유형별 템플릿 |
| Gateway 표준 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-gateway.md` | install.yaml, runtime-mapping.yaml 작성 |
| 리소스 마켓플레이스 | `{DMAP_PLUGIN_DIR}/resources/plugin-resources.md` | 공유 자원 카탈로그 |
| README 템플릿 | `{DMAP_PLUGIN_DIR}/resources/templates/plugin/README-plugin-template.md` | README.md 작성 참고 |
| README 예제 | `{DMAP_PLUGIN_DIR}/resources/samples/plugin/README.md` | README.md 작성 예시 |
| Publish 스킬 | `{DMAP_PLUGIN_DIR}/skills/publish/SKILL.md` | GitHub 배포 자동화 |

[Top](#develop-plugin)

---

## 스킬 부스팅

| 단계 | 부스팅 스킬 | 용도 |
|------|------------|------|
| Phase 2 Step 3 | `/oh-my-claudecode:ralplan` | 개발 계획서 작성 (Planner+Architect+Critic 합의) |
| Phase 3 | `/oh-my-claudecode:ralph` | 플러그인 개발 실행 (완료까지 지속) |

[Top](#develop-plugin)

---

## 워크플로우

(중요) 특별한 언급이 없는 경우 한글로 작성함   

### Phase 1: 요구사항 수집

`{PLUGIN_DIR/output/team-plan-{PLUGIN_NAME}.md}` 팀 기획서를 분석하고, 부족한 정보를 사용자에게 문의하여 수집함.

**Step 1. 요구사항 파악**

사용자가 제공한 팀 기획서의 각 항목을 분석함.  
팀 기획서 탐색 순서:
1. `{PLUGIN_DIR}/output/team-plan-{PLUGIN_NAME}.md` 파일이 존재하면 자동 로드하여 사용
   (team-planner 스킬로 사전 작성된 기획서)
2. 사용자가 메시지에 기획서 내용을 직접 포함한 경우 해당 내용 사용
3. 위 두 경우에 해당하지 않으면 `{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md`의
   "팀 기획서 > 기획서 작성 양식"을 참고하여
   사용자에게 핵심 항목(플러그인명, 목적, 핵심기능, 사용자 플로우)을 문의함

**Step 2. 플러그인 적합여부 판단**

요구사항이 DMAP 플러그인으로 구현하기 적합한지 판단함.

| 기준 | 적합 | 부적합 |
|------|------|--------|
| 반복 가능성 | 반복 사용할 워크플로우 | 일회성 작업 |
| 역할 분리 | 2개 이상 전문가 역할 필요 | 단일 작업 수행 |
| 도구 의존성 | 외부 도구/API 연동 필요 | 순수 대화만으로 해결 |
| 도메인 지식 | 특정 도메인 가이드/참조 필요 | 범용 지식으로 충분 |

부적합 시 사용자에게 검토결과 및 보완사항 추천.

**Step 3. 사용자에게 문의하여 정보 수집**

팀 기획서에서 누락되거나 모호한 항목을 파악하여 AskUserQuestion 도구로 문의함.

기본 확인 항목:
- 미작성 필수 항목 (플러그인명, 목적, 핵심기능, 사용자 플로우)
- 핵심기능과 사용자 플로우 간 불일치
- 에이전트 역할 구분이 필요한 부분
- 외부 시스템 연동 여부 (API, DB, 파일 시스템 등)
- 기술 요건 (프로그래밍 언어, 프레임워크, 프로토콜, 데이터 형식 등)

**Step 4. 팀 기획서 업데이트**

수집된 정보를 반영하여 완성된 정의서를 `{PLUGIN_DIR}/.dmap/{PLUGIN_NAME}/requirements.md`에 저장함.

> **Phase 1 완료**: 업데이트된 팀 기획서를 사용자에게 보고하고 승인 요청.

### Phase 2: 설계 및 계획

수집된 요구사항을 기반으로 플러그인 구조를 설계하고 개발 계획 수립.

**Step 1. 공유 자원 선택**

`{DMAP_PLUGIN_DIR}/resources/plugin-resources.md`를 참조하여 플러그인에 활용할 공유 자원 선별.

| 자원 유형 | 선택 기준 |
|----------|----------|
| 가이드 | 개발에 참고할 기술 가이드 |
| 템플릿 | 산출물 생성에 활용할 템플릿 |
| 샘플 | 구현 참고용 샘플 코드/패턴 |
| 도구 | 개발/검증에 필요한 도구 |
| 플러그인 | 외부호출스킬(ext-{플러그인명})에서 위임할 대상 플러그인 명세 |

**Step 2. 플러그인 구조 설계**

DMAP 표준에 맞춰 플러그인의 전체 구조 설계.

| 설계 항목 | 참조 표준 |
|----------|----------|
| 에이전트 구성 (이름, 티어, 도구) | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-agent.md` |
| 스킬 구성 (목록, 유형) | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md` |
| Gateway 설정 (티어·도구·액션 매핑) | `{DMAP_PLUGIN_DIR}/standards/plugin-standard-gateway.md` |
| 디렉토리 구조 | `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md` |

**Step 3. 개발 계획 수립 (스킬 부스팅)**

`/oh-my-claudecode:ralplan` 스킬 부스팅 패턴을 적용하여 개발 계획서 작성.

개발 계획서 포함 사항:
- 공유자원 마켓플레이스에서 가져갈 자원 목록
- 개발할 커스텀 앱 또는 커스텀 CLI 파악 및 개발 계획
- 공유자원 외 필요한 외부 자원 파악 및 수집 계획
- DMAP 표준 산출물 목록 및 생성 순서

결과 파일: `{PLUGIN_DIR}/.dmap/{PLUGIN_NAME}/develop-plan.md`

**Step 4. 사용자 검토 및 보완**

사용자에게 개발 계획서 검토 요청.
피드백에 따라 계획서 보완 후 재승인.

> **Phase 2 완료**: 확정된 개발 계획서를 사용자에게 보고하고 개발 착수 승인 요청.

### Phase 3: 플러그인 개발

`/oh-my-claudecode:ralph` 스킬 부스팅 패턴을 적용하여 개발 계획서에 따라 플러그인 개발.

#### Step1. 플러그인 스켈레톤 생성 (`{PLUGIN_DIR}/.claude-plugin/`, 디렉토리 구조)
- `.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json` 작성 (플러그인 메타데이터, 마켓플레이스 정보)
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`은 `{DMAP_PLUGIN_DIR}/standards/plugin-standard.md`의 플러그인 메인 표준을 준수하여 작성
1. `.gitignore` 생성 (`.dmap/secrets/`, `__pycache__/`, `.env` 등 보안·임시 파일 제외. `output/` 디렉토리는 제외하지 않음)
2. Gateway 설정 (`{PLUGIN_DIR}/gateway/install.yaml`, `{PLUGIN_DIR}/gateway/runtime-mapping.yaml`)
3. 공유자원 복사 
  - {DMAP_PLUGIN_DIR}/resources/ → {PLUGIN_DIR}/resources/ 
  - {PLUGIN_DIR}/resources/resource.md에 '로컬 리소스 카탈로그' 작성하여 복사된 자원 목록과 간략 설명 기록
4. {PLUGIN_DIR}/agents/ 하위에 에이전트 개발 (`AGENT.md`, `agentcard.yaml`, `tools.yaml`)
5. {PLUGIN_DIR}/skills/ 하위에 스킬 개발
   - 기본 스킬: `{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md`의 각 유형별 표준 및 템플릿을 준수하여 생성
     - setup 스킬 (필수): 플러그인 초기 설정
     - help 스킬 (필수): 사용 안내
     - 기능 스킬: 요구사항에 따른 Core/Planning/Orchestrator/Utility 스킬
   - 외부호출 스킬 (사용자 요청 시): 사용자가 외부 플러그인 연동을 요청한 경우에만 생성
     - ext-{플러그인명} 스킬: External 유형 표준(`{DMAP_PLUGIN_DIR}/standards/plugin-standard-skill.md`) 준수하여 생성
     - add-ext-skill 스킬: 외부호출 스킬 추가 유틸리티 (아래 "add-ext-skill 생성 지침" 참조)
     - remove-ext-skill 스킬: 외부호출 스킬 제거 유틸리티 (아래 "remove-ext-skill 생성 지침" 참조)

6. {PLUGIN_DIR}/commands/ 진입점 생성
7. 커스텀 앱/CLI 개발
  - {PLUGIN_DIR}/resources/tools/ 하위에 개발
  - {PLUGIN_DIR}/resources/resource.md에 '로컬 리소스 카탈로그' 에 추가 
8. README.md 작성

> 각 단계의 상세 내용은 `{DMAP_PLUGIN_DIR}/resources/guides/plugin/plugin-dev-guide.md`의 Phase 3 참조.

> **Phase 3 완료**: 개발된 플러그인의 구조와 기능을 사용자에게 보고하고 검증 착수 승인 요청.

---

### Phase 4: CLAUDE.md 생성 

`{PLUGIN_DIR/output/team-plan-{PLUGIN_NAME}.md}` 파일과 을 기반으로 `{PLUGIN_DIR}/CLAUDE.md` 생성

**CLAUDE.md 구조:**

````markdown
# 팀 소개
## 팀명: `기본정보 > {플러그인명}
## 목표
`기본정보 > {목표}`

## 팀 행동원칙
- 'M'사상을 믿고 실천한다. : Value-Oriented, Interactive, Iterative
- 'M'사상 실천을 위한 마인드셋을 가진다
  - Value Oriented: WHY First, Align WHY
  - Interactive: Believe crew, Yes And
  - Iterative: Fast fail, Learn and Pivot

## 멤버
```
{역할}
- 프로파일: {이름}/{별명}/{성별}/{나이}
- 성향: {style 정보}
- 경력: {background 정보}

...반복...
```

## 대화 가이드
- 언어: 특별한 언급이 없는 경우 한국어를 사용
- 호칭: 실명 사용하지 않고 닉네임으로 호칭
- 질문: 프롬프트가 'q:'로 시작하면 질문을 의미함
  - Fact와 Opinion으로 나누어 답변
  - Fact는 출처 링크를 표시

## 최적안 도출
프롬프트가 'o:'로 시작하면 최적안 도출을 의미함
1. 각자의 생각을 얘기함
2. 의견을 종합하여 동일한 건 한 개만 남기고 비슷한 건 합침
3. 최적안 후보 5개를 선정함
4. 각 최적안 후보 5개에 대해 평가함
5. 최적안 1개를 선정함
6. `1)번 ~ 5)번` 과정을 3번 반복함
7. 최종으로 선정된 최적안을 제시함

## Git 연동
- "pull" 명령어 입력 시 Git pull 명령을 수행하고 충돌이 있을 때 최신 파일로 병합 수행  
- "push" 또는 "푸시" 명령어 입력 시 git add, commit, push를 수행 
- Commit Message는 한글로 함

## URL링크 참조
- URL링크는 WebFetch가 아닌 'curl {URL} > .temp/{filename}'명령으로 저장하여 참조함  
- 동일한 파일이 있으면 덮어 씀 

## 마크다운 작성 가이드
- 문서 작성 시 명사체(명사형 종결어미) 사용
  - 예시: "~한다" → "~함", "~이다" → "~임", "~된다" → "~됨"
  - 예시: "지원한다" → "지원", "사용할 수 있다" → "사용 가능"
- 한 줄은 120자 이내로 작성, 긴 문장은 적절히 줄바꿈
- 줄바끔 시 문장 끝에 스페이스 2개 + 줄바꿈
- 빈 줄(`\n\n`) 없이 줄바꿈하는 모든 경우, 줄 끝에 스페이스 2개 필수 (없으면 렌더링 시 한 줄로 합쳐짐)
- 간결하고 객관적인 기술 문서 스타일 유지

## 정직한 보고 규칙
### 핵심 원칙
- **실행하지 않은 것을 완료라고 보고하지 않는다**
- 문서 작성 ≠ 작업 완료. 문서는 실제 결과를 기록하는 것이지, 문서를 쓰면 완료가 되는 것이 아님
- 코드 작성 ≠ 동작 확인. 빌드 통과는 "코드가 컴파일된다"일 뿐, "서비스가 동작한다"가 아님

### 보고 시 체크리스트
1. 이 단계의 "완료 기준"이 무엇인지 먼저 확인
2. 그 기준을 실제로 충족했는지 증거(로그, 응답, 스크린샷) 확인

## Lessons Learned
> skill/agent 실행 중 확인된 시행착오와 교훈을 기록한다.
> 모든 에이전트는 작업 전 이 섹션을 반드시 참고한다.

### 기록 규칙
- 실행 중 시행착오 발생 시 Notepad Working Memory에 즉시 기록한다 (`notepad_write_working` 도구 호출)
  - 형식: `{agent명}: {문제 요약}. {해결 방법}. {관련 파일}`
- 반복 검증된 핵심 교훈만 이 섹션(CLAUDE.md)에 승격한다 (Edit 도구로 추가)
  - 형식: `- [HIGH/MED] {교훈 한 줄} — {출처: agent명/단계명}`
- 최대 20항목 유지, 넘으면 오래된 MED부터 정리
- 기존 항목과 중복되는 내용은 기록하지 않음

### 교훈 목록

## {플러그인명} 플러그인
`@{스킬명}` 입력 시 해당 스킬(`/{플러그인명}:{스킬명}`)을 즉시 실행함.

- `@setup`: 플러그인 초기 설정
- `@help`: 사용 안내
- `@{스킬명}`: {skills/*/SKILL.md frontmatter description 값}
```

````

**스킬 약어 구성 규칙:**
- `skills/*/SKILL.md` frontmatter의 `name`과 `description`을 읽어 구성
- `@{스킬명}` = frontmatter `name` 값
- `{설명}` = frontmatter `description` 값
- setup, help는 항상 첫 두 항목으로 고정, 나머지는 생성된 기능 스킬 순으로 나열
- 외부호출 스킬(ext-*)은 목록에서 제외

**멤버 구성 규칙:**
- `agents/*/agentcard.yaml`에서 `persona.profile`과 `persona.style`, `persona.background`를 읽어 구성
- `{역할}` = `persona.profile.role`
- `{이름}` = `persona.profile.name`
- `{별명}` = `persona.profile.nickname`
- `{성별}` = `persona.profile.gender`
- `{나이}` = `persona.profile.age`
- `{style 정보}` = `persona.style` (첫 줄만 요약)
- `{background 정보}` = `persona.background` (첫 줄만 요약)

## 플러그인 변수 설정 
- CLAUDE_RUNTIME: {CLAUDE_RUNTIME}
- DMAP_PLUGIN_DIR: {DMAP_PLUGIN_DIR}
- PLUGIN_DIR: {PLUGIN_DIR}
- PLUGIN_NAME: {PLUGIN_NAME}
---

### Phase 5: DMAP 플러그인 디렉토리 접근 권한 셋팅 
플러그인 디렉토리에 대한 에이전트의 Read/Write/Edit/Bash 권한을 설정하여 개발 및 검증 과정에서 파일 생성/수정/실행 가능하도록 함.
`~/.claude/settings.json` 파일의 "permissions" 섹션에 아래 권한 추가:  
```
"permissions": {
  "allow": [
    "Read({DMAP_PLUGIN_DIR}/**)",
    "Write({DMAP_PLUGIN_DIR}/**)",
    "Edit({DMAP_PLUGIN_DIR}/**)",
    "Bash(python {DMAP_PLUGIN_DIR}/**)",
    "Bash(python3 {DMAP_PLUGIN_DIR}/**)"
  ],
  "additionalDirectories": [
    "{DMAP_PLUGIN_DIR}"
  ]
}
```
---

### Phase 6: 검증 및 완료

개발된 플러그인이 DMAP 표준을 준수하는지 최종 검증.

**Step 1. 전체 검증**

| 검증 항목 | 확인 내용 |
|----------|----------|
| 필수 파일 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 존재 |
| 필수 파일 구조 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 이 스킬 메인 표준 준수 |
| 에이전트 쌍 | 모든 에이전트에 `AGENT.md` + `agentcard.yaml` 존재 |
| 스킬 구조 | 모든 스킬에 `SKILL.md` 존재, frontmatter 포함 |
| setup 스킬 | setup 스킬 존재 |
| help 스킬 (권장) | help 유틸리티 스킬 존재, 즉시 출력 방식 |
| add-ext-skill 스킬 (선택) | 외부호출 스킬 요청 시 add-ext-skill 유틸리티 스킬 존재 |
| remove-ext-skill 스킬 (선택) | 외부호출 스킬 요청 시 remove-ext-skill 유틸리티 스킬 존재 |
| Gateway | `install.yaml` + `runtime-mapping.yaml` 존재 |
| 슬래시 명령 | `commands/` 진입점 파일 존재 |
| 도구 매핑 | `tools.yaml`의 추상 도구가 `runtime-mapping.yaml`에 매핑 |
| 티어 매핑 | `agentcard.yaml`의 tier가 `runtime-mapping.yaml`에 매핑 |
| 오케스트레이션 구조 | 스킬이 에이전트에 위임하고, 에이전트가 다른 에이전트를 호출하는 구조가 아닌지 확인 |
| README | 필수 섹션(개요, 설치, 업그레이드, 사용법, 요구사항, 라이선스) 포함 |

**Step 2. 사용자에게 개발완료 보고**

최종 산출물 요약 보고:
- 플러그인 디렉토리 구조 (트리)
- 생성된 에이전트/스킬 목록
- 슬래시 명령 목록
- 설치 방법

**Step 3. GitHub 배포 여부 문의**

사용자에게 "개발 완료된 플러그인을 GitHub에 배포할까요?" 문의.
- 동의 시: `CHAIN>>>/dmap:publish` 출력으로 스킬 전환 (플러그인 디렉토리 경로, 플러그인명 전달)
- 거절 시: "나중에 `/dmap:publish`로 언제든 배포할 수 있습니다" 안내

> **Phase 4 완료**: 플러그인 개발 완료. 사용자에게 최종 보고.

[Top](#develop-plugin)

---

## 완료 조건

- 4-Phase 모두 사용자 승인 완료
- 검증 항목 전체 통과
- README.md 필수 섹션 포함

[Top](#develop-plugin)

---

## 취소/재개

- 취소: `/oh-my-claudecode:cancel` 또는 사용자 요청 시 즉시 중단
- 재개: 마지막 완료된 Phase부터 재시작 가능

[Top](#develop-plugin)
