---
name: develop-plugin
description: DMAP 플러그인 개발 (4-Phase 워크플로우)
type: orchestrator
user-invocable: true
---

# Develop Plugin

[DEVELOP-PLUGIN 활성화]

---

## 목표

사용자의 팀 기획서를 기반으로 DMAP 표준에 맞는 플러그인을 자동 생성함.
4-Phase 워크플로우를 순차 수행하며, 각 Phase 완료 시 사용자 승인을 받음.

[Top](#develop-plugin)

---

## 활성화 조건

사용자가 `/dmap:develop-plugin` 호출 시 또는 "플러그인 만들어줘", "DMAP 플러그인 개발" 키워드 감지 시.

[Top](#develop-plugin)

---

## 참조

| 문서 | 경로 | 용도 |
|------|------|------|
| 플러그인 개발 가이드 | `resources/guides/plugin/plugin-dev-guide.md` | 상세 워크플로우 참조 |
| DMAP 빌더 표준 | `standards/plugin-standard.md` | 디렉토리 구조, 배포, 네임스페이스 |
| Agent 표준 | `standards/plugin-standard-agent.md` | 에이전트 패키지 작성 규칙 |
| Skill 표준 | `standards/plugin-standard-skill.md` | 스킬 작성 규칙, 유형별 템플릿 |
| Gateway 표준 | `standards/plugin-standard-gateway.md` | install.yaml, runtime-mapping.yaml 작성 |
| 리소스 마켓플레이스 | `resources/plugin-resources.md` | 공유 자원 카탈로그 |
| README 템플릿 | `resources/templates/plugin/README-plugin-template.md` | README.md 작성 참고 |
| README 예제 | `resources/samples/plugin/README.md` | README.md 작성 예시 |
| Publish 스킬 | `skills/publish/SKILL.md` | GitHub 배포 자동화 |

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

### Phase 1: 요구사항 수집

팀 기획서를 분석하고, 부족한 정보를 사용자에게 문의하여 수집함.

**Step 1. 요구사항 파악**

사용자가 제공한 팀 기획서의 각 항목을 분석함.

1-1. 대상 프로젝트 디렉토리 확인

새 플러그인을 생성할 프로젝트 디렉토리를 AskUserQuestion 도구로 문의함.

| 사용자 응답 | 동작 |
|------------|------|
| 경로 지정 | 해당 경로를 `{대상 프로젝트}`로 설정 |
| "현재 디렉토리" 또는 기본값 선택 | CWD를 `{대상 프로젝트}`로 설정 |
| 지정 경로 미존재 | 디렉토리 생성 여부를 사용자에게 확인 |

이후 Phase 3에서 플러그인 스켈레톤은 `{대상 프로젝트}/.claude-plugin/`에 생성됨.

1-2. 팀 기획서 탐색

팀 기획서 탐색 순서:
1. `{dmap 프로젝트}/output/team-plan-{플러그인명}.md` 파일이 존재하면 자동 로드하여 사용
   (team-planner 스킬로 사전 작성된 기획서)
2. 사용자가 메시지에 기획서 내용을 직접 포함한 경우 해당 내용 사용
3. 위 두 경우에 해당하지 않으면 `resources/guides/plugin/plugin-dev-guide.md`의
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

수집된 정보를 반영하여 완성된 정의서를 `.dmap/{플러그인명}/requirements.md`에 저장함.

> **Phase 1 완료**: 업데이트된 팀 기획서를 사용자에게 보고하고 승인 요청.

### Phase 2: 설계 및 계획

수집된 요구사항을 기반으로 플러그인 구조를 설계하고 개발 계획 수립.

**Step 1. 공유 자원 선택**

`resources/plugin-resources.md`를 참조하여 플러그인에 활용할 공유 자원 선별.

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
| 에이전트 구성 (이름, 티어, 도구) | `standards/plugin-standard-agent.md` |
| 스킬 구성 (목록, 유형) | `standards/plugin-standard-skill.md` |
| Gateway 설정 (티어·도구·액션 매핑) | `standards/plugin-standard-gateway.md` |
| 디렉토리 구조 | `standards/plugin-standard.md` |

**Step 3. 개발 계획 수립 (스킬 부스팅)**

`/oh-my-claudecode:ralplan` 스킬 부스팅 패턴을 적용하여 개발 계획서 작성.

개발 계획서 포함 사항:
- 공유자원 마켓플레이스에서 가져갈 자원 목록
- 개발할 커스텀 앱 또는 커스텀 CLI 파악 및 개발 계획
- 공유자원 외 필요한 외부 자원 파악 및 수집 계획
- DMAP 표준 산출물 목록 및 생성 순서

결과 파일: `.dmap/{플러그인명}/develop-plan.md`

**Step 4. 사용자 검토 및 보완**

사용자에게 개발 계획서 검토 요청.
피드백에 따라 계획서 보완 후 재승인.

> **Phase 2 완료**: 확정된 개발 계획서를 사용자에게 보고하고 개발 착수 승인 요청.

### Phase 3: 플러그인 개발 (스킬 부스팅)

`/oh-my-claudecode:ralph` 스킬 부스팅 패턴을 적용하여 개발 계획서에 따라 플러그인 개발.

개발 순서:
1. 플러그인 스켈레톤 생성 (`{플러그인 디렉토리}/.claude-plugin/`, 디렉토리 구조)
  - `.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json` 작성 (플러그인 메타데이터, 마켓플레이스 정보)
  - `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`은 `standards/plugin-standard.md`의 플러그인 메인 표준을 준수하여 작성
2. `.gitignore` 생성 (`.dmap/secrets/`, `__pycache__/`, `.env` 등 보안·임시 파일 제외. `output/` 디렉토리는 제외하지 않음)
3. Gateway 설정 (`{플러그인 디렉토리}/gateway/install.yaml`, `{플러그인 디렉토리}/gateway/runtime-mapping.yaml`)
4. 공유자원 복사 
  - 리소스 마켓플레이스 → {플러그인 디렉토리}/resources/ 
  - {플러그인 디렉토리}/resources/resource.md에 '로컬 리소스 카탈로그' 작성하여 복사된 자원 목록과 간략 설명 기록
5. {플러그인 디렉토리}/agents/ 하위에 에이전트 개발 (`AGENT.md`, `agentcard.yaml`, `tools.yaml`)
6. {플러그인 디렉토리}/skills/ 하위에 스킬 개발
   - 기본 스킬: `standards/plugin-standard-skill.md`의 각 유형별 표준 및 템플릿을 준수하여 생성
     - setup 스킬 (필수): 플러그인 초기 설정
     - help 스킬 (필수): 사용 안내
     - add-ext-skill 스킬 (필수): 외부호출 스킬 추가 유틸리티 (아래 "add-ext-skill 생성 지침" 참조)
     - remove-ext-skill 스킬 (필수): 외부호출 스킬 제거 유틸리티 (아래 "remove-ext-skill 생성 지침" 참조)
     - 기능 스킬: 요구사항에 따른 Core/Planning/Orchestrator/Utility 스킬
   - 외부 플러그인 연동: 사용자에게 "유용한 외부 플러그인을 탐색할까요?" 확인
     - abra 플러그인(AI Agent 개발 자동화)은 기본 추천, 그 외 탐색된 플러그인이 있으면 함께 추천
     - 사용자가 취소한 경우: "나중에 `/{플러그인명}:add-ext-skill`로 언제든 추가할 수 있습니다" 안내
     - 사용자가 승인한 경우 ext-{플러그인명} 스킬 생성 절차:
       1. `resources/plugin-resources.md`의 "플러그인 목록"에서 요구사항에 적합한 플러그인 선택
       2. 선택한 플러그인과 선택 사유를 사용자에게 보고하고 승인 요청
       3. 선택한 플러그인의 명세서(`resources/plugins/{분류}/{name}.md`) 로드
       4. `standards/plugin-standard-skill.md`의 External 유형 템플릿을 기반으로 스킬 생성
       5. 명세서의 ARGS 스키마, 실행 경로, 제공 스킬 정보를 기반으로 템플릿의 플레이스홀더 채움
       6. 팀 기획서에서 도메인 컨텍스트를 추출하여 ext-{플러그인명} 스킬에 반영

   **add-ext-skill 생성 지침**:

   Utility 유형 표준(`standards/plugin-standard-skill.md`)을 준수하여
   `skills/add-ext-skill/SKILL.md`와 `commands/add-ext-skill.md`를 생성함.
   이 스킬은 사용자가 `/{플러그인명}:add-ext-skill`로 호출하여
   외부호출 스킬(ext-{대상플러그인})을 언제든 추가할 수 있게 함.

   생성할 add-ext-skill SKILL.md의 frontmatter:
   ```yaml
   ---
   name: add-ext-skill
   description: 외부호출 스킬(ext-{대상플러그인}) 추가 유틸리티
   type: utility
   user-invocable: true
   ---
   ```

   생성할 commands/add-ext-skill.md:
   ```yaml
   ---
   description: 외부호출 스킬 추가
   allowed-tools: Read, Write, Edit, Skill
   ---

   ~/.claude/plugins/cache/{marketplace-name}/{plugin-name}/ 하위 최신 버전 디렉토리의 skills/add-ext-skill/SKILL.md 파일을 읽고 실행하세요.
   ```

   add-ext-skill SKILL.md의 워크플로우 골격:

   - Step 1: 대상 플러그인 탐색
     - dmap 리소스 마켓플레이스에서 플러그인 카탈로그를 다운로드:
       `curl https://raw.githubusercontent.com/unicorn-plugins/dmap/refs/heads/main/resources/plugin-resources.md > .dmap/plugin-resources.md`
     - `.dmap/plugin-resources.md`의 플러그인 목록 조회
     - 다운로드 실패 시: `.dmap/plugin-resources.md` 캐시 파일이 있으면 재사용, 없으면 사용자에게 대상 플러그인명을 직접 입력받음
   - Step 2: 대상 플러그인 선택
     - AskUserQuestion으로 추가할 대상 플러그인 선택
     - 이미 ext-{대상플러그인} 스킬이 존재하면 중복 안내 후 중단
   - Step 3: 플러그인 명세서 다운로드
     - 선택한 플러그인의 명세서를 dmap 리소스 마켓플레이스에서 다운로드:
       `curl https://raw.githubusercontent.com/unicorn-plugins/dmap/refs/heads/main/resources/plugins/{분류}/{name}.md > .dmap/plugins/{name}.md`
     - `.dmap/plugins/{name}.md` 로드
     - 다운로드 실패 시: 캐시 파일이 있으면 재사용, 없으면 사용자에게 안내하고 중단
   - Step 4: 도메인 컨텍스트 수집
     - `.dmap/{플러그인명}/requirements.md` (요구사항 정의서)
     - `.claude-plugin/plugin.json` (플러그인 메타데이터)
   - Step 5: ext-{대상플러그인} External 스킬 생성
     - SKILL.md 내에 인라인된 External 유형 표준 골격을 기반으로 생성
     - `skills/ext-{대상플러그인}/SKILL.md` 파일 작성
     - 명세서의 제공 스킬(FQN), ARGS 스키마, 실행 경로, 도메인 컨텍스트 수집 가이드를 반영
     - 요구사항 정의서에서 도메인 컨텍스트를 추출하여 반영
   - Step 6: commands/ 진입점 생성
     - `commands/ext-{대상플러그인}.md` 파일 작성
   - Step 7: help 스킬 업데이트
     - `skills/help/SKILL.md`의 명령 테이블에 `/{플러그인명}:ext-{대상플러그인}` 추가

   add-ext-skill SKILL.md 내에 `## 참고사항` 섹션으로 External 유형 표준 골격을 인라인 포함:
   - frontmatter: `name: ext-{대상플러그인}`, `description`, `user-invocable: true`
   - 필수 섹션: 목표, 선행 요구사항, 활성화 조건, 크로스-플러그인 스킬 위임 규칙,
     도메인 컨텍스트 수집, 경로 분기, 워크플로우(Phase 0~최종), 완료 조건,
     검증 프로토콜, 상태 정리, 취소/재개, 스킬 부스팅, MUST 규칙, MUST NOT 규칙, 검증 체크리스트
   - 이 골격은 `standards/plugin-standard-skill.md`의 External 유형을 참조하되,
     add-ext-skill SKILL.md 내에 인라인하여 자기 완결적으로 동작

   **remove-ext-skill 생성 지침**:

   Utility 유형 표준(`standards/plugin-standard-skill.md`)을 준수하여
   `skills/remove-ext-skill/SKILL.md`와 `commands/remove-ext-skill.md`를 생성함.
   이 스킬은 사용자가 `/{플러그인명}:remove-ext-skill`로 호출하여
   기존 외부호출 스킬(ext-{대상플러그인})을 제거할 수 있게 함.

   생성할 remove-ext-skill SKILL.md의 frontmatter:
   ```yaml
   ---
   name: remove-ext-skill
   description: 외부호출 스킬(ext-{대상플러그인}) 제거 유틸리티
   type: utility
   user-invocable: true
   ---
   ```

   생성할 commands/remove-ext-skill.md:
   ```yaml
   ---
   description: 외부호출 스킬 제거
   allowed-tools: Read, Edit, Bash, Skill
   ---

   ~/.claude/plugins/cache/{marketplace-name}/{plugin-name}/ 하위 최신 버전 디렉토리의 skills/remove-ext-skill/SKILL.md 파일을 읽고 실행하세요.
   ```

   remove-ext-skill SKILL.md의 워크플로우 골격:

   - Step 1: 기존 ext-{} 스킬 목록 조회
     - `skills/` 디렉토리에서 `ext-` 접두사로 시작하는 하위 디렉토리 탐색
     - ext-{} 스킬이 0개이면 "제거할 외부호출 스킬이 없습니다" 안내 후 종료
     - 발견된 ext-{} 스킬 목록을 사용자에게 표시
   - Step 2: 제거할 스킬 선택
     - AskUserQuestion으로 제거할 ext-{대상플러그인} 스킬 선택
     - 선택된 스킬의 SKILL.md를 읽어 스킬 정보(name, description) 표시
     - "정말 제거하시겠습니까?" 최종 확인 (AskUserQuestion: 예/아니오)
     - 사용자가 취소하면 즉시 중단
   - Step 3: ext-{대상플러그인} 스킬 디렉토리 삭제
     - `skills/ext-{대상플러그인}/` 디렉토리 전체 삭제
     - 삭제 성공 여부 확인
   - Step 4: commands/ 진입점 삭제
     - `commands/ext-{대상플러그인}.md` 파일 삭제
     - 파일 미존재 시 무시 (이미 삭제된 상태일 수 있음)
   - Step 5: help 스킬 업데이트
     - `skills/help/SKILL.md`의 명령 테이블에서 `/{플러그인명}:ext-{대상플러그인}` 행 제거
     - 제거 완료 메시지 출력: "ext-{대상플러그인} 외부호출 스킬이 제거되었습니다"

   remove-ext-skill SKILL.md의 MUST 규칙 골격:
   - 삭제 전 반드시 사용자 최종 확인을 받을 것
   - ext-{} 접두사가 아닌 스킬(setup, help, add-ext-skill, remove-ext-skill 등)은 제거 대상에서 제외할 것
   - help 스킬의 명령 테이블에서 해당 행만 정확히 제거할 것 (다른 행 훼손 금지)

   remove-ext-skill SKILL.md의 MUST NOT 규칙 골격:
   - ext-{} 접두사가 아닌 스킬 디렉토리를 삭제하지 않을 것
   - 사용자 확인 없이 삭제를 수행하지 않을 것
   - help 스킬의 명령 테이블 구조(헤더, 구분선)를 훼손하지 않을 것

   remove-ext-skill SKILL.md의 검증 체크리스트 골격:
   - [ ] ext-{} 스킬 0개일 때 조기 종료가 동작하는가
   - [ ] 삭제 전 사용자 최종 확인 단계가 존재하는가
   - [ ] skills/ext-{대상플러그인}/ 디렉토리가 완전히 삭제되었는가
   - [ ] commands/ext-{대상플러그인}.md 파일이 삭제되었는가
   - [ ] help 스킬의 명령 테이블에서 해당 행이 제거되었는가
   - [ ] 다른 스킬/명령에 부수효과가 없는가
7. {플러그인 디렉토리}/commands/ 진입점 생성
8. 커스텀 앱/CLI 개발
  - {플러그인 디렉토리}/resources/tools/ 하위에 개발
  - {플러그인 디렉토리}/resources/resource.md에 '로컬 리소스 카탈로그' 에 추가 
9. README.md 작성

> 각 단계의 상세 내용은 `resources/guides/plugin/plugin-dev-guide.md`의 Phase 3 참조.

> **Phase 3 완료**: 개발된 플러그인의 구조와 기능을 사용자에게 보고하고 검증 착수 승인 요청.

### Phase 4: 검증 및 완료

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
| add-ext-skill 스킬 | add-ext-skill 유틸리티 스킬 존재 |
| remove-ext-skill 스킬 | remove-ext-skill 유틸리티 스킬 존재 |
| Gateway | `install.yaml` + `runtime-mapping.yaml` 존재 |
| 슬래시 명령 | `commands/` 진입점 파일 존재 |
| 도구 매핑 | `tools.yaml`의 추상 도구가 `runtime-mapping.yaml`에 매핑 |
| 티어 매핑 | `agentcard.yaml`의 tier가 `runtime-mapping.yaml`에 매핑 |
| 오케스트레이션 구조 | 스킬이 에이전트에 위임하고, 에이전트가 다른 에이전트를 호출하는 구조가 아닌지 확인 |
| README | 필수 섹션(개요, 설치, 업그레이드, 사용법, 요구사항, 라이선스) 포함 |
| 스킬 공통 섹션 | 모든 SKILL.md에 `## MUST 규칙`, `## MUST NOT 규칙`, `## 검증 체크리스트` 존재 |

**Step 2. 사용자에게 개발완료 보고**

최종 산출물 요약 보고:
- 플러그인 디렉토리 구조 (트리)
- 생성된 에이전트/스킬 목록
- 슬래시 명령 목록
- 설치 방법
- 외부호출 스킬 미포함 시: "외부 플러그인 연동이 필요하면 `/{플러그인명}:add-ext-skill`로 추가 가능" 안내

**Step 3. 공유자원 등록 (선택)**

플러그인 개발 과정에서 새로 만든 커스텀 앱/CLI가 범용적이면
`resources/` 마켓플레이스에 등록하여 다른 플러그인에서도 재사용 가능하게 함.

**Step 4. GitHub 배포 여부 문의**

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

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 4-Phase를 순차 수행하며 각 Phase 완료 시 사용자 승인 획득 |
| 2 | 팀 기획서가 없으면 사용자에게 핵심 항목을 문의하여 수집 |
| 3 | 플러그인 구조 설계 시 4개 표준 문서(main, agent, skill, gateway)를 모두 참조 |
| 4 | Phase 3은 `/oh-my-claudecode:ralph` 스킬 부스팅 필수 사용 |
| 5 | Phase 2 Step 3은 `/oh-my-claudecode:ralplan` 스킬 부스팅 필수 사용 |
| 6 | 생성된 SKILL.md에 공통 섹션(MUST 규칙, MUST NOT 규칙, 검증 체크리스트) 포함 보장 |
| 7 | Phase 3 Step 6에서 ext-{플러그인명} 스킬을 External 유형 표준(`standards/plugin-standard-skill.md`)에 맞게 생성 |
| 8 | Phase 3 Step 6에서 add-ext-skill 유틸리티 스킬을 필수 생성 (setup, help와 동일 레벨) |
| 9 | Phase 3 Step 6에서 remove-ext-skill 유틸리티 스킬을 필수 생성 (setup, help, add-ext-skill과 동일 레벨) |

[Top](#develop-plugin)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | Phase 순서를 건너뛰거나 역순 수행 금지 |
| 2 | 사용자 승인 없이 다음 Phase로 진행 금지 |
| 3 | 요구사항을 임의로 변형하지 않음 — 변형 필요 시 사용자 확인 |
| 4 | 표준 문서에 정의되지 않은 파일 구조를 생성하지 않음 |

[Top](#develop-plugin)

---

## 검증 체크리스트

- [ ] 4-Phase 워크플로우가 순차적으로 기술되어 있는가
- [ ] 각 Phase에 사용자 승인 단계가 포함되어 있는가
- [ ] Phase 1 Step 1에서 대상 프로젝트 디렉토리를 사용자에게 확인하는가
- [ ] 팀 기획서 탐색 순서(output/ → 메시지 → 문의)가 명확한가
- [ ] Phase 2 Step 3에 ralplan 스킬 부스팅이 명시되어 있는가
- [ ] Phase 3에 ralph 스킬 부스팅이 명시되어 있는가
- [ ] Phase 4 검증 항목에 표준 준수 확인이 포함되어 있는가
- [ ] 취소/재개 섹션이 존재하는가
- [ ] 참조 테이블의 문서 경로가 모두 정확한가
- [ ] Phase 3 Step 6에서 ext-{플러그인명} 스킬이 External 유형 표준을 준수하여 생성되는가
- [ ] Phase 3 Step 6에서 add-ext-skill이 필수 스킬로 나열되어 있는가
- [ ] add-ext-skill 생성 지침(워크플로우 골격, External 표준 인라인)이 명시되어 있는가
- [ ] Phase 3 Step 6에서 remove-ext-skill이 필수 스킬로 나열되어 있는가
- [ ] remove-ext-skill 생성 지침(5-Step 워크플로우, MUST/MUST NOT/검증 골격)이 명시되어 있는가

[Top](#develop-plugin)
