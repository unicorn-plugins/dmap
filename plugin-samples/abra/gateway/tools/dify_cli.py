#!/usr/bin/env python3
"""Dify CLI - Fast DSL export/import & workflow execution tool

사용법:
  python dify_cli.py list [--mode MODE]
  python dify_cli.py export <app_id> [-o FILE]
  python dify_cli.py import <file> [--name NAME]
  python dify_cli.py update <app_id> <file>
  python dify_cli.py publish <app_id> [--name NAME] [--comment COMMENT]
  python dify_cli.py run [--inputs JSON] [--mode blocking|streaming] [--user USER]
  python dify_cli.py validate [file]
"""
import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

# 동일 디렉토리의 모듈 import를 위한 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from config import DifyConfig
from dify_client import DifyClient, DifyClientError

# Windows 콘솔 UTF-8 출력 지원
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from validate_dsl import validate_dsl, print_result as print_validation_result

# .env 기본값 (~, $USERPROFILE 등 환경변수 확장 지원)
DEFAULT_APP_ID = os.getenv("DIFY_DEFAULT_APP_ID", "")
_raw_dsl_path = os.getenv("DIFY_DEFAULT_DSL_PATH", "")
DEFAULT_DSL_PATH = str(Path(os.path.expandvars(_raw_dsl_path)).expanduser()) if _raw_dsl_path else ""
APP_API_KEY = os.getenv("DIFY_APP_API_KEY", "")
BASE_URL = os.getenv("DIFY_BASE_URL", "http://localhost")


def format_table(rows: list[tuple], headers: tuple) -> str:
    """간단한 테이블 포맷팅"""
    if not rows:
        return "결과 없음"

    # 각 컬럼의 최대 너비 계산
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))

    # 헤더 출력
    header_line = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    separator = "-+-".join("-" * w for w in col_widths)

    # 데이터 행 출력
    data_lines = []
    for row in rows:
        data_lines.append(" | ".join(str(cell).ljust(col_widths[i]) for i, cell in enumerate(row)))

    return "\n".join([header_line, separator] + data_lines)


async def cmd_list(args):
    """앱 목록 조회"""
    config = DifyConfig()
    client = DifyClient(config)

    try:
        result = await client.list_apps(mode=args.mode, page=1, limit=100)
        apps = result.get("data", [])

        if not apps:
            print("앱이 없습니다.")
            return

        rows = [(app["id"], app["name"], app["mode"]) for app in apps]
        table = format_table(rows, ("ID", "Name", "Mode"))
        print(table)
        print(f"\n총 {len(apps)}개")

    finally:
        await client.close()


async def cmd_export(args):
    """DSL 내보내기"""
    if not args.app_id:
        print("오류: app_id가 필요합니다. (.env의 DIFY_DEFAULT_APP_ID 또는 인자로 지정)", file=sys.stderr)
        sys.exit(1)
    config = DifyConfig()
    client = DifyClient(config)
    start_time = time.time()

    try:
        yaml_content = await client.export_dsl(args.app_id, include_secret=False)

        if args.output:
            output_path = Path(args.output)
            output_path.write_text(yaml_content, encoding="utf-8")
            elapsed = time.time() - start_time
            print(f"내보내기 완료: {output_path} ({elapsed:.1f}초)")
        else:
            print(yaml_content, end="")

    finally:
        await client.close()


async def cmd_import(args):
    """DSL 가져오기 (신규 앱 생성)"""
    if not args.file:
        print("오류: YAML 파일 경로가 필요합니다. (.env의 DIFY_DEFAULT_DSL_PATH 또는 인자로 지정)", file=sys.stderr)
        sys.exit(1)
    config = DifyConfig()
    client = DifyClient(config)
    start_time = time.time()

    try:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"오류: 파일을 찾을 수 없습니다 - {file_path}", file=sys.stderr)
            sys.exit(1)

        yaml_content = file_path.read_text(encoding="utf-8")

        result = await client.import_dsl(
            yaml_content=yaml_content,
            name=args.name if args.name else None
        )

        status = result.get("status")
        app_id = result.get("app_id")
        import_id = result.get("id")

        if status == "pending":
            print(f"버전 충돌 감지, 자동 확인 중...")
            confirm_result = await client.confirm_import(import_id)
            app_id = confirm_result.get("app_id")
            print(f"앱 생성 완료: {app_id}")
        elif status == "completed":
            print(f"앱 생성 완료: {app_id}")
        else:
            print(f"예상치 못한 상태: {status}")
            print(result)

        elapsed = time.time() - start_time
        print(f"완료 ({elapsed:.1f}초)")

    finally:
        await client.close()


async def cmd_update(args):
    """기존 앱을 DSL로 덮어쓰기"""
    if not args.app_id:
        print("오류: app_id가 필요합니다. (.env의 DIFY_DEFAULT_APP_ID 또는 인자로 지정)", file=sys.stderr)
        sys.exit(1)
    if not args.file:
        print("오류: YAML 파일 경로가 필요합니다. (.env의 DIFY_DEFAULT_DSL_PATH 또는 인자로 지정)", file=sys.stderr)
        sys.exit(1)
    config = DifyConfig()
    client = DifyClient(config)
    start_time = time.time()

    try:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"오류: 파일을 찾을 수 없습니다 - {file_path}", file=sys.stderr)
            sys.exit(1)

        yaml_content = file_path.read_text(encoding="utf-8")

        result = await client.import_dsl(
            yaml_content=yaml_content,
            app_id=args.app_id
        )

        status = result.get("status")
        import_id = result.get("id")

        if status == "pending":
            print(f"버전 충돌 감지, 자동 확인 중...")
            await client.confirm_import(import_id)
            print(f"앱 업데이트 완료: {args.app_id}")
        elif status == "completed":
            print(f"앱 업데이트 완료: {args.app_id}")
        else:
            print(f"예상치 못한 상태: {status}")
            print(result)

        elapsed = time.time() - start_time
        print(f"완료 ({elapsed:.1f}초)")

    finally:
        await client.close()


async def cmd_publish(args):
    """워크플로우 배포"""
    if not args.app_id:
        print("오류: app_id가 필요합니다. (.env의 DIFY_DEFAULT_APP_ID 또는 인자로 지정)", file=sys.stderr)
        sys.exit(1)
    config = DifyConfig()
    client = DifyClient(config)
    start_time = time.time()

    try:
        result = await client.publish_workflow(
            app_id=args.app_id,
            marked_name=args.name if args.name else None,
            marked_comment=args.comment if args.comment else None
        )

        version = result.get("version")
        print(f"배포 완료: 버전 {version}")

        elapsed = time.time() - start_time
        print(f"완료 ({elapsed:.1f}초)")

    finally:
        await client.close()


async def cmd_run(args):
    """워크플로우 실행 (Service API)"""
    api_key = args.key
    if not api_key or api_key.startswith("app-여기"):
        print("오류: API Key가 필요합니다. (.env의 DIFY_APP_API_KEY 또는 --key 인자로 지정)", file=sys.stderr)
        print("  Dify 웹 UI → 앱 설정 → API 접근에서 API 키를 발급받으세요.", file=sys.stderr)
        sys.exit(1)

    # inputs 파싱
    inputs = {}
    if args.inputs:
        try:
            inputs = json.loads(args.inputs)
        except json.JSONDecodeError as e:
            print(f"오류: inputs JSON 파싱 실패 - {e}", file=sys.stderr)
            sys.exit(1)
    elif args.file:
        file_path = Path(os.path.expandvars(args.file)).expanduser()
        if not file_path.exists():
            print(f"오류: 파일을 찾을 수 없습니다 - {file_path}", file=sys.stderr)
            sys.exit(1)
        inputs = json.loads(file_path.read_text(encoding="utf-8"))

    import httpx
    url = f"{BASE_URL.rstrip('/')}/v1/workflows/run"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "inputs": inputs,
        "response_mode": args.response_mode,
        "user": args.user,
    }

    start_time = time.time()

    if args.response_mode == "streaming":
        # SSE 스트리밍 수신
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                if resp.status_code >= 400:
                    error_body = await resp.aread()
                    print(f"API 오류 [{resp.status_code}]: {error_body.decode()}", file=sys.stderr)
                    sys.exit(1)

                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        try:
                            event = json.loads(data)
                            event_type = event.get("event", "")
                            if event_type == "workflow_started":
                                print(f"[시작] workflow_run_id: {event.get('workflow_run_id')}")
                            elif event_type == "node_started":
                                node = event.get("data", {})
                                print(f"  [노드 시작] {node.get('title', '')} ({node.get('node_type', '')})")
                            elif event_type == "node_finished":
                                node = event.get("data", {})
                                status = node.get("status", "")
                                elapsed = node.get("elapsed_time", 0)
                                print(f"  [노드 완료] {node.get('title', '')} - {status} ({elapsed:.1f}초)")
                            elif event_type == "text_chunk":
                                text = event.get("data", {}).get("text", "")
                                sys.stdout.write(text)
                                sys.stdout.flush()
                            elif event_type == "workflow_finished":
                                wf = event.get("data", {})
                                print(f"\n[완료] 상태: {wf.get('status')}")
                                outputs = wf.get("outputs")
                                if outputs:
                                    print(json.dumps(outputs, ensure_ascii=False, indent=2))
                                elapsed_total = time.time() - start_time
                                tokens = wf.get("total_tokens", 0)
                                print(f"소요: {elapsed_total:.1f}초, 토큰: {tokens}")
                            elif event_type == "error":
                                print(f"\n[오류] {event.get('message', '')}", file=sys.stderr)
                        except json.JSONDecodeError:
                            pass
    else:
        # 블로킹 실행
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code >= 400:
                print(f"API 오류 [{resp.status_code}]: {resp.text}", file=sys.stderr)
                sys.exit(1)

            result = resp.json()
            data = result.get("data", {})
            elapsed = time.time() - start_time

            print(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_validate(args):
    """DSL 파일 사전 검증"""
    if not args.file:
        print("오류: YAML 파일 경로가 필요합니다. (.env의 DIFY_DEFAULT_DSL_PATH 또는 인자로 지정)", file=sys.stderr)
        sys.exit(1)

    file_path = Path(args.file)
    if not file_path.exists():
        print(f"오류: 파일을 찾을 수 없습니다 - {file_path}", file=sys.stderr)
        sys.exit(1)

    result = validate_dsl(str(file_path))
    print_validation_result(result, str(file_path))
    if not result.is_valid:
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Dify CLI - DSL management & workflow execution tool",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", help="명령어")

    # list 명령어
    parser_list = subparsers.add_parser("list", help="앱 목록 조회")
    parser_list.add_argument(
        "--mode",
        default="all",
        choices=["all", "workflow", "advanced-chat", "chat", "agent-chat", "completion"],
        help="앱 유형 필터 (기본값: all)"
    )

    # export 명령어
    parser_export = subparsers.add_parser("export", help="DSL 내보내기")
    parser_export.add_argument("app_id", nargs="?", default=DEFAULT_APP_ID, help=f"앱 ID (기본값: {DEFAULT_APP_ID[:12]}...)" if DEFAULT_APP_ID else "앱 ID")
    parser_export.add_argument("-o", "--output", default=DEFAULT_DSL_PATH or None, help=f"출력 파일 경로 (기본값: {Path(DEFAULT_DSL_PATH).name})" if DEFAULT_DSL_PATH else "출력 파일 경로 (기본값: stdout)")

    # import 명령어
    parser_import = subparsers.add_parser("import", help="DSL 가져오기 (신규 앱 생성)")
    parser_import.add_argument("file", nargs="?", default=DEFAULT_DSL_PATH or None, help=f"YAML 파일 경로 (기본값: {Path(DEFAULT_DSL_PATH).name})" if DEFAULT_DSL_PATH else "YAML 파일 경로")
    parser_import.add_argument("--name", help="앱 이름 (DSL 내 이름 덮어쓰기)")

    # update 명령어
    parser_update = subparsers.add_parser("update", help="기존 앱을 DSL로 덮어쓰기")
    parser_update.add_argument("app_id", nargs="?", default=DEFAULT_APP_ID, help=f"앱 ID (기본값: {DEFAULT_APP_ID[:12]}...)" if DEFAULT_APP_ID else "앱 ID")
    parser_update.add_argument("file", nargs="?", default=DEFAULT_DSL_PATH or None, help=f"YAML 파일 경로 (기본값: {Path(DEFAULT_DSL_PATH).name})" if DEFAULT_DSL_PATH else "YAML 파일 경로")

    # publish 명령어
    parser_publish = subparsers.add_parser("publish", help="워크플로우 배포")
    parser_publish.add_argument("app_id", nargs="?", default=DEFAULT_APP_ID, help=f"앱 ID (기본값: {DEFAULT_APP_ID[:12]}...)" if DEFAULT_APP_ID else "앱 ID")
    parser_publish.add_argument("--name", help="버전 이름")
    parser_publish.add_argument("--comment", help="버전 코멘트")

    # validate 명령어
    parser_validate = subparsers.add_parser("validate", help="DSL 파일 사전 검증")
    parser_validate.add_argument("file", nargs="?", default=DEFAULT_DSL_PATH or None, help=f"YAML 파일 경로 (기본값: {Path(DEFAULT_DSL_PATH).name})" if DEFAULT_DSL_PATH else "YAML 파일 경로")

    # run 명령어
    parser_run = subparsers.add_parser("run", help="워크플로우 실행 (Service API)")
    parser_run.add_argument("--inputs", "-i", help='입력 JSON (예: \'{"query": "테스트"}\')')
    parser_run.add_argument("--file", "-f", help="입력 JSON 파일 경로")
    parser_run.add_argument("--key", "-k", default=APP_API_KEY, help="API Key (기본값: .env의 DIFY_APP_API_KEY)")
    parser_run.add_argument("--response-mode", "-m", default="streaming", choices=["blocking", "streaming"], help="응답 모드 (기본값: streaming)")
    parser_run.add_argument("--user", "-u", default="cli-user", help="사용자 ID (기본값: cli-user)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == "list":
            asyncio.run(cmd_list(args))
        elif args.command == "export":
            asyncio.run(cmd_export(args))
        elif args.command == "import":
            asyncio.run(cmd_import(args))
        elif args.command == "update":
            asyncio.run(cmd_update(args))
        elif args.command == "publish":
            asyncio.run(cmd_publish(args))
        elif args.command == "validate":
            cmd_validate(args)
        elif args.command == "run":
            asyncio.run(cmd_run(args))
    except DifyClientError as e:
        print(f"API 오류: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n중단됨")
        sys.exit(130)
    except Exception as e:
        print(f"오류: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
