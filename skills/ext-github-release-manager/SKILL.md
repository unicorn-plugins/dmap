---
name: ext-github-release-manager
description: 외부 플러그인 위임으로 github-release-manager 워크플로우 실행
type: external
user-invocable: true
---

# ext-github-release-manager

[EXT-GITHUB-RELEASE-MANAGER 활성화]

---

## 목표

github-release-manager 플러그인에 위임하여 GitHub Release 문서를 자동 생성·수정·삭제함.
도메인 컨텍스트(Git 태그, 릴리스 이력, 커밋 로그 등)를 수집하고 적절한 실행 경로를 분기하여 외부 스킬에 위임.

[Top](#ext-github-release-manager)

---

## 선행 요구사항

github-release-manager 플러그인이 설치되어 있어야 함.

- 확인: Glob 도구로 `~/.claude/plugins/cache/github-release-manager/**/SKILL.md` 패턴 검색. 결과가 1개 이상이면 설치됨.
- 설치:
  - `claude plugin marketplace add unicorn-plugins/github-release-manager`
  - `claude plugin install github-release-manager@github-release-manager`
- GitHub CLI (gh) 설치 및 인증 완료 필수
- Context7 MCP 서버 설치 (공식 문서 조회용)

[Top](#ext-github-release-manager)

---

## 활성화 조건

사용자가 `/dmap:ext-github-release-manager` 호출 시 또는
"릴리스 생성", "Release 만들어줘", "릴리스 문서", "GitHub Release" 키워드 감지 시.

[Top](#ext-github-release-manager)

---

## 크로스-플러그인 스킬 위임 규칙

> **스킬 목록 결정**: github-release-manager 플러그인 명세서의 "제공 스킬" 섹션 참조.

| 외부 스킬 | FQN | 용도 |
|----------|-----|------|
| recommend-template | `github-release-manager:recommend-template` | 프로젝트 특성 분석 기반 Release 문서 구성 추천 |
| create-release | `github-release-manager:create-release` | 커밋·PR·이슈 분석 후 Release 문서 자동 생성 |
| edit-release | `github-release-manager:edit-release` | 기존 Release 문서 분석 및 수정 |
| delete-release | `github-release-manager:delete-release` | Release 문서 삭제 및 태그 관리 |

[Top](#ext-github-release-manager)

---

## 도메인 컨텍스트 수집

> **수집 대상 결정**: github-release-manager 플러그인 명세서의 "도메인 컨텍스트 수집 가이드" 참조.

| 수집 대상 | 소스 | 용도 | 대응 ARGS 키 |
|----------|------|------|-------------|
| 프로젝트 디렉토리 | 현재 작업 디렉토리 (cwd) | 모든 스킬의 필수 입력 | `project_dir` |
| 기존 릴리스 목록 | `gh release list --limit 10` | 경로 분기 판단 (첫 릴리스 여부, 수정/삭제 대상 선택) | — |
| Git 태그 목록 | `git tag --sort=-v:refname` | 버전 결정, base_ref 추론 | `version`, `base_ref` |
| 최근 커밋 이력 | `git log {last_tag}..HEAD --oneline` | Release 본문 자동 생성 소스 | — |
| 릴리스 구성 파일 | `.github/release.yml` 존재 여부 | Recommend→Create vs Direct Create 경로 분기 | — |
| 패키지 버전 | `package.json`, `pyproject.toml` 등 버전 필드 | 릴리스 버전 자동 추론 | `version` |

[Top](#ext-github-release-manager)

---

## 워크플로우

### Phase 0: 선행 확인 (`ulw` 활용)

github-release-manager 플러그인 설치 여부 확인.

1. 디렉토리 존재 확인: Glob 도구로 `~/.claude/plugins/cache/github-release-manager/**/SKILL.md` 검색
   - 결과 1개 이상 → 설치 확인 완료, Phase 1로 진행
   - 결과 0개 → 사용자에게 설치 안내 후 중단:
     - `claude plugin marketplace add unicorn-plugins/github-release-manager`
     - `claude plugin install github-release-manager@github-release-manager`
2. `gh auth status`로 GitHub CLI 인증 상태 확인
3. 미인증 시 `gh auth login` 안내 후 중단

### Phase 1: 도메인 컨텍스트 수집 (`ulw` 활용)

도메인 컨텍스트 수집 테이블에 따라 병렬로 수집:

1. `project_dir` ← 현재 작업 디렉토리
2. `gh release list --limit 10` ← 기존 릴리스 목록
3. `git tag --sort=-v:refname` ← Git 태그 목록
4. `git log {last_tag}..HEAD --oneline` ← 최근 커밋 이력 (태그가 없으면 전체 이력)
5. `.github/release.yml` 존재 여부 확인
6. `package.json` 또는 `pyproject.toml` 등에서 버전 필드 추출

수집 결과를 사용자에게 요약 제시.

### Phase 2: 경로 분기 결정

수집된 컨텍스트를 기반으로 실행 경로 결정.

> **경로 결정**: github-release-manager 플러그인 명세서의 "경로 분기 판단 기준" 참조.

| 조건 | 경로 | 외부 스킬 |
|------|------|----------|
| 기존 릴리스 0건 또는 `.github/release.yml` 미존재 | Recommend → Create | recommend-template → create-release |
| 기존 릴리스 1건 이상 + `.github/release.yml` 존재 | Direct Create | create-release |
| 사용자가 특정 릴리스 수정 요청 | Direct Edit | edit-release |
| 사용자가 특정 릴리스 삭제 요청 | Direct Delete | delete-release |

경로 분기 결과를 사용자에게 안내하고 확인.

### Phase 3: 외부 스킬 위임

결정된 경로에 따라 외부 스킬에 위임.

**경로 A: Recommend → Create**

**Step 1** → Skill: github-release-manager:recommend-template

- **INTENT**: 프로젝트 분석 후 Release 문서 구성 추천
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}"
  }
- **RETURN**: Release 구성 추천안 (버전 네이밍 규칙, 섹션 구조, 작성 가이드)

**Step 2** → Skill: github-release-manager:create-release

- **INTENT**: 추천 구성 기반 Release 문서 생성
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "version": "{Phase 1에서 추론한 버전 또는 사용자 입력}"
  }
- **RETURN**: Release 문서 생성 완료

**경로 B: Direct Create** → Skill: github-release-manager:create-release

- **INTENT**: Release 문서 직접 생성
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "version": "{Phase 1에서 추론한 버전 또는 사용자 입력}",
    "base_ref": "{Phase 1에서 추론한 이전 태그}"
  }
- **RETURN**: Release 문서 생성 완료

**경로 C: Direct Edit** → Skill: github-release-manager:edit-release

- **INTENT**: 기존 Release 문서 수정
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "version": "{사용자가 지정한 수정 대상 버전}",
    "changes": "{사용자가 요청한 수정 내용}"
  }
- **RETURN**: Release 문서 수정 완료

**경로 D: Direct Delete** → Skill: github-release-manager:delete-release

- **INTENT**: Release 문서 삭제
- **ARGS**: {
    "source_plugin": "dmap",
    "project_dir": "{Phase 1에서 수집한 project_dir}",
    "version": "{사용자가 지정한 삭제 대상 버전}",
    "delete_tag": "{사용자 확인 후 결정}"
  }
- **RETURN**: Release 문서 삭제 완료

### Phase 4: 결과 검증 및 보고 (`ulw` 활용)

외부 스킬 완료 후 산출물 검증:

1. `gh release list --limit 5`로 릴리스 상태 확인
2. 생성/수정/삭제 결과를 사용자에게 요약 보고
3. Release URL 제공 (생성/수정 시)

[Top](#ext-github-release-manager)

---

## 완료 조건

- [ ] 외부 플러그인 설치 확인
- [ ] 도메인 컨텍스트 수집 완료
- [ ] 경로 분기 결정 및 사용자 확인
- [ ] 외부 스킬 위임 및 워크플로우 완료
- [ ] 산출물 존재 확인 (`gh release list`로 검증)

[Top](#ext-github-release-manager)

---

## 검증 프로토콜

산출물 검증 절차:

| 경로 | 검증 방법 | 성공 기준 |
|------|----------|----------|
| Create (A, B) | `gh release view {version}` | Release 문서 존재 + 본문 비어있지 않음 |
| Edit (C) | `gh release view {version}` | 수정 내용 반영 확인 |
| Delete (D) | `gh release list` | 대상 Release 미존재 확인 |

[Top](#ext-github-release-manager)

---

## 상태 정리

완료 시 임시 파일 없음 (상태 파일 미사용).

[Top](#ext-github-release-manager)

---

## 취소

사용자가 "cancelomc" 또는 "stopomc" 요청 시 즉시 중단.

[Top](#ext-github-release-manager)

---

## 재개

마지막 완료된 Phase부터 재시작 가능.

[Top](#ext-github-release-manager)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 외부 플러그인 설치 여부를 Phase 0에서 반드시 확인 |
| 2 | 도메인 컨텍스트 수집을 완료한 후 외부 스킬에 위임 |
| 3 | Skill→Skill 입력 전달 규약을 준수하여 ARGS 전달 |
| 4 | 경로 분기 결정 후 사용자에게 확인 받음 |
| 5 | Delete 경로 시 태그 삭제 여부를 사용자에게 반드시 확인 |

[Top](#ext-github-release-manager)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 외부 플러그인의 내부 워크플로우를 직접 실행하지 않음 (Skill 도구로 위임) |
| 2 | 자체 Agent를 생성하지 않음 (외부 플러그인이 Agent 보유) |
| 3 | 외부 플러그인의 산출물(Release 문서)을 임의로 수정하지 않음 |
| 4 | gh CLI 명령을 직접 실행하여 Release를 생성·수정·삭제하지 않음 (외부 스킬에 위임) |

[Top](#ext-github-release-manager)

---

## 검증 체크리스트

- [ ] 선행 요구사항 섹션에 외부 플러그인 설치 확인 방법이 기술되어 있는가
- [ ] 크로스-플러그인 스킬 위임 규칙에 외부 스킬 FQN이 명시되어 있는가
- [ ] 도메인 컨텍스트 수집 대상이 테이블로 정리되어 있는가
- [ ] 경로 분기 조건이 명확히 정의되어 있는가
- [ ] Skill→Skill 입력 전달 규약이 적용되어 있는가
- [ ] 워크플로우의 모든 직접 수행 단계에 스킬 부스팅이 명시되어 있는가
- [ ] 대상 플러그인 명세서(`.dmap/plugins/github-release-manager.md`)가 존재하는가

[Top](#ext-github-release-manager)
