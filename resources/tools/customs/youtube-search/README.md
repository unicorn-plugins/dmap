# YouTube Search CLI

YouTube Data API v3 기반 YouTube 동영상 검색 CLI 도구

## 설치

```bash
cd resources/tools/customs/youtube-search
pip install -r requirements.txt
```

## 설정

`.env` 파일에 YouTube API Key 설정:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

> YouTube Data API v3 키 발급: [Google Cloud Console](https://console.cloud.google.com/) → API 및 서비스 → 사용자 인증 정보

## 명령어

```bash
python youtube_search.py <question> [--max-results N] [--days N]
```

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `question` | 필수 | 검색 키워드 또는 질문 | - |
| `--max-results`, `-n` | 선택 | 반환할 최대 결과 수 | `3` |
| `--days`, `-d` | 선택 | 최근 N일 이내 영상만 검색 | `365` |

## 사용 예시

```bash
# 기본 검색 (최근 1년, 결과 3개)
python youtube_search.py "파이썬 머신러닝"

# 최근 30일 이내, 결과 5개
python youtube_search.py "Claude AI" --max-results 5 --days 30

# 최근 1주일 이내, 결과 10개
python youtube_search.py "LLM 강의" -n 10 -d 7
```

**출력 예시:**

```
[YouTube 검색 결과]

1. 파이썬으로 시작하는 머신러닝 입문
   채널: AI 교육 채널
   게시일: 2025-03-15
   링크: https://www.youtube.com/watch?v=xxxxx

2. 머신러닝 완벽 정리 (파이썬 실습)
   채널: 코딩 마스터
   게시일: 2025-02-20
   링크: https://www.youtube.com/watch?v=yyyyy
```

## 환경 변수

| 변수명 | 필수 | 설명 |
|--------|:----:|------|
| `YOUTUBE_API_KEY` | 필수 | YouTube Data API v3 키 |

## 오류 처리

| 오류 메시지 | 원인 | 해결 |
|------------|------|------|
| `YOUTUBE_API_KEY가 설정되지 않았습니다` | API 키 미설정 | `.env` 파일에 키 추가 |
| `quota exceeded` | API 할당량 초과 | 다음 날 재시도 또는 키 교체 |
| `검색 결과가 없습니다` | 해당 기간 내 결과 없음 | `--days` 값 늘려서 재시도 |
