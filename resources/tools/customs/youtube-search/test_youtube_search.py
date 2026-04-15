#!/usr/bin/env python3
"""YouTube Search 테스트 - FinOps 관련 최근 1년 영상 3개 검색"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# API 키 설정 (테스트용)
os.environ["YOUTUBE_API_KEY"] = "AIzaSyASGyHQriZXzvfDnYAODoURWNDmKb9Huu8"

from youtube_search import search_youtube

if __name__ == "__main__":
    print("=== FinOps YouTube 검색 테스트 ===\n", file=sys.stderr)

    result = search_youtube(
        question="FinOps",
        max_results=3,
        days=365,
        chunk_size_seconds=120,
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))
