# 07 MAS (Multi-Agent System)와 LangGraph

## 1. MAS 개요

### 1.1 정의
- **Agent**: 고유의 목적, 프로세스, 데이터를 가진 독립적 AI 단위  
- **MAS (Multi Agent System)**: 복잡한 작업을 여러 전문 에이전트가 분담하고, Scheduler가 조율하며, Supervisor가 통제하는 협업 시스템  

### 1.2 필요성
LLM 단독 사용의 한계를 넘어 큰 목표 달성을 위한 다양한 전문성, 외부시스템 호출 능력, 정보의 최신성/정확성, 반복 재작업 능력이 필요.

| 한계 | MAS 해결 방법 |
|------|----------------|
| 정보 단절 | RAG: 웹 검색, DB 조회 |
| 도구 연결 실행 불가 | Function Calling, MCP로 외부 시스템 제어 |
| 단일 턴 한계 | ReAct Loop 구조로 다단계 작업 수행 |
| 전문성 한계 | 전문 에이전트 협업으로 역할 분담 |

### 1.3 활용 사례

| 영역 | 워크플로우 |
|------|------------|
| 업무 자동화 | 이메일 분류 → 일정 등록 → 알림 발송 |
| 고객 서비스 | 문의 분석 → 정보 검색 → 답변 생성 → 티켓 생성 |
| 데이터 분석 | 데이터 수집 → 전처리 → 분석 → 리포트 생성 |
| 소프트웨어 개발 | 요구사항 분석 → 코드 생성 → 테스트 → 배포 |

## 2. MAS 구축 방안

### 2.1 SAS 패턴 적용

| 구성 요소 | 역할 | 핵심 책임 |
|-----------|------|-----------|
| Scheduler | 매니저 | 작업 분해, Agent 할당, 실행 순서 결정 |
| Agent | 실무자 | 실제 작업 수행, 도구 사용, 결과 반환 |
| Supervisor | 경영자 | 진행 추적, 품질 감시, 종료/재시도 판단 |

### 2.2 통신 프로토콜 비교

| 프로토콜 | 동기 + Blocking | 동기 + Non-Blocking | 비동기 + Non-Blocking (MQ 사용 추천) |
|----------|-----------------|---------------------|---------------------------------------|
| In-Process | 직접 호출 | — | — |
| Function Calling | 직접/동기 호출 | 폴링 (주기적 체크) | 콜백/웹훅/SSE/웹소켓 (완료 시 통보) / 이벤트: MQ(Message Queue)를 통한 결과 응답 |
| MCP | 동기 호출 | 상태 체크 (리소스 Read) | — |
| API (REST/gRPC) | 동기 호출 | 폴링 (주기적 체크) | — |

### 2.3 단일 MAS 내부 (단일 프로세스)
Scheduler 수직적: In-Process. Agent 간 Shared State로 데이터 공유. 외부 연동은 Function Calling, MCP, API.

### 2.4 분산 MAS

| 단위 MAS | 역할 | 연동 |
|----------|------|------|
| 단위 MAS A | 문서 분석 전담 | API / MCP |
| 단위 MAS B | 코드 생성 전담 | Function Calling |
| 단위 MAS C | 품질 검증 전담 | — |

## 3. MAS 구성 기술

### 3.1 Function Calling
LLM이 외부 함수를 호출하는 표준 메커니즘. **DREAM** 패턴.

| 단계 | 설명 |
|------|------|
| 도구 정의 | 함수명·설명·파라미터 JSON 스키마 정의 |
| 요청 전송 | 사용자 메시지 + 도구 목록 API 전송 |
| 모델 판단 | 모델이 프롬프트 분석 후 함수 호출 결정 |
| 함수 실행 | 앱에서 실제 함수 호출 수행 |
| 결과 반환 | 모델에 함수 결과 전달하여 최종 응답 생성 |

### 3.2 MCP
에이전트가 외부 도구를 호출하는 표준 인터페이스.

| 컴포넌트 | 역할 |
|----------|------|
| Host | AI 앱, 여러 Client 관리 |
| Client | 하나의 Server와 통신 담당 |
| Server | 도구/리소스/프롬프트 제공 |

#### MAS와 매핑
- **Host = MAS 시스템 자체**  
- **Client = Agent 외부 연결 컴포넌트**  
- **Server = 외부 시스템 (DB, API 등)**  

```
MCP Host (사용자 앱)  예: Claude Desktop, VS Code, 사용자 작성 앱
   ├── MCP Client #1 ── MCP Server 1
   ├── MCP Client #2 ── MCP Server 2
   └── MCP Client #3 ── MCP Server 3
```

### 3.3 상태 관리
에이전트 간 데이터 공유 및 상태 유지.

| 상태 종류 | 관리 방법 |
|-----------|-----------|
| 대화 상태 | Context Window 관리 (요약, 슬라이딩 윈도우) |
| 작업 상태 | Shared State Pattern — State 공유 + Checkpointing(스냅샷) |
| 장기 상태 | Persistence (메모리 영속화, 에이전트 간 공유) |

```
Scheduler ── Agent A ── Agent B
       │         │         │
       ▼         ▼         ▼
       Shared State (Redis / DB)
       ├ Task / Status
       ├ Checkpoints
       └ Agent Memory
```

## 4. MAS 운영 안정성 방안 (하네스 엔지니어링)

암기법: **돌·토·폭 / 멈·느·할 / 침·유·권**

### 4.1 비용 (Cost)

| 약어 | 리스크 | 대응 |
|------|--------|------|
| 돌 | 무한루프 | 최대 반복 제한, 타임아웃, 무한루프 감지 |
| 토 | 토큰누수 | 컨텍스트 윈도우 크기(토큰 최대 총량) 관리, 에이전트 전달 시 메시지 요약 |
| 폭 | 에이전트 폭주 | Budget 관리, 이상 감지 시 강제 종료(Switch-Kill), 에이전트 호출 깊이 제한 |

### 4.2 성능 (Perf)

| 약어 | 리스크 | 대응 |
|------|--------|------|
| 멈 | 시스템 멈춤 | Circuit Breaker, Resilience 패턴 적용 (Rate Limit, Retry 등), 리소스 격리(BulkHead), 점진적 기능 축소(문제 있는 에이전트 제외) |
| 느 | 응답 지연 | 병렬 실행, LLM 캐싱 |
| 할 | 할루시네이션 | 출력 구조 검증, 신뢰도 게이팅, 복수 모델/프롬프트로 교차 검증 |

### 4.3 보안 (Security)

| 약어 | 리스크 | 대응 |
|------|--------|------|
| 침 | 프롬프트 침입 | 입력 필터링, 시스템 프롬프트에 방어 지시, 시스템/유저 프롬프트 분리 |
| 유 | 민감정보 유출 | DLP (Data Loss Protection: 데이터 유출 방지), 출력 필터, 감사 로그, 네트워크 화이트리스트 |
| 권 | 권한 오남용 | 최소 권한 원칙, HITL (Human In The Loop), 도구 화이트리스트 |

## 5. LangGraph 개요

### 5.1 정의 / 필요성
- **정의**: LLM 기반의 에이전트 오케스트레이션 프레임워크  
- **필요성**: 반복·분기·상태 관리가 필요한 복잡한 워크플로우 개발  

### 5.2 핵심 구성 요소

| 구성 요소 | 설명 | 목적 |
|-----------|------|------|
| **StateGraph** | 워크플로우 정의 컨테이너 | 노드/엣지 담는 그래프 생성 |
| **Node** | 작업 수행 함수 | 실제 작업 수행 (검색·생성·감시) |
| **Edge** | 노드 간 순차 연결 | 다음 노드로 무조건 이동 |
| **Conditional Edge** | 조건부 분기 | 조건에 따라 다른 노드로 분기 |
| **State** | 노드 간 공유 데이터 | 런타임 메모리에서 데이터 공유 |
| **Checkpointer** | 상태 영속화 도구 | State 스냅샷 저장, 세션 유지 |

### 5.3 Node 등록 방법
`add_node("노드명", 함수)`로 그래프에 등록.

```python
from langgraph.graph import StateGraph

# 1. 그래프 생성
workflow = StateGraph(AgentState)

# 2. 노드 등록: add_node("노드명", 함수)
workflow.add_node("generate", generate_answer)
```

> 핵심: 노드는 **변경할 필드만 반환**하면 됨. LangGraph가 자동으로 기존 State에 병합하므로, 나머지 State는 자동 유지.

## 6. LangGraph State와 Checkpointer

- **State = 칠판 (RAM)**: 대화/작업 진행 중 노드 간 데이터 공유  
- **Checkpointer = 칠판 사진**: 매 대화/작업 완료 후 State 스냅샷 저장  

| 조건 | 동작 |
|------|------|
| Checkpointer 없이 | 해당 대화/작업 실행 안에서만 State 유지 |
| Checkpointer 있으면 | 각 대화/작업 간에도 State 이어감 (멀티턴) |

> `thread_id`: 세션별 State 격리 → 멀티 사용자 지원.

## 7. LangGraph 개념 정의

### 7.1 Edge
실행 순서별로 `add_edge(출발, 종료)`로 연결. `START`와 `END`는 최초 시작과 최후 종료를 나타내는 특별한 예약어.

### 7.2 Conditional Edge
`add_conditional_edges(출발, 라우팅함수, 결과별 종료노드)`. `START/END`는 동일한 특별 예약어.

### 7.3 기본 Edge 예제

```python
from langgraph.graph import StateGraph, START, END

# 그래프 생성
workflow = StateGraph(AgentState)

# 노드 추가
workflow.add_node("check_retrieval", check_retrieval_need)
workflow.add_node("search", search_sources)
workflow.add_node("generate", generate_answer)

# 엣지 추가 (실행 순서)
workflow.add_edge(START, "check_retrieval")
workflow.add_edge("search", "generate")
workflow.add_edge("generate", END)
```

### 7.4 조건부 엣지 예제 (Conditional Edge)

```python
def should_search(state: AgentState) -> str:
    """조건부 라우팅: 검색 수행 여부"""
    if state["needs_retrieval"]:
        return "search"
    return "generate_direct"

def should_retry(state: AgentState) -> str:
    """조건부 라우팅: 재시도 여부"""
    if not state["is_useful"] and state["retry_count"] < 2:
        return "rewrite"
    return "end"

# 조건부 엣지 추가
workflow.add_conditional_edges(
    "check_retrieval",   # 출발 노드
    should_search,       # 라우팅 함수
    {
        "search": "search",            # 검색 필요
        "generate_direct": "generate"  # 직접 생성
    }
)
workflow.add_conditional_edges(
    "evaluate",
    should_retry,
    {
        "rewrite": "rewrite",  # 재시도 필요 → 질문 재작성 노드
        "end": END
    }
)
```

## 8. LangGraph — 단일 MAS / 분산 MAS

LangGraph는 단일 MAS와 분산 MAS 양쪽을 지원.

## 9. MAS 실습

### 9.1 워크플로우 (Code Path / QA Path)

```
START
  ▼
Router (질문 분류 code/qa)
  ├── code ──► RAG (Qdrant 벡터 검색) ──► Code Gen ──► Supervisor (결과 평가, 0.75 이상)
  │                                            ▲                  │
  │                                            └── 재시도 ◄────────┤ (✓ RAG 재시도)
  │                                                                 │
  └── qa   ──► Web Search (DuckDuckGo) + YouTube ──► QA Response ──┤
                                                                    │
                            통과(code) ─► Final Resp. ──► END      │
                            통과(qa)   ─► Final Resp. ──► END      │
                            폴백(재시도횟수 초과) ─► Fallback ──► END
                            (Retry 쿼리 재작성)
```

핵심 구성:
- **Router**: 질문을 code/qa로 분류  
- **Code Path**: RAG (Qdrant 벡터 검색) → Code Gen  
- **QA Path**: Web Search (DuckDuckGo) + YouTube 검색 → QA Response  
- **Supervisor**: 결과 평가(0.75 이상이면 통과)  
- **Retry**: 쿼리 재작성  
- **Fallback**: 재시도 횟수 초과 시 폴백 응답  
- **Final Response**: 최종 포맷  

## 10. Dify 활용 Workflow 개발

### 10.1 WHY
기획자가 실제 개발에 앞서 프로토타이핑을 통해 검증하여 기획-개발 간 갭을 줄이고 재작업 비용을 최소화하기 위함.

### 10.2 HOW

#### ① 점진적 구체화 워크플로우
자연어(추상) → **DSL**(구조화) → 프로토타입(시각화/검증) → 코드(구체화).  
점진적 구체화 방향으로 진행.

> **DSL (Domain Specific Language)**: 개발 코드를 도메인 전문가가 이해할 수 있도록 표현할 때 사용하는 언어. 보통 YAML을 사용.

#### ② Dify 활용
Dify는 에이전틱 워크플로우를 구축하기 위한 오픈소스 플랫폼. "Do It For You"에서 유래한 이름처럼, 복잡한 에이전트 개발을 쉽게 만들어 줌.

#### ③ 전체 개발 과정

| STEP | 단계 | 산출물 | 주체 |
|------|------|--------|------|
| 1 | 시나리오 입력 | 요구사항 문서 | Human + Claude Code |
| 2 | DSL 생성 | Dify YAML DSL | Claude Code |
| 3 | Dify 프로토타입 | 검증된 DSL + 변경 사항 | Human + Dify Builder |
| 4 | 개발 계획서 작성 | 개발 계획서 | Claude Code |
| 5 | AI Agent 개발 | AI Agent 코드 | Claude Code |

전체 흐름: 비즈니스 문제 → 요구사항 문서 → Dify YAML DSL → 검증된 DSL + 변경 사항 → 개발 계획서 → AI Agent 코드.
