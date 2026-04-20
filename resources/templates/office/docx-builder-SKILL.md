---
name: generate-docx
description: 입력 본문(마크다운 등)을 받아 python-docx로 .docx 파일을 직접 생성하는 빌더 스킬 (1단계)
type: orchestrator
user-invocable: true
---

# Generate DOCX (Builder Skill Template)

> **본 파일은 DMAP 템플릿입니다.** `develop-plugin` 스킬이 새 플러그인을 만들 때
> `skills/{생성스킬명}/SKILL.md`로 복사하여 시작점으로 사용함.
> 플러그인별로 `{플러그인 특화 안내}` 섹션을 보강할 것.

## 목표

입력 본문(마크다운/플레인 텍스트/구조화 dict)을 받아, 오케스트레이터(Claude Code)가
직접 python-docx 빌드 코드를 작성·실행하여 `.docx` 파일을 산출함.
**docx는 본문이 곧 명세이므로 별도 spec-writer 에이전트 없음** — 1단계 패턴.

## 활성화 조건

- 슬래시 명령: `/{플러그인명}:{스킬명}`
- 자연어: "워드 만들어", "보고서 생성", "docx 빌드"

## 의존성 (Gateway `install.yaml` `runtime_dependencies` 등록)

`gateway/install.yaml`의 `runtime_dependencies` 섹션에 다음 항목을 등록.
setup 스킬이 install.yaml을 읽어 자동 설치함 (Gateway 표준 6번 MUST 규칙).

```yaml
runtime_dependencies:
  - name: python-docx
    description: "DOCX 빌드용 Python 라이브러리"
    runtime: python                         # 사전 요구: python ≥ 3.9
    install: "pip install python-docx"
    check: "python -c \"import docx\""
    required: true
```

## 워크플로우

### Phase 1. 입력 수집

AskUserQuestion 도구로 다음을 확인:
- 산출물 제목
- 입력 본문 경로 또는 형식 (마크다운 권장 / 플레인 텍스트 / dict)
- 이미지 디렉토리 경로 (본문에서 참조하는 경우)
- TOC(목차) 포함 여부
- 출력 디렉토리 (기본: `output/{산출물명}/`)

### Phase 2. 입력 본문 수집 (Spec 단계 없음)

- 사용자 제공 본문 또는 선행 에이전트 산출물(`output/{...}/report.md` 등)을 직접 사용
- 별도 spec.md 작성 안 함 — **본문 자체가 명세**
- 마크다운 입력 시 가이드 1절의 매핑 표(헤딩·표·이미지·리스트)를 그대로 적용
- 이미지 경로 사전 검증 (존재·0바이트 초과)

### Phase 3. DOCX 파일 생성 (Build & Verify — Claude Code 직접 수행)

오케스트레이터가 외부 스킬 위임 없이 직접 수행:

1. **가이드 로드**: `{DMAP_PLUGIN_DIR}/resources/guides/office/docx-build-guide.md` 전체 읽기
   (특히 4절 "코드 생성 시 필수 검증 규칙" 9항 모두 준수)
2. **본문 분석**: Phase 2의 입력 본문을 섹션·헤딩·표·이미지로 분해
3. **빌드 코드 작성**: Write 도구로 `output/{산출물명}/build.py` 생성
   - python-docx 사용
   - **반드시 본 가이드 4절 전체 규칙 준수**:
     - 헤딩은 `add_heading(text, level)` 사용 (목차 추출 가능)
     - 표는 `add_table(rows, cols)` 사용, 헤더 행 별도 스타일
     - 이미지 경로 검증 후 `add_picture(path, width=Inches(6))`
     - 한글 폰트(`set_korean_font` / `<w:rFonts w:eastAsia="맑은 고딕"/>`) 명시
     - 셀 배경색은 `apply_cell_shading()` 헬퍼 사용
     - 페이지 나눔(`WD_BREAK.PAGE`) 명시
     - TOC 삽입 시 사용자에게 F9 갱신 안내 포함
     - `if __name__ == "__main__":` 진입점 + 예외 처리 + `sys.exit()`
4. **빌드 실행**: Bash로 `cd output/{산출물명} && python build.py` 실행
   → `output/{산출물명}/result.docx` 생성
5. **검증**:
   - 빌드 종료 코드 0 확인
   - `.docx` 파일 존재 및 0바이트 초과 확인
   - 자가 검증 체크리스트 12항 통과
   - 실패 시 에러 분석 → 코드 수정 → 재실행 (최대 3회)
6. **사용자 보고**: 절대 경로, 파일 크기, 페이지 수(추정), 빌드 스크립트 경로

## MUST / MUST NOT

**MUST**
- Phase 순차 수행 및 완료 시마다 사용자 보고
- Phase 3 시작 시 `docx-build-guide.md` 전체(특히 4절) 반드시 읽기
- 4절의 모든 검증 규칙 위반 시 빌드 실패로 간주
- 빌드 스크립트(`build.py`)를 산출물로 보존
- 실제 `.docx` 파일 생성 및 0바이트 초과 검증
- Word/LibreOffice에서 열어 시각적 검증 권장 (불가 시 사용자에게 검증 요청)
- 모든 한글 텍스트에 한글 폰트 명시 (가이드 4-4 필수)

**MUST NOT**
- 외부 변환 스킬 호출
- spec-writer 에이전트 별도 생성 (docx는 1단계 패턴)
- 가이드를 읽지 않고 빌드 코드 작성
- 검증 없이 "생성 완료" 보고
- 헤딩을 `add_paragraph` + 굵게로 작성 (목차 추출 불가)
- 이미지 경로 검증 없이 `add_picture()` 호출

## {플러그인 특화 안내}

> 본 섹션은 플러그인별로 보강할 것:
> - 도메인 특화 보고서 템플릿 (예: 월간보고, 제안서, 회의록 등)
> - 머리글/바닥글·로고 삽입 규칙
> - 도메인 색상 팔레트 (가이드 표준에서 일부 변경 필요 시)
