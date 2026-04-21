# 06 MCP

## 1. MCP 개요

### 1.1 WHY — 정의와 필요성
**정의**: AI 앱이 외부 도구를 호출하는 표준 인터페이스.

필요성:
- 앱-도구 간 인터페이스 표준화  
- 프레임워크 비종속  
- 풍부한 생태계: 사실상 업계 표준  

### 1.2 주요 MCP 서버 카테고리

| 카테고리 | MCP 서버 | 설명 |
|----------|-----------|------|
| 코드 | Context7 | 최신 코드 검색 |
| 코드 | Playwright | 프론트엔드 테스트 |
| 코드 | Sequential | LLM의 논리적 추론 지원 |
| 코드 | GitHub | 소스관리 |
| 코드 | Filesystem | 로컬 파일 읽기/쓰기 |
| 서비스 코드 | Sentry | 에러 로그 분석 및 디버깅 자동화 |
| 검색 | Brave Search / Exa | 최신 웹 정보 검색 |
| 검색 | Tavily / DuckDuckGo | 최신 웹 정보 검색 |
| 검색 | Google Maps | 장소 검색 |
| 검색 | Firecrawl | 웹 스크래핑 |
| 검색 | Memory | 지식 Graph 기반 영구 메모리 |
| 서비스·커뮤니케이션 | Gmail | Gmail 연동 |
| 서비스·커뮤니케이션 | Slack | Slack 연동 |

### 1.3 MCP 아키텍처 — 전송 방식
- **stdio**: 표준 입출력 기반 (로컬 프로세스)  
- **HTTP/SSE / Streamable HTTP**: 원격 호스팅 서버용  

## 2. MCP 핵심 기능

### 2.1 핵심 기능 3종

| 기능 | 용도 | 호출 의사결정 | 실제 호출 |
|------|------|---------------|-----------|
| **Tools** | 외부 서비스 실행이 필요할 때 (API 호출, DB 변경, 메일 발송 등) | LLM | AI 앱 |
| **Resources** | 서버가 가진 데이터를 참조할 때 (설정값, 스키마, 이력 조회 등) | AI 앱 | AI 앱 |
| **Prompts** | 반복되는 작업을 표준화된 템플릿으로 수행할 때 (코드 리뷰, 버그 분석 등) | 사용자 | AI 앱 |

### 2.2 4단계 생명주기

| 단계 | 설명 | FastMCP 명령 |
|------|------|---------------|
| 1. 초기화 요청/응답 | 프로토콜 버전, 지원 기능 종류, Client/Server 앱 이름/버전 교환 | `session.initialize()` |
| 2. 초기화 완료 알림 | 양방향 통신 준비 | `session.initialize()` |
| 3. 작업 수행 | 도구/리소스/프롬프트의 목록 조회 및 실행 요청 수행 | (아래 표 참조) |
| 4. 종료 | 연결 종료 | 자동 종료 |

#### 작업 수행 명령 (3단계)

| 작업 | 명령 |
|------|------|
| 도구 목록 | `session.list_tools()` |
| 도구 실행 | `session.call_tool("이름", arguments={...})` |
| 리소스 목록 | `session.list_resources()` |
| 리소스 읽기 | `session.read_resource("URI")` |
| 프롬프트 목록 | `session.list_prompts()` |
| 프롬프트 읽기 | `session.get_prompt("이름", arguments={...})` |

## 3. MCP 핵심 기능 예제

### 3.1 Tools — 서버

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyServer")

# @mcp.tool() 데코레이터로 도구 등록
@mcp.tool()
def get_weather(city: str) -> str:
    """도시의 현재 날씨를 조회합니다."""
    # 실제로는 API 호출 등 수행
    return f"{city}: 15°C, 맑음"
```

### 3.2 Tools — 클라이언트

```python
async def main():
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            result = await session.call_tool(
                "get_weather",
                arguments={"city": "Seoul"}
            )
            print(result.content)
            # 출력: Seoul: 15°C, 맑음

asyncio.run(main())
```

> 타입 힌트 + docstring으로 도구를 작성하면 MCP가 JSON Schema를 자동 생성. 타입힌트 + docstring으로 인자 목록을 자동 생성.

### 3.3 Resources — 서버

```python
mcp = FastMCP("MyServer")
history: list[str] = []

@mcp.resource("calc://history")
def get_history() -> str:
    """지금까지의 계산 이력을 반환합니다."""
    if not history:
        return "계산 기록이 없습니다."
    return "\n".join(history)
```

### 3.4 Resources — 클라이언트

```python
async with stdio_client(params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        resources = await session.list_resources()
        resource = await session.read_resource("calc://history")
        print(resource.contents)
        # 출력: 1. 3 + 5 = 8
        #       2. 10 ÷ 3 = 3.333...
```

> 데코레이터 URI + docstring으로 리소스 메타 정보를 자동 생성. 구독(subscribe)으로 변경 알림 수신 가능. URL 스킴은 리소스 유형을 나타내며 자유롭게 정의.

### 3.5 Prompts — 서버

```python
mcp = FastMCP("MyServer")

@mcp.prompt()
def code_review(code: str, language: str = "Python") -> str:
    """코드 리뷰 프롬프트"""
    return (
        f"다음 {language} 코드를 리뷰해주세요.\n"
        f"보안, 성능, 가독성 관점에서 분석하고\n"
        f"개선점을 제안해주세요.\n"
        f"```{language.lower()}\n{code}\n```"
    )
```

### 3.6 Claude Desktop에서의 사용 예시
1. 사용자가 슬래시 명령어로 프롬프트 선택: `/code_review`  
2. 앱이 파라미터 입력 UI를 표시: `code: [사용자가 코드 붙여넣기]`, `language: [Python]`  
3. 서버가 완성된 프롬프트를 생성하여 반환  
4. LLM이 해당 프롬프트로 작업 수행  

## 4. MCP 고급 기능

### 4.1 Sampling — LLM 샘플링 (텍스트 생성)
1. Server가 Sampling 요청을 Client에 전달  
2. Host가 요청을 검토/승인/거부 (보안 정책)  
3. 승인 시 Host 내부의 LLM이 응답 생성  
4. 응답이 Client를 통해 Server로 전달  

### 4.2 Roots
작업 루트 디렉터리 권고.

### 4.3 Elicitation (일리시테이션) — 추가 정보 끌어내기
1. Server가 Elicitation 요청(스키마 포함)을 Client에 전달  
2. Host가 요청을 검토하고 스키마에 맞는 UI를 렌더링  
3. 사용자가 입력하면 Host가 입력값을 검증  
4. 검증된 데이터가 Client를 통해 Server로 전달  

## 5. MCP 인증/인가

### 5.1 OAuth 방식

| 인증/인가 방식 | 실행 환경 | 적합 환경 |
|----------------|-----------|-----------|
| **Public Client** (OAuth) | 로컬: 사용자 PC | Claude Desktop, IDE 플러그인 |
| **Credential Client** (OAuth) | 서버: VM, Container | 백엔드 서비스, 배치 작업 |

> **PKCE (Proof Key for Code Exchange)**: `code_challenge`(공개키)와 `code_verifier`(암호키)를 사용하여 동일인임을 증명하는 방식. `code_challenge`를 `code_verifier` 키로 단방향 암호화하고 base64 문자열로 생성.

### 5.2 JWT 방식

| 인증/인가 방식 | 실행 환경 | 적합 환경 |
|----------------|-----------|-----------|
| **JWT 직접 발급** | 로컬 또는 서버 | 프로토타입, 단일 서비스 |
| **JWT 인증서버 발급** | 로컬 또는 서버 | 내부 시스템, 다수 서버 |

## 6. MCP 실습

### 6.1 개발 환경 설정
- Python MCP SDK 설치 (uv/pip)  
- 프로젝트 구조 초기화 및 의존성 관리  

### 6.2 간단한 MCP 구현
- 계산기 서버 — Tools/Resources/Prompts  
- 날씨 조회 서버 — wttr.in(무료 예보) API 연동  
- Claude Code / Desktop 연동 테스트  

### 6.3 Sampling 실습
- 온라인 쇼핑몰 고객 문의 자동 분류  
- Groq LLM → JSON 티켓 생성 → Slack 알림  
- 서버 → 클라이언트 LLM 호출 패턴  

### 6.4 Elicitation 실습
- 여행 플래너 — 단계별 사용자 입력 요청  
- 목적지·날짜·예산·관심사 검증  
- Groq LLM 기반 맞춤 일정 생성  

### 6.5 Roots 실습
- 디렉토리 접근 통제  
- 클라이언트가 허용 루트 전달  
- 서버가 경로 검증 후 파일 접근  

### 6.6 AI 에이전트 개발 지원
- GraphRAG 기반 MCP 서버  
- LightRAG 활용 교재 지식 그래프 검색  
- Streamable HTTP 전송 방식  
