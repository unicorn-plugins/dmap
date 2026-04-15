#!/usr/bin/env python3
"""YouTube Search CLI - YouTube Data API v3 기반 YouTube 검색 + 자막 추출 도구

사용법:
  python youtube_search.py <question> [--max-results N] [--days N] [--chunk-seconds N]

예시:
  python youtube_search.py "파이썬 머신러닝"
  python youtube_search.py "Claude AI" --max-results 5 --days 30
  python youtube_search.py "LLM 강의" -n 10 -d 7 -c 60
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Windows 콘솔 UTF-8 출력 지원
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# .env 로드 (동일 디렉토리 우선, 없으면 상위 탐색)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()
except ImportError:
    pass

try:
    from googleapiclient.discovery import build
except ImportError:
    print("오류: google-api-python-client가 설치되지 않았습니다.", file=sys.stderr)
    print("설치: pip install google-api-python-client", file=sys.stderr)
    sys.exit(1)

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    print("오류: youtube-transcript-api가 설치되지 않았습니다.", file=sys.stderr)
    print("설치: pip install youtube-transcript-api", file=sys.stderr)
    sys.exit(1)

CHUNK_SIZE_SECONDS = 120


def extract_video_id(url: str) -> str | None:
    """
    YouTube URL에서 동영상 ID 추출

    Args:
        url: YouTube URL (다양한 형식 가능)

    Returns:
        동영상 ID (11자리 문자열) 또는 None

    예시:
        "https://www.youtube.com/watch?v=abc123&pp=xxx" → "abc123"
        "https://youtu.be/abc123"                       → "abc123"
        "https://www.youtube.com/embed/abc123"          → "abc123"
    """
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([^&?/]+)',
        r'(?:embed/)([^&?/]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _make_chunk(video_id: str, start_seconds: float, text: str) -> dict:
    """자막 청크 딕셔너리 생성"""
    start = int(start_seconds)
    minutes = start // 60
    seconds = start % 60
    return {
        "text": text,
        "start_seconds": start,
        "timestamp": f"{minutes}:{seconds:02d}",
        "timestamp_url": f"https://www.youtube.com/watch?v={video_id}&t={start}",
    }


def load_transcript(video_id: str, chunk_size_seconds: int = CHUNK_SIZE_SECONDS) -> list[dict]:
    """
    YouTube 영상의 자막을 로드하고 타임스탬프 기반으로 청킹

    Args:
        video_id: YouTube 동영상 ID
        chunk_size_seconds: 청크 크기 (초 단위, 기본값 120초)

    Returns:
        청크 리스트. 각 항목: {text, start_seconds, timestamp, timestamp_url}
    """
    try:
        # v1.x: 인스턴스 기반 fetch (한국어 우선, 없으면 영어 자막)
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id, languages=["ko", "en", "ko-KR", "en-US"])
        segments = list(fetched)
    except Exception:
        return []

    if not segments:
        return []

    # chunk_size_seconds 단위로 청킹
    chunks = []
    current_texts: list[str] = []
    current_start: float = segments[0].start
    current_end: float = current_start + chunk_size_seconds

    for seg in segments:
        seg_start: float = seg.start
        seg_text: str = seg.text.strip()

        if seg_start >= current_end:
            # 현재 청크 저장
            if current_texts:
                chunks.append(_make_chunk(video_id, current_start, " ".join(current_texts)))
            # 새 청크 시작
            current_texts = [seg_text] if seg_text else []
            current_start = seg_start
            current_end = seg_start + chunk_size_seconds
        else:
            if seg_text:
                current_texts.append(seg_text)  # noqa: E501

    # 마지막 청크 저장
    if current_texts:
        chunks.append(_make_chunk(video_id, current_start, " ".join(current_texts)))

    return chunks


def search_youtube(
    question: str,
    max_results: int = 3,
    days: int = 365,
    chunk_size_seconds: int = CHUNK_SIZE_SECONDS,
    max_fetch: int = 20,
) -> dict:
    """
    YouTube 검색 후 자막이 있는 영상만 골라 JSON 형식으로 반환

    자막이 없는 영상은 건너뛰고, max_results개의 자막 있는 영상이 모일 때까지
    최대 max_fetch개의 후보를 순서대로 시도함.

    Args:
        question: 검색 질문
        max_results: 자막 있는 결과 수 (기본값: 3)
        days: 최근 N일 이내 영상만 검색 (기본값: 365)
        chunk_size_seconds: 자막 청크 크기 (초, 기본값: 120)
        max_fetch: API에서 가져올 최대 후보 수 (기본값: 20, 최대: 50)

    Returns:
        {
          "query": str,
          "params": {max_results, days, chunk_size_seconds, max_fetch},
          "results": [
            {
              "rank": int,
              "title": str,
              "channel": str,
              "published": str,       # YYYY-MM-DD
              "video_id": str,
              "url": str,
              "transcripts": [
                {
                  "text": str,
                  "start_seconds": int,
                  "timestamp": str,   # "M:SS"
                  "timestamp_url": str
                }, ...
              ]
            }, ...
          ],
          "error": str | null
        }
    """
    result: dict = {
        "query": question,
        "params": {
            "max_results": max_results,
            "days": days,
            "chunk_size_seconds": chunk_size_seconds,
            "max_fetch": max_fetch,
        },
        "results": [],
        "error": None,
    }

    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        result["error"] = "YOUTUBE_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요."
        return result

    try:
        youtube = build("youtube", "v3", developerKey=api_key)

        # publishedAfter: 최근 N일 이내 영상만 검색 (ISO 8601 형식)
        published_after = (
            datetime.now(timezone.utc) - timedelta(days=days)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        # 자막 있는 영상 max_results개 확보를 위해 max_fetch개 후보를 API에서 수집
        fetch_count = min(max(max_results, max_fetch), 50)  # YouTube API 최대 50개
        request = youtube.search().list(
            q=question,
            part="snippet",
            type="video",
            order="relevance",
            publishedAfter=published_after,
            maxResults=fetch_count,
            relevanceLanguage="ko"
        )
        response = request.execute()

        if not response.get("items"):
            result["error"] = "검색 결과가 없습니다."
            return result

        items = response["items"]
        rank = 0
        for idx, item in enumerate(items, 1):
            # 목표 달성 시 중단
            if len(result["results"]) >= max_results:
                break

            video_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            channel = item["snippet"]["channelTitle"]
            published = item["snippet"]["publishedAt"][:10]
            url = f"https://www.youtube.com/watch?v={video_id}"

            print(
                f"  [{idx}/{len(items)}] 후보 검사 중 (자막 확보: {len(result['results'])}/{max_results})",
                file=sys.stderr
            )
            print(f"    {title}", file=sys.stderr)
            print(f"    자막 로드 중: {url}", file=sys.stderr)

            transcripts = load_transcript(video_id, chunk_size_seconds)

            if not transcripts:
                print(f"    [!] 자막 없음 — 건너뜀", file=sys.stderr)
                continue

            rank += 1
            print(f"    [OK] {len(transcripts)}개 청크 로드 완료", file=sys.stderr)
            result["results"].append({
                "rank": rank,
                "title": title,
                "channel": channel,
                "published": published,
                "video_id": video_id,
                "url": url,
                "transcripts": transcripts,
            })

        if not result["results"]:
            result["error"] = f"자막이 있는 영상을 찾지 못했습니다. (후보 {len(items)}개 시도)"

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser(
        description="YouTube Data API v3 기반 YouTube 검색 + 자막 추출 CLI (JSON 출력)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python youtube_search.py "파이썬 머신러닝"
  python youtube_search.py "Claude AI" --max-results 5 --days 30
  python youtube_search.py "LLM 강의" --max-results 10 --days 7 --chunk-seconds 60
        """
    )
    parser.add_argument("question", help="검색할 키워드 또는 질문")
    parser.add_argument(
        "--max-results", "-n",
        type=int,
        default=3,
        metavar="N",
        help="반환할 최대 결과 수 (기본값: 3)"
    )
    parser.add_argument(
        "--days", "-d",
        type=int,
        default=365,
        metavar="N",
        help="최근 N일 이내 영상만 검색 (기본값: 365)"
    )
    parser.add_argument(
        "--chunk-seconds", "-c",
        type=int,
        default=CHUNK_SIZE_SECONDS,
        metavar="N",
        help=f"자막 청크 크기 (초 단위, 기본값: {CHUNK_SIZE_SECONDS})"
    )
    parser.add_argument(
        "--max-fetch", "-f",
        type=int,
        default=20,
        metavar="N",
        help="자막 확보를 위해 API에서 가져올 최대 후보 수 (기본값: 20, 최대: 50)"
    )

    args = parser.parse_args()

    output = search_youtube(
        question=args.question,
        max_results=args.max_results,
        days=args.days,
        chunk_size_seconds=args.chunk_seconds,
        max_fetch=args.max_fetch,
    )
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
