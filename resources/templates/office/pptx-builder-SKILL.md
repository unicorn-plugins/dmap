---
name: generate-pptx
description: pptx-spec-writer 에이전트의 명세를 받아 pptxgenjs로 .pptx 파일을 직접 생성하는 빌더 스킬
type: orchestrator
user-invocable: true
---

# Generate PPTX (Builder Skill Template)

> **본 파일은 DMAP 템플릿입니다.** `develop-plugin` 스킬이 새 플러그인을 만들 때
> `skills/{생성스킬명}/SKILL.md`로 복사하여 시작점으로 사용함.
> 플러그인별로 `{플러그인 특화 안내}` 섹션을 보강할 것.

## 목표

`pptx-spec-writer` 에이전트가 작성한 시각 명세(`spec.md`)를 받아,
오케스트레이터(Claude Code)가 직접 pptxgenjs 빌드 코드를 작성·실행하여
`.pptx` 파일을 산출함. 외부 변환 스킬에 의존하지 않으므로 Cursor·Cowork 등
다른 런타임에서도 동일하게 동작함.

## 활성화 조건

- 슬래시 명령: `/{플러그인명}:{스킬명}`
- 자연어: "PPT 만들어", "프리젠테이션 생성", "pptx 빌드"

## 의존성 (Gateway `install.yaml` `runtime_dependencies` 등록)

`gateway/install.yaml`의 `runtime_dependencies` 섹션에 다음 항목을 등록.
setup 스킬이 install.yaml을 읽어 자동 설치함 (Gateway 표준 6번 MUST 규칙).

```yaml
runtime_dependencies:
  - name: pptxgenjs
    description: "PPT 빌드용 Node.js 라이브러리"
    runtime: node                           # 사전 요구: node ≥ 18
    install: "npm install pptxgenjs"
    check: "node -e \"require('pptxgenjs')\""
    required: true
```

## 워크플로우

### Phase 1. 입력 수집

AskUserQuestion 도구로 다음을 확인 (생략 가능 항목은 기본값 사용):
- 산출물 제목·부제
- 입력 콘텐츠 경로 (또는 사용자 요구사항 텍스트)
- 대상 청중
- 슬라이드 수 (예: 12장)
- 출력 디렉토리 (기본: `output/{산출물명}/`)

### Phase 2. Spec 작성 → Agent: pptx-spec-writer

에이전트 패키지 로드:
1. `agents/pptx-spec-writer/AGENT.md` 읽기
2. `agents/pptx-spec-writer/agentcard.yaml` 읽기
3. `agents/pptx-spec-writer/tools.yaml` 읽기

Task 도구로 위임 (5항목 프롬프트):
- **TASK**: 입력 콘텐츠를 분석하여 PPT 시각 명세(.md) 작성
- **EXPECTED OUTCOME**: 패턴 A~F가 매핑된 슬라이드별 명세 마크다운 (`output/{산출물명}/spec.md`)
- **MUST DO**: `pptx-build-guide.md` 1~5절 스타일 준수, 슬라이드별 패턴 코드 명시,
  슬라이드당 본문 ≤7줄, 이미지 참조는 `![설명](images/파일명.png)` 형식
- **MUST NOT DO**: 실제 PPT 파일 생성 금지, 컬러·폰트 직접 지정 금지(가이드 표준 사용)
- **CONTEXT**: 입력 콘텐츠 경로, 가이드 경로(`{DMAP_PLUGIN_DIR}/resources/guides/office/pptx-build-guide.md`),
  대상 청중, 분량, 출력 경로

### Phase 3. (선택) Spec 리뷰 → Agent: courseware-reviewer 또는 plugin-specific-reviewer

품질 보증이 필요한 경우 별도 리뷰 에이전트 위임 후 `[MUST]` 항목 반영.
단순 산출물은 생략 가능.

### Phase 4. PPT 파일 생성 (Build & Verify — Claude Code 직접 수행)

오케스트레이터가 외부 스킬 위임 없이 직접 수행:

1. **가이드 로드**: `{DMAP_PLUGIN_DIR}/resources/guides/office/pptx-build-guide.md` 전체 읽기
   (특히 6절 "코드 생성 시 필수 검증 규칙" 11항 모두 준수)
2. **Spec 분석**: Phase 2의 `spec.md` 읽고 슬라이드별 패턴(A~F) 매핑
3. **빌드 코드 작성**: Write 도구로 `output/{산출물명}/build.js` 생성
   - pptxgenjs 사용
   - **반드시 본 가이드 6절 전체 규칙 준수**:
     - `pptx.shapes.RECTANGLE`/`ROUNDED_RECTANGLE` 사용 (`ShapeType` 금지)
     - `defineLayout({name:"CUSTOM", width:16, height:9})`
     - `async function createSlideXX(pptx)` 패턴
     - `slide.addTable()` 사용 (수동 셀 그리기 금지)
     - `fs12()` 헬퍼로 12pt 미만 폰트 차단
     - 이미지 임베딩 전 경로·크기 검증
     - Pretendard 폰트 통일
     - `main().catch(e => { console.error(...); process.exit(1); })` 진입점
4. **빌드 실행**: Bash로 `cd output/{산출물명} && node build.js` 실행
   → `output/{산출물명}/result.pptx` 생성
5. **검증**:
   - 빌드 종료 코드 0 확인
   - `.pptx` 파일 존재 및 0바이트 초과 확인
   - 자가 검증 체크리스트 11항 통과
   - 실패 시 에러 분석 → 코드 수정 → 재실행 (최대 3회)
6. **사용자 보고**: 절대 경로, 파일 크기, 슬라이드 수, 빌드 스크립트 경로

## MUST / MUST NOT

**MUST**
- Phase 순차 수행 및 완료 시마다 사용자 보고
- Phase 2는 반드시 에이전트 위임 (5항목 프롬프트 포함)
- Phase 4 시작 시 `pptx-build-guide.md` 전체(특히 6절) 반드시 읽기
- 6절의 모든 검증 규칙 위반 시 빌드 실패로 간주
- 빌드 스크립트(`build.js`)를 산출물로 보존
- 실제 `.pptx` 파일 생성 및 0바이트 초과 검증

**MUST NOT**
- `anthropic-skills:pptx` 등 외부 변환 스킬 호출
- Phase 순서 건너뛰기
- 검증 없이 "생성 완료" 보고
- 가이드를 읽지 않고 빌드 코드 작성
- spec-writer 에이전트 우회 (오케스트레이터가 명세 직접 작성 금지)

## {플러그인 특화 안내}

> 본 섹션은 플러그인별로 보강할 것:
> - 도메인 특화 슬라이드 패턴 추가 (있는 경우)
> - 플러그인이 사용할 추가 에이전트(예: 도메인 리뷰어) 위임 흐름
> - 출력물 명명 규칙
