# youtube-search

- [youtube-search](#youtube-search)
  - [기본 정보](#기본-정보)
  - [설치 정보](#설치-정보)
  - [환경 변수](#환경-변수)
  - [명령어](#명령어)
  - [출력 형식](#출력-형식)
  - [사용 예시](#사용-예시)

---

## 기본 정보

| 항목 | 값 |
|------|---|
| 도구명 | youtube-search |
| 카테고리 | 커스텀 앱 |
| 설명 | YouTube Data API v3 기반 동영상 검색 + 자막 추출. 자막 없는 영상을 건너뛰고 자막 있는 영상만 수집. 결과를 JSON으로 반환 |
| 소스 경로 | `resources/tools/customs/youtube-search/youtube_search.py` |
| 의존 라이브러리 | `google-api-python-client`, `youtube-transcript-api>=1.0.0`, `python-dotenv` |

[Top](#youtube-search)

---

## 설치 정보

| 항목 | 값 |
|------|---|
| 설치 방법 | 소스 파일 포함 (의존성 설치 필요) |
| 의존성 설치 | `pip install -r resources/tools/customs/youtube-search/requirements.txt` |
| 검증 명령 | `python resources/tools/customs/youtube-search/youtube_search.py --help` |

[Top](#youtube-search)

---

## 환경 변수

| 변수명 | 필수 | 설명 | 기본값 |
|--------|:----:|------|--------|
| `YOUTUBE_API_KEY` | 필수 | YouTube Data API v3 키 | - |

> 환경 변수 파일 위치: `resources/tools/customs/youtube-search/.env`  
> YouTube Data API v3 키 발급: Google Cloud Console → API 및 서비스 → 사용자 인증 정보

[Top](#youtube-search)

---

## 명령어

```bash
python youtube_search.py <question> [--max-results N] [--days N] [--chunk-seconds N] [--max-fetch N]
```

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `question` | 필수 | 검색 키워드 또는 질문 | - |
| `--max-results`, `-n` | 선택 | 자막 있는 결과 수 | `3` |
| `--days`, `-d` | 선택 | 최근 N일 이내 영상만 검색 | `365` |
| `--chunk-seconds`, `-c` | 선택 | 자막 청크 크기 (초 단위) | `120` |
| `--max-fetch`, `-f` | 선택 | 자막 확보를 위해 API에서 가져올 최대 후보 수 (최대 50) | `20` |

> `--max-results`는 자막이 있는 영상 기준임.  
> 자막 없는 영상은 건너뛰고, `--max-fetch`개 후보 안에서 `--max-results`개를 채울 때까지 순서대로 시도함.

[Top](#youtube-search)

---

## 출력 형식

JSON 형식으로 stdout 출력. 진행 로그는 stderr 출력.

```json
{
  "query": "검색어",
  "params": {
    "max_results": 3,
    "days": 365,
    "chunk_size_seconds": 120,
    "max_fetch": 20
  },
  "results": [
    {
      "rank": 1,
      "title": "영상 제목",
      "channel": "채널명",
      "published": "2025-03-15",
      "video_id": "xxxxx",
      "url": "https://www.youtube.com/watch?v=xxxxx",
      "transcripts": [
        {
          "text": "자막 내용 (120초 단위 청크)",
          "start_seconds": 0,
          "timestamp": "0:00",
          "timestamp_url": "https://www.youtube.com/watch?v=xxxxx&t=0"
        }
      ]
    }
  ],
  "error": null
}
```

| 필드 | 설명 |
|------|------|
| `results[].transcripts` | 자막 청크 목록. 자막 없는 영상은 결과에서 제외됨 |
| `transcripts[].timestamp` | `분:초` 형식 표시 (예: `2:05`) |
| `transcripts[].timestamp_url` | 해당 시점부터 재생되는 YouTube URL |
| `error` | 오류 메시지. 정상 시 `null` |

[Top](#youtube-search)

---

## 사용 예시

```bash
# 기본 검색 (최근 1년, 자막 있는 영상 3개)
python resources/tools/customs/youtube-search/youtube_search.py "파이썬 머신러닝"

# 최근 30일 이내, 자막 있는 영상 5개
python resources/tools/customs/youtube-search/youtube_search.py "Claude AI" --max-results 5 --days 30

# 최근 1주일, 청크 60초, 후보 50개 중 자막 있는 영상 10개
python resources/tools/customs/youtube-search/youtube_search.py "LLM 강의" -n 10 -d 7 -c 60 -f 50

# JSON만 파일로 저장 (stderr 진행 로그 제외)
python resources/tools/customs/youtube-search/youtube_search.py "FinOps" > result.json
```

**테스트 실행:**

```bash
python resources/tools/customs/youtube-search/test_youtube_search.py
```

[Top](#youtube-search)
