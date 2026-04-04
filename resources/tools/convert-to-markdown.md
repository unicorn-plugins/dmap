# convert-to-markdown

- [convert-to-markdown](#convert-to-markdown)
  - [기본 정보](#기본-정보)
  - [설치 정보](#설치-정보)
  - [환경 변수](#환경-변수)
  - [명령어](#명령어)
  - [사용 예시](#사용-예시)

---

## 기본 정보

| 항목 | 값 |
|------|---|
| 도구명 | convert-to-markdown |
| 카테고리 | 커스텀 앱 |
| 설명 | Office 문서(pptx, docx, xlsx)를 Markdown으로 변환하는 도구.  이미지를 추출하고 Groq VLM(Llama 4 Scout)으로 이미지 설명을 자동 생성 |
| 소스 경로 | `resources/tools/customs/general/convert-to-markdown.py` |

[Top](#convert-to-markdown)

---

## 설치 정보

| 항목 | 값 |
|------|---|
| 설치 방법 | 소스 파일 포함 (의존성 설치 필요) |
| 의존성 설치 | `pip install python-pptx python-docx openpyxl groq Pillow python-dotenv` |
| 검증 명령 | `python tools/customs/general/convert-to-markdown.py --help` |

[Top](#convert-to-markdown)

---

## 환경 변수

| 변수명 | 필수 | 설명 | 기본값 |
|--------|:----:|------|--------|
| `GROQ_API_KEY` | 선택 | Groq API Key (이미지 설명 생성에 필요). 미설정 시 이미지 설명 생략 | - |

> 환경 변수 파일 위치: `tools/.env`  
> 또는 파라미터로 직접 전달 가능.

[Top](#convert-to-markdown)

---

## 명령어

위치 인자(Positional Arguments)로 동작하며 별도 플래그 없이 순서대로 전달.

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `input_dir` | 선택 | 변환할 Office 문서가 위치한 입력 디렉토리 | `resources/references` |
| `output_dir` | 선택 | 변환된 Markdown 파일을 저장할 출력 디렉토리 | `resources/references/markdown` |

**지원 파일 형식:**

| 확장자 | 형식 | 변환 방식 |
|--------|------|----------|
| `.pptx` | PowerPoint | 슬라이드별 섹션, 텍스트 프레임, 테이블, 이미지 추출 |
| `.docx` | Word | 문단, 인라인 이미지, 테이블 변환 |
| `.xlsx` | Excel | 시트별 섹션, 테이블 데이터, 이미지 추출 |

**이미지 처리 규칙:**

| 조건 | 동작 |
|------|------|
| 5KB 미만 또는 150×150px 미만 | 아이콘/장식으로 간주하여 VLM 분석 생략 |
| 4MB 초과 | VLM 전송 전 자동 리사이즈 (JPEG 변환) |
| Rate limit 발생 | 최대 3회 재시도 (15초 간격으로 대기 시간 증가) |

[Top](#convert-to-markdown)

---

## 사용 예시

```bash
# 기본 사용 (기본 입출력 경로 사용)
python tools/customs/general/convert-to-markdown.py

# 입력 디렉토리 지정
python tools/customs/general/convert-to-markdown.py ./my-docs

# 입력/출력 디렉토리 모두 지정
python tools/customs/general/convert-to-markdown.py ./my-docs ./output/markdown
```

**출력 구조:**

```
{output_dir}/
├── {문서명}.md          # 변환된 Markdown 파일
└── images/
    └── {문서명}/
        ├── slide01_img01.png   # 추출된 이미지 (pptx)
        ├── img_img01.jpg       # 추출된 이미지 (docx)
        └── {시트명}_img01.png  # 추출된 이미지 (xlsx)
```

**실행 결과 예시:**

```
변환 중: 기획서.pptx ...
    [VLM] slide01_img01.png 분석 중... 완료
    [SKIP] slide02_img01.png (아이콘/장식)
-> 기획서.md (이미지 1개)

완료: 1개 문서 변환, 총 이미지 1개 처리, 0개 오류
```

[Top](#convert-to-markdown)
