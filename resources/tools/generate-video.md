# generate_video


- [generate_video](#generate_video)
  - [기본 정보](#기본-정보)
  - [설치 정보](#설치-정보)
  - [환경 변수](#환경-변수)
  - [명령어](#명령어)
  - [사용 예시](#사용-예시)

---

## 기본 정보

| 항목 | 값 |
|------|---|
| 도구명 | generate_video |
| 카테고리 | 커스텀 앱 |
| 설명 | Veo 3.1 모델 기반 비디오 생성 도구 (음성 포함, Scene Extension 지원) |
| 소스 경로 | `resources/tools/customs/general/generate_video.py` |

[Top](#generate_video)

---

## 설치 정보

| 항목 | 값 |
|------|---|
| 설치 방법 | 소스 파일 포함 (의존성 설치 필요) |
| 의존성 설치 | `pip install python-dotenv google-genai` |
| 검증 명령 | `python tools/general/generate_video.py --help` |
| 필수 여부 | 선택 |

[Top](#generate_video)

---

## 환경 변수

| 변수명 | 필수 | 설명 | 기본값 |
|--------|:----:|------|--------|
| `GEMINI_API_KEY` | 필수 | Google Gemini API Key | - |

> 환경 변수 파일 위치: `tools/.env`
> 또는 `--api-key` 파라미터로 직접 전달 가능.

[Top](#generate_video)

---

## 명령어

### 공통 파라미터

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `--prompt` | 택1 | 비디오 생성 프롬프트 텍스트 | - |
| `--prompt-file` | 택1 | 프롬프트가 담긴 파일 경로 | - |
| `--output-dir` | 선택 | 출력 디렉토리 | `.` (현재 디렉토리) |
| `--output-name` | 선택 | 출력 파일명 (확장자 제외) | `generated_video` |
| `--api-key` | 선택 | Gemini API Key (환경 변수 대체) | - |

> `--prompt`와 `--prompt-file`은 상호 배타적.
> `--extend-prompts` 사용 시 `--prompt` 생략 가능.

### 생성 모드 파라미터

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `--aspect-ratio` | 선택 | 화면 비율 (`16:9`, `9:16`) | `16:9` |
| `--duration` | 선택 | 영상 길이 (`4`, `6`, `8`초) | `8` |
| `--resolution` | 선택 | 해상도 (`720p`, `1080p`) | `720p` |
| `--negative-prompt` | 선택 | 제외할 내용 기술 | - |
| `--no-audio` | 선택 | 음성 생성 비활성화 | false (음성 활성화) |
| `--sample-count` | 선택 | 생성 수 (`1`~`4`) | `1` |

### 확장 모드 파라미터

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `--extend` | 선택 | 확장할 Veo 생성 MP4 파일 경로 | - |
| `--extend-prompts` | 선택 | 라운드별 프롬프트 파일 (줄 단위) | - |
| `--extend-count` | 선택 | `--prompt` 사용 시 확장 횟수 | `1` |

> **확장 규격**: 라운드당 +7초, 최대 20라운드, 최대 총 148초.
> **3가지 모드**:
> - **생성 모드**: `--prompt`만 사용 → 신규 비디오 생성
> - **생성+확장 모드**: `--prompt` + `--extend-prompts` → 생성 후 즉시 확장
> - **파일 확장 모드**: `--extend` + `--prompt` → 기존 Veo 영상 파일 확장

[Top](#generate_video)

---

## 사용 예시

```bash
# 신규 비디오 생성 (8초, 음성 포함)
python tools/general/generate_video.py --prompt "바다 위를 나는 갈매기"

# 해상도/길이 지정
python tools/general/generate_video.py --prompt "A cat playing piano" --duration 8 --resolution 1080p

# 세로 영상, 복수 생성
python tools/general/generate_video.py --prompt "도시의 야경" --aspect-ratio 9:16 --sample-count 2

# 생성 + 즉시 확장 (8초 + 7초 x N라운드)
python tools/general/generate_video.py \
  --prompt "갤러리 입장 장면" \
  --extend-prompts prompts.txt \
  --output-name gallery_extended

# 기존 Veo 영상 확장 (파일에서)
python tools/general/generate_video.py \
  --extend video.mp4 \
  --prompt "Camera moves deeper into the scene" \
  --extend-count 3

# API Key 직접 전달
python tools/general/generate_video.py --prompt "테스트" --api-key YOUR_API_KEY
```

> **모델**: `veo-3.1-fast-generate-preview`
> **음성**: Veo 3.1은 기본적으로 음성(대화, 효과음, 배경음악) 동기 생성.
> 프롬프트에 "Audio:" 섹션으로 원하는 사운드를 명시하면 반영됨.

[Top](#generate_video)
