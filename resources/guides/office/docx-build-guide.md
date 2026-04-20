# DOCX 작성 가이드 (docx-build-guide)

## 0. 패턴 개요 (Builder Skill 단독 — 1단계)

DOCX는 본문 텍스트(마크다운/플레인) 자체가 곧 명세이므로 별도 spec-writer 에이전트를 두지 않음.
**빌더 스킬이 입력 본문을 받아 python-docx 빌드 코드를 직접 작성·실행**함.

```
[입력 본문]                          ← 마크다운(권장: 헤딩/표/이미지가 docx로 1:1 매핑) 또는
   (사용자 제공 또는                   선행 에이전트의 본문 산출물(`output/{...}/report.md` 등)
    선행 에이전트 산출물)
        ↓
[Builder Skill (오케스트레이터)]
  1. 본 가이드 로드
  2. 입력 본문 → python-docx 빌드 코드 작성
  3. python 실행 → .docx 생성
  4. 파일 검증 + 사용자 보고
        ↓
[*.docx 산출물]
```

**원칙**:
- **별도 spec-writer 에이전트 없음** — 입력 본문이 곧 명세
- 오케스트레이터(스킬)가 빌드+실행+검증 (Write + Bash)
- 외부 변환 스킬 의존 금지
- 빌더 스킬은 본 가이드 4절(코드 생성 시 필수 검증 규칙)을 **반드시 준수**

**런타임 요구사항**: `python ≥ 3.9`, `pip install python-docx` (생성 플러그인의 setup 스킬에서 자동 설치)

---

## 1. 입력 형식 규약

빌더 스킬이 받을 입력 본문 형태:

| 입력 유형 | 권장 사용 케이스 | 매핑 규칙 |
|----------|-----------------|----------|
| **마크다운 (권장)** | 모든 보고서·문서 | `#` → Heading 1, `##` → Heading 2, `|...|` → 표, `![](path)` → 이미지 |
| 플레인 텍스트 | 단순 본문 | 빈 줄로 구분된 단락만 처리 |
| 구조화 dict | 프로그램 산출물 | `{"sections": [{"heading": "...", "level": 1, "body": [...]}]}` |

**마크다운 매핑 표준** (빌더는 이 매핑을 강제 적용):

| 마크다운 요소 | python-docx 처리 |
|--------------|-----------------|
| `# 제목` | `add_heading("제목", level=1)` |
| `## 절` / `### 항` | `add_heading(..., level=2/3)` |
| 단락 텍스트 | `add_paragraph(text)` |
| `**굵게**` | `run.bold = True` |
| `*기울임*` | `run.italic = True` |
| `` `코드` `` | `run.font.name = "Consolas"` + 회색 배경 |
| 코드 블록 | `add_paragraph` + 고정폭 폰트 + 보더 |
| `- 항목` | `style="List Bullet"` |
| `1. 항목` | `style="List Number"` |
| `\| 표 \|` | `add_table()` + 셀 채움 |
| `![alt](path)` | `add_picture(path, width=Inches(6))` |
| `---` (수평선) | 페이지 구분 또는 가로선 단락 |

---

## 2. 빌드 환경

### 2-1. 의존성 설치
```bash
pip install python-docx
# (선택) 이미지 처리: pip install pillow
```

### 2-2. 권장 폴더 구조
```
output/{산출물명}/
├── build.py              # 빌더 스킬이 작성하는 빌드 코드
├── input/                # 입력 본문 (옵션)
│   └── content.md
├── images/               # 본문에서 참조하는 이미지
└── result.docx           # 빌드 산출물
```

### 2-3. 실행
```bash
cd output/{산출물명} && python build.py
```

---

## 3. 스타일 규약

### 3-1. 컬러 팔레트 (DMAP 표준)

| 역할 | HEX | 용도 |
|------|-----|------|
| 본문 글자 | `#212121` | 일반 텍스트 |
| 제목 (H1) | `#1F4E79` | 문서 제목 |
| 제목 (H2) | `#2E75B6` | 섹션 제목 |
| 제목 (H3) | `#5B9BD5` | 하위 섹션 |
| 표 헤더 배경 | `#1F4E79` | 표 1행 배경 |
| 표 헤더 글자 | `#FFFFFF` | 표 1행 텍스트 |
| 강조 박스 | `#FFF2CC` | 인용/노트 박스 |
| 코드 배경 | `#F5F5F5` | 코드 블록 배경 |
| 인용 좌측 보더 | `#5B9BD5` | 인용문 강조선 |

### 3-2. 폰트 체계

| 용도 | 폰트 (영문) | 폰트 (한글) | 크기 | 굵기 |
|------|------------|------------|------|------|
| 문서 제목 (H1) | Calibri | 맑은 고딕 | 22pt | Bold |
| 섹션 제목 (H2) | Calibri | 맑은 고딕 | 16pt | Bold |
| 하위 제목 (H3) | Calibri | 맑은 고딕 | 13pt | Bold |
| 본문 | Calibri | 맑은 고딕 | 11pt | Regular |
| 표 헤더 | Calibri | 맑은 고딕 | 10pt | Bold (white) |
| 표 본문 | Calibri | 맑은 고딕 | 10pt | Regular |
| 코드 | Consolas | Consolas | 10pt | Regular |
| 캡션 | Calibri | 맑은 고딕 | 9pt | Italic |

### 3-3. 단락 간격
- 본문: 줄 간격 1.2, 단락 후 6pt
- 헤딩: 단락 전 12pt, 단락 후 6pt
- 코드: 줄 간격 1.0, 단락 후 6pt

---

## 4. 코드 생성 시 필수 검증 규칙

### 4-1. Heading 사용

**MUST**: 본문 제목은 반드시 `add_heading(text, level)` 사용. `add_paragraph` + 굵게 처리 금지
(목차 자동 생성 불가).

```python
# ✅ 권장
doc.add_heading("월간 운영 보고서", level=0)   # 문서 제목
doc.add_heading("1. 개요", level=1)
doc.add_heading("1.1 배경", level=2)

# ❌ 금지
p = doc.add_paragraph()
p.add_run("1. 개요").bold = True   # 목차 추출 불가
```

### 4-2. 표 작성

**MUST**: `add_table(rows, cols)` 사용. 셀별 직접 작성 금지(빈 셀 누락 위험).
헤더 행은 별도 스타일 적용.

```python
# ✅ 권장
data = [
    ["항목", "1Q", "2Q", "3Q"],
    ["매출", "100", "120", "150"],
    ["비용", "60", "70", "80"],
]
table = doc.add_table(rows=len(data), cols=len(data[0]))
table.style = "Light Grid Accent 1"

for r, row_data in enumerate(data):
    for c, val in enumerate(row_data):
        cell = table.cell(r, c)
        cell.text = str(val)
        if r == 0:
            # 헤더 스타일
            for run in cell.paragraphs[0].runs:
                run.bold = True
            apply_cell_shading(cell, "1F4E79")
            apply_cell_font_color(cell, "FFFFFF")
```

### 4-3. 이미지 임베딩

**MUST**: 이미지 경로 존재 검증 후 `add_picture()` 호출. 미존재 시 명확한 에러.

```python
from pathlib import Path
from docx.shared import Inches

def add_image(doc, path_str, width_inches=6.0):
    p = Path(path_str)
    if not p.exists():
        raise FileNotFoundError(f"이미지 누락: {p.absolute()}")
    if p.stat().st_size == 0:
        raise ValueError(f"이미지 0바이트: {p.absolute()}")
    doc.add_picture(str(p), width=Inches(width_inches))
```

### 4-4. 한글 폰트 적용

**MUST**: python-docx 기본 폰트는 한글 미지원. `<w:rFonts w:eastAsia="..."/>` 명시 필수.

```python
from docx.oxml.ns import qn

def set_korean_font(run, font_name="맑은 고딕"):
    run.font.name = "Calibri"   # 영문 폰트
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        from docx.oxml import OxmlElement
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:eastAsia"), font_name)
    rFonts.set(qn("w:ascii"), "Calibri")
    rFonts.set(qn("w:hAnsi"), "Calibri")

# 사용
p = doc.add_paragraph()
run = p.add_run("한글 텍스트")
set_korean_font(run)
```

**스타일 일괄 적용**: 문서 전체 기본 폰트 설정도 가능.
```python
def set_default_korean(doc):
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    rpr = style.element.get_or_add_rPr()
    rFonts = rpr.find(qn("w:rFonts"))
    if rFonts is None:
        from docx.oxml import OxmlElement
        rFonts = OxmlElement("w:rFonts")
        rpr.append(rFonts)
    rFonts.set(qn("w:eastAsia"), "맑은 고딕")
```

### 4-5. 목차(TOC)

**RECOMMEND**: TOC는 필드 코드로 삽입 후 사용자가 Word에서 F9로 갱신.
프로그램 자동 갱신은 Word COM 의존하므로 권장 안 함.

```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def add_toc(doc):
    p = doc.add_paragraph()
    run = p.add_run()
    fldChar1 = OxmlElement("w:fldChar")
    fldChar1.set(qn("w:fldCharType"), "begin")
    instrText = OxmlElement("w:instrText")
    instrText.set(qn("xml:space"), "preserve")
    instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
    fldChar2 = OxmlElement("w:fldChar")
    fldChar2.set(qn("w:fldCharType"), "separate")
    fldChar3 = OxmlElement("w:t")
    fldChar3.text = "목차를 생성하려면 F9를 누르세요."
    fldChar4 = OxmlElement("w:fldChar")
    fldChar4.set(qn("w:fldCharType"), "end")
    run._element.append(fldChar1)
    run._element.append(instrText)
    run._element.append(fldChar2)
    run._element.append(fldChar3)
    run._element.append(fldChar4)
```

### 4-6. 페이지 나눔

**MUST**: 새 장/섹션 시작 시 명시적 페이지 브레이크.

```python
from docx.enum.text import WD_BREAK
p = doc.add_paragraph()
p.add_run().add_break(WD_BREAK.PAGE)
```

### 4-7. 셀 배경색 (Shading)

```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def apply_cell_shading(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)
```

### 4-8. 빌드 스크립트 진입점

**MUST**: `if __name__ == "__main__":` 블록에서 예외 처리 + 종료 코드 명시.

```python
import sys
from pathlib import Path
from docx import Document

def build():
    doc = Document()
    set_default_korean(doc)
    # ... 빌드 로직 ...
    output = Path(__file__).parent / "result.docx"
    doc.save(str(output))
    print(f"[OK] saved: {output} ({output.stat().st_size:,} bytes)")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(build())
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
```

### 4-9. 자가 검증 체크리스트

빌드 코드 작성 후 다음 12항을 모두 확인:

- [ ] 모든 헤딩이 `add_heading(..., level=N)`로 작성됨 (목차 추출 가능)
- [ ] 한글 텍스트에 한글 폰트(맑은 고딕) 명시됨
- [ ] 표는 `add_table()` 사용, 헤더 행 별도 스타일 적용
- [ ] 이미지 경로 존재 검증 후 임베딩
- [ ] 이미지 너비가 본문 영역 초과하지 않음 (≤ 6.5인치 권장)
- [ ] 페이지 나눔이 의도한 위치에 적용됨
- [ ] 본문 단락 간격·줄 간격 일관됨
- [ ] 코드 블록은 고정폭 폰트(Consolas) + 회색 배경
- [ ] 표 셀 배경색이 헤더에 적용됨
- [ ] TOC 삽입 시 사용자에게 F9 갱신 안내 포함
- [ ] 빌드 스크립트 종료 코드 0
- [ ] Word/LibreOffice에서 열어 시각적 검증 통과

---

## 5. 빌더 스킬 호출 흐름 (예제)

```markdown
### Phase X. DOCX 파일 생성 (Build & Verify)

오케스트레이터가 외부 스킬 위임 없이 직접 수행:

1. **가이드 로드**: `{DMAP_PLUGIN_DIR}/resources/guides/office/docx-build-guide.md` 읽기
2. **입력 분석**: 사용자 제공 마크다운 또는 선행 에이전트의 본문 산출물 파싱
   - 마크다운인 경우 본 가이드 1절의 매핑 표 그대로 적용
3. **빌드 코드 작성**: Write 도구로 `output/{산출물명}/build.py` 생성
   - python-docx 사용
   - **반드시 본 가이드 4절 검증 규칙 9항 모두 준수**
   - 한글 폰트 명시, Heading API 사용, 이미지 경로 검증
4. **빌드 실행**: Bash로 `cd output/{산출물명} && python build.py` 실행
   → `output/{산출물명}/result.docx` 생성
5. **검증**:
   - 빌드 종료 코드 0 확인
   - `.docx` 파일 존재 및 0바이트 초과 확인
   - 실패 시 에러 분석 → 코드 수정 → 재실행 (최대 3회)
6. **사용자 보고**: 절대 경로, 파일 크기, 페이지 수(추정), 빌드 스크립트 경로
```

---

## 6. 트러블슈팅

### 6-1. 한글이 영문 폰트로 표시됨
- 원인: `set_korean_font` 누락
- 해결: 모든 Run에 `eastAsia` 속성 명시 또는 Normal 스타일에 일괄 적용

### 6-2. 이미지가 페이지 폭을 넘어감
- 원인: `width` 미지정 시 원본 픽셀 크기로 삽입
- 해결: `width=Inches(6)` 명시 (A4 본문 영역 기준)

### 6-3. 머리글/바닥글
```python
section = doc.sections[0]
header = section.header
header.paragraphs[0].text = "DMAP 보고서"
footer = section.footer
footer.paragraphs[0].text = "Confidential"
```

### 6-4. 페이지 번호
- 자동 페이지 번호는 필드 코드로 삽입
- TOC와 동일한 패턴: `OxmlElement("w:fldChar")` 사용

### 6-5. 표 자동 너비 조정
```python
from docx.shared import Cm
table.autofit = False
table.allow_autofit = False
for col_idx, width_cm in enumerate([3, 2, 2, 2]):
    for cell in table.columns[col_idx].cells:
        cell.width = Cm(width_cm)
```

### 6-6. Windows 경로
- 항상 `pathlib.Path` 또는 forward-slash(`/`) 사용
- 한글 파일명 사용 시 `pathlib.Path` 권장
