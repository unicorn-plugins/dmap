---
name: generate-xlsx
description: 입력 데이터를 받아 openpyxl로 .xlsx 파일을 직접 생성하는 빌더 스킬 (1단계)
type: orchestrator
user-invocable: true
---

# Generate XLSX (Builder Skill Template)

> **본 파일은 DMAP 템플릿입니다.** `develop-plugin` 스킬이 새 플러그인을 만들 때
> `skills/{생성스킬명}/SKILL.md`로 복사하여 시작점으로 사용함.
> 플러그인별로 `{플러그인 특화 안내}` 섹션을 보강할 것.

## 목표

입력 데이터(표/리스트/JSON/CSV 등)를 받아, 오케스트레이터(Claude Code)가
직접 openpyxl 빌드 코드를 작성·실행하여 `.xlsx` 파일을 산출함.
**xlsx는 데이터 자체가 곧 명세이므로 별도 spec-writer 에이전트 없음** — 1단계 패턴.

## 활성화 조건

- 슬래시 명령: `/{플러그인명}:{스킬명}`
- 자연어: "엑셀 만들어", "스프레드시트 생성", "xlsx 빌드"

## 의존성 (Gateway `install.yaml` `runtime_dependencies` 등록)

`gateway/install.yaml`의 `runtime_dependencies` 섹션에 다음 항목을 등록.
setup 스킬이 install.yaml을 읽어 자동 설치함 (Gateway 표준 6번 MUST 규칙).

```yaml
runtime_dependencies:
  - name: openpyxl
    description: "XLSX 빌드용 Python 라이브러리"
    runtime: python                         # 사전 요구: python ≥ 3.9
    install: "pip install openpyxl"
    check: "python -c \"import openpyxl\""
    required: true
```

## 워크플로우

### Phase 1. 입력 수집

AskUserQuestion 도구로 다음을 확인:
- 산출물 제목
- 입력 데이터 경로 또는 형식 (마크다운 표 / JSON / CSV / 사용자 직접 입력)
- 시트 분할 기준 (필요 시)
- 출력 디렉토리 (기본: `output/{산출물명}/`)

### Phase 2. 입력 데이터 수집 (Spec 단계 없음)

- 사용자 제공 데이터 또는 선행 에이전트 산출물(`output/{...}/data.json` 등)을 직접 사용
- 별도 spec.md 작성 안 함 — **데이터 구조 자체가 명세**
- 필요 시 데이터를 검증·정규화 (빈 값·타입 불일치 처리)

### Phase 3. XLSX 파일 생성 (Build & Verify — Claude Code 직접 수행)

오케스트레이터가 외부 스킬 위임 없이 직접 수행:

1. **가이드 로드**: `{DMAP_PLUGIN_DIR}/resources/guides/office/xlsx-build-guide.md` 전체 읽기
   (특히 4절 "코드 생성 시 필수 검증 규칙" 9항 모두 준수)
2. **데이터 분석**: Phase 2의 입력 데이터를 시트·헤더·데이터 행으로 분류
3. **빌드 코드 작성**: Write 도구로 `output/{산출물명}/build.py` 생성
   - openpyxl 사용
   - **반드시 본 가이드 4절 전체 규칙 준수**:
     - 셀 주소 일관성 (`ws["A1"]` 또는 `ws.cell(row, col)` 한 가지로)
     - 병합 셀 1회 호출 (좌상단 셀에만 값 할당)
     - 스타일 객체(`Font`, `Fill`, `Alignment`, `Border`) 모듈 상단 1회 정의·재사용
     - 수식은 `=`로 시작, 영문 대문자 셀 참조
     - 인쇄 설정 (`fitToWidth=1`, 인쇄 영역 명시)
     - 한글 폰트(`맑은 고딕`) 명시
     - 열 너비·행 높이 설정
     - `if __name__ == "__main__":` 진입점 + 예외 처리 + `sys.exit()`
4. **빌드 실행**: Bash로 `cd output/{산출물명} && python build.py` 실행
   → `output/{산출물명}/result.xlsx` 생성
5. **검증**:
   - 빌드 종료 코드 0 확인
   - `.xlsx` 파일 존재 및 0바이트 초과 확인
   - 자가 검증 체크리스트 11항 통과
   - 실패 시 에러 분석 → 코드 수정 → 재실행 (최대 3회)
6. **사용자 보고**: 절대 경로, 파일 크기, 시트 수·총 셀 수, 빌드 스크립트 경로

## MUST / MUST NOT

**MUST**
- Phase 순차 수행 및 완료 시마다 사용자 보고
- Phase 3 시작 시 `xlsx-build-guide.md` 전체(특히 4절) 반드시 읽기
- 4절의 모든 검증 규칙 위반 시 빌드 실패로 간주
- 빌드 스크립트(`build.py`)를 산출물로 보존
- 실제 `.xlsx` 파일 생성 및 0바이트 초과 검증
- Excel/LibreOffice에서 열어 시각적 검증 권장 (불가 시 사용자에게 검증 요청)

**MUST NOT**
- `anthropic-skills:xlsx` 등 외부 변환 스킬 호출
- spec-writer 에이전트 별도 생성 (xlsx는 1단계 패턴)
- 가이드를 읽지 않고 빌드 코드 작성
- 검증 없이 "생성 완료" 보고
- 스타일 객체를 셀별로 신규 생성 (메모리·파일 크기 폭증)

## {플러그인 특화 안내}

> 본 섹션은 플러그인별로 보강할 것:
> - 도메인 특화 시트 템플릿 (예: 강의계획서, 월간보고서, KPI대시보드 등)
> - 입력 데이터 정규화 규칙
> - 도메인 색상 팔레트 (가이드 표준에서 일부 변경 필요 시)
