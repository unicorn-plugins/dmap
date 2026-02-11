---
name: ext-abra
description: 외부 플러그인 위임으로 abra 워크플로우 실행
type: external
user-invocable: true
---

# ext-abra

[EXT-ABRA 활성화]

---

## 목표

abra 플러그인에 위임하여 Dify 워크플로우 기반 AI Agent 개발 자동화를 수행함.
도메인 컨텍스트(플러그인 메타데이터, 에이전트 정보, 요구사항 등)를 수집하고 적절한 실행 경로를 분기하여 외부 스킬에 위임.

[Top](#ext-abra)

---

## 선행 요구사항

abra 플러그인이 설치되어 있어야 함.

- 확인: `claude plugin list`
- 설치:
  - `claude plugin marketplace add unicorn-plugins/abra`
  - `claude plugin install abra@abra`
- Dify 프로토타이핑 시 Dify 서버 접근 필요 (Full Path만 해당)

[Top](#ext-abra)

---

## 활성화 조건

사용자가 `/dmap:ext-abra` 호출 시 또는
"AI Agent 개발", "에이전트 만들어줘", "시나리오 생성", "DSL 생성", "프로토타이핑" 키워드 감지 시.

[Top](#ext-abra)

---

## 크로스-플러그인 스킬 위임 규칙

> **스킬 목록 결정**: abra 플러그인 명세서의 "제공 스킬" 섹션 참조.

| 외부 스킬 | FQN | 용도 |
|----------|-----|------|
| scenario | `abra:scenario` | 요구사항 시나리오 생성 및 선택 |
| dsl-generate | `abra:dsl-generate` | Dify DSL 자동생성 |
| prototype | `abra:prototype` | Dify 프로토타이핑 자동화 |
| dev-plan | `abra:dev-plan` | 개발계획서 작성 |
| develop | `abra:develop` | AI Agent 개발 및 배포 |

[Top](#ext-abra)

---

## 도메인 컨텍스트 수집

> **수집 대상 결정**: abra 플러그인 명세서의 "도메인 컨텍스트 수집 가이드" 참조.

| 수집 대상 | 소스 | 용도 | 대응 ARGS 키 |
|----------|------|------|-------------|
| 프로젝트 디렉토리 | 현재 작업 디렉토리 (cwd) | 모든 스킬의 필수 입력 | `project_dir` |
| 플러그인 메타데이터 | `.claude-plugin/plugin.json` | 플러그인명, 설명 | `domain_context` |
| 에이전트 정보 | `agents/*/AGENT.md` | 에이전트 역할 파악 | `domain_context` |
| 요구사항 | `output/requirement-{name}.md` 또는 사용자 입력 | 서비스 요구사항 | `requirement` |
| 참고 자료 | `resources/` 또는 사용자 제공 | 도메인 지식 | `references` |

[Top](#ext-abra)

---

## 워크플로우

### Phase 0: 선행 확인 (`ulw` 활용)

abra 플러그인 설치 여부 확인.

1. `claude plugin list` 출력에서 `abra` 존재 여부 확인
2. 미설치 시 사용자에게 설치 안내 후 중단:
   - `claude plugin marketplace add unicorn-plugins/abra`
   - `claude plugin install abra@abra`

### Phase 1: 도메인 컨텍스트 수집 (`ulw` 활용)

도메인 컨텍스트 수집 테이블에 따라 병렬로 수집:

1. `project_dir` ← 현재 작업 디렉토리
2. `.claude-plugin/plugin.json` ← 플러그인 메타데이터
3. `agents/*/AGENT.md` ← 에이전트 정보 (존재 시)
4. `output/requirement-{name}.md` ← 요구사항 (존재 시)
5. `resources/` ← 참고 자료 (존재 시)

수집 결과를 사용자에게 요약 제시.

### Phase 2: 경로 분기 결정

수집된 컨텍스트를 기반으로 실행 경로 결정.

> **경로 결정**: abra 플러그인 명세서의 "실행 경로" 섹션 참조.

| 조건 | 경로 | 스킬 체인 |
|------|------|----------|
| Dify 워크플로우가 필요한 경우 | Full Path | scenario → dsl-generate → prototype → dev-plan → develop |
| 코드 개발만 필요한 경우 (Dify 워크플로우 불필요) | Short Path | dev-plan → develop |

경로 분기 결과를 사용자에게 안내하고 확인.

### Phase 3: 외부 스킬 위임

결정된 경로에 따라 외부 스킬에 위임.

**경로 A: Full Path (scenario → dsl-generate → prototype → dev-plan → develop)**

**Step 1** → Skill: abra:scenario

- **INTENT**: 요구사항 시나리오 생성
- **ARGS**: {
    "source_plugin": "dmap",
    "service_purpose": "{서비스 목적}",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "domain_context": "{수집된 도메인 컨텍스트}",
    "requirement": "{요구사항}",
    "references": "{참고 자료}"
  }
- **RETURN**: 시나리오 파일 생성 완료

**Step 2** → Skill: abra:dsl-generate

- **INTENT**: Dify DSL 자동생성
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}"
  }
- **RETURN**: DSL 파일 생성 완료

**Step 3** → Skill: abra:prototype

- **INTENT**: Dify 프로토타이핑 자동화
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}"
  }
- **RETURN**: 프로토타이핑 완료

**Step 4** → Skill: abra:dev-plan

- **INTENT**: 개발계획서 작성
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "domain_context": "{수집된 도메인 컨텍스트}"
  }
- **RETURN**: 개발계획서 파일 생성 완료

**Step 5** → Skill: abra:develop

- **INTENT**: AI Agent 개발 및 배포
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}"
  }
- **RETURN**: Agent 개발 및 배포 완료

**경로 B: Short Path (dev-plan → develop)**

**Step 1** → Skill: abra:dev-plan

- **INTENT**: 개발계획서 작성 (코드 기반)
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "domain_context": "{수집된 도메인 컨텍스트}",
    "no_workflow": "true",
    "allowed_options": ["B", "C"]
  }
- **RETURN**: 개발계획서 파일 생성 완료

**Step 2** → Skill: abra:develop

- **INTENT**: AI Agent 개발 및 배포
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}"
  }
- **RETURN**: Agent 개발 및 배포 완료

### Phase 4: 결과 검증 및 보고 (`ulw` 활용)

외부 스킬 완료 후 산출물 검증:

1. 경로에 따른 산출물 존재 확인
2. 생성된 파일 목록을 사용자에게 요약 보고

[Top](#ext-abra)

---

## 완료 조건

- [ ] 외부 플러그인 설치 확인
- [ ] 도메인 컨텍스트 수집 완료
- [ ] 경로 분기 결정 및 사용자 확인
- [ ] 외부 스킬 위임 및 워크플로우 완료
- [ ] 산출물 존재 확인

[Top](#ext-abra)

---

## 검증 프로토콜

산출물 검증 절차:

| 경로 | 검증 방법 | 성공 기준 |
|------|----------|----------|
| Full Path (A) | 시나리오, DSL, 개발계획서, 소스코드 파일 확인 | 모든 단계 산출물 존재 |
| Short Path (B) | 개발계획서, 소스코드 파일 확인 | 개발계획서 + 소스코드 존재 |

[Top](#ext-abra)

---

## 상태 정리

완료 시 임시 파일 없음 (상태 파일 미사용).

[Top](#ext-abra)

---

## 취소

사용자가 "cancelomc" 또는 "stopomc" 요청 시 즉시 중단.

[Top](#ext-abra)

---

## 재개

마지막 완료된 Phase부터 재시작 가능.

[Top](#ext-abra)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 외부 플러그인 설치 여부를 Phase 0에서 반드시 확인 |
| 2 | 도메인 컨텍스트 수집을 완료한 후 외부 스킬에 위임 |
| 3 | Skill→Skill 입력 전달 규약을 준수하여 ARGS 전달 |
| 4 | 경로 분기 결정 후 사용자에게 확인 받음 |

[Top](#ext-abra)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 외부 플러그인의 내부 워크플로우를 직접 실행하지 않음 (Skill 도구로 위임) |
| 2 | 자체 Agent를 생성하지 않음 (외부 플러그인이 Agent 보유) |
| 3 | 외부 플러그인의 산출물을 임의로 수정하지 않음 |

[Top](#ext-abra)

---

## 검증 체크리스트

- [ ] 선행 요구사항 섹션에 외부 플러그인 설치 확인 방법이 기술되어 있는가
- [ ] 크로스-플러그인 스킬 위임 규칙에 외부 스킬 FQN이 명시되어 있는가
- [ ] 도메인 컨텍스트 수집 대상이 테이블로 정리되어 있는가
- [ ] 경로 분기 조건이 명확히 정의되어 있는가
- [ ] Skill→Skill 입력 전달 규약이 적용되어 있는가
- [ ] 워크플로우의 모든 직접 수행 단계에 스킬 부스팅이 명시되어 있는가
- [ ] 대상 플러그인 명세서(`.dmap/plugins/abra.md`)가 존재하는가

[Top](#ext-abra)
