# 04 LangChain

## 1. LangChain 개요

### 1.1 WHY — 왜 LangChain인가?
LLM API 직접 호출의 반복 구현 코드·벤더 종속·스파게티 워크플로우 문제를 표준 추상화 계층으로 해결.

| 가치 | 설명 |
|------|------|
| 보일러플레이트 제거 | `prompt | llm | parser` 체인으로 개발 시간 3~5배 단축 |
| 벤더 종속 탈피 | import 문만 변경으로 모델 교체, 비즈니스 로직 수정 불필요 |
| 엔터프라이즈 검증 | Klarna 문의해결 80% ↓, Elastic 보안위협 탐지 자동화 |
| 범용 프레임워크 | AI 앱 5대 핵심 구성요소 포괄, GitHub 인기 프레임워크 (★ 125k) |

### 1.2 HOW — 생태계 구성

#### 생태계 4대 프로젝트

| 프로젝트 | 역할 |
|----------|------|
| **LangChain** | 기본 프레임워크 |
| **LangGraph** | 오케스트레이션 |
| **LangSmith** | 관측성·디버깅 (유료 라이선스 필요) |
| **LangServe** | API 배포 (데모 개발용) |

#### AI 앱 5대 핵심 구성요소 매핑 (We Love Real Time Harmony)

| 구성요소 | LangChain 매핑 | 핵심 클래스/도구 |
|----------|----------------|-------------------|
| Workflow | LangGraph | `StateGraph`, `MemorySaver` (순환/분기/상태 관리) |
| LLM I/O | Model I/O + LCEL | `ChatPromptTemplate`, `StrOutputParser` |
| RAG | Retrieval | FAISS, Chroma, `RecursiveCharacterTextSplitter` |
| Tools | Agents & Tools | `create_agent`, `@tool` |
| Harness | LangSmith & Callbacks | `CallbackHandler`, `LangSmithTracer`, `RateLimiter` |

### 1.3 패키지 구조 — 모듈화 설계
패키지는 다르지만 인터페이스는 동일 → 의존성 경량화 목적 분리.

| 패키지 | 역할 |
|--------|------|
| `langchain-core`, `langchain` | 기본 및 핵심 로직 |
| `langgraph` | 멀티 에이전트 Workflow |
| `langchain-openai`, `langchain-anthropic`, `langchain-google-genai` | 벤더별 통합 |
| `langchain-community` | 벡터 DB, 문서 로더 등 서드파티 통합 (대체 중) |

## 2. ① Workflow: LangGraph

### 2.1 WHY — 왜 LangGraph인가?
LCEL 체인의 선형 흐름 한계를 그래프 구조(순환·분기·상태 관리)로 해결.

| 특징 | LCEL 체인 | LangGraph |
|------|-----------|-----------|
| 흐름 | 선형 (A → B → C) | 그래프 (순환·분기) |
| 상태 관리 | 제한적 | 풍부한 상태 관리 |
| 에이전트 루프 | 구현 어려움 | 자연스러운 구현 |

### 2.2 3대 핵심 개념

| 개념 | 설명 |
|------|------|
| **State** | 그래프 내 공유 데이터 (메시지 리스트 등) |
| **Node** | 실제 작업 수행 함수 (LLM 호출, 도구 실행) |
| **Edge** | 노드 간 이동 경로 (조건부 분기 포함) |

### 2.3 HOW — 핵심 코드 & 패턴

```python
# 1. 상태 정의
class State(TypedDict):
    messages: Annotated[list, add_messages]

# 2. 노드 정의
def chatbot(state: State):
    return {"messages": [model.invoke(state["messages"])]}

# 3. 그래프 구성 → 컴파일 → 실행
builder = StateGraph(State)
builder.add_node("chatbot", chatbot)
builder.add_edge(START, "chatbot")
builder.add_edge("chatbot", END)
graph = builder.compile()
```

실행 흐름:
`StateGraph(상태 정의)` → `add_node(노드 등록)` → `add_edge` / `add_conditional_edges(흐름·분기 연결)` → `compile()(그래프 빌드)` → `invoke()(실행)`.

> HITL(Human-in-the-loop): `add_conditional_edges()`로 조건 함수 반환값에 따라 사람 승인 분기 처리.

## 3. ① Workflow: State 관리

### 3.1 WHY
- 대화 상태 관리: 멀티턴 컨텍스트 유지  
- 워크플로우 상태 관리: 중단/재개, Human-in-the-loop  

### 3.2 HOW — LangGraph Checkpointer
대화 + 워크플로우 상태를 `thread_id` 기반 자동 관리.

#### 메모리 방식 비교

| 방식 | 권장 용도 | 특징 |
|------|-----------|------|
| **MemorySaver** (권장) | 대화 + 워크플로우, 복잡 워크플로우 | 체크포인터 |
| `InMemoryChatMessageHistory` (권장) | 대화만, 단순 체인 | 대화 이력 |
| `ConversationBufferMemory` (레거시) | 대화만, 기존 코드 참고용 | — |

### 3.3 ① 대화 상태 관리 (Checkpointer)

```python
from langgraph.checkpoint.memory import MemorySaver

# 체크포인터 생성 → 그래프에 연결
checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# thread_id로 세션 구분 → 이전 대화 기억
config = {"configurable": {"thread_id": "user-123"}}
result = graph.invoke({"messages": [...]}, config)
```

### 3.4 ② 워크플로우 상태 관리 (중단/재개)

```python
# 워크플로우 상태 정의
class WorkflowState(TypedDict):
    messages: Annotated[list, add_messages]
    approval_status: str

# 첫 실행 → 승인 대기에서 중단
config = {"configurable": {"thread_id": "order-456"}}
result = graph.invoke({...}, config)

# 승인 후 → 저장 상태에서 이어서 실행
graph.update_state(config, {"approval_status": "approved"})
result = graph.invoke(None, config)
```

> 프로덕션: `PostgresSaver.from_conn_string("postgresql://...")`로 DB 기반 영속성 확보.

## 4. ② LLM 인터페이스: Model I/O

### 4.1 흐름
`Input → Prompts(가공) → Model(LLM) → Output Parsers(가공) → Output`

### 4.2 Prompts

#### 기본 Text 템플릿
- Zero-shot → `PromptTemplate`  
- Few-shot → `FewShotPromptTemplate`  

#### Chat 메시지 템플릿
System 메시지(모델 행동 지침) + Human 메시지(사용자 입력) + AI 메시지(모델 응답).
- Zero-shot → `ChatPromptTemplate`  
- Few-shot → `FewShotChatMessagePromptTemplate`  

#### PipelinePromptTemplate
여러 `PromptTemplate`을 체이닝하여 복합 프롬프트 구성.

#### 프롬프트 유틸리티
- `load_prompt`: YAML/JSON에서 프롬프트 로드  
- `partial_variables`: 변수 일부값 미리 고정. 반복값/동적값 주입에 활용  

### 4.3 Output Parsers

클래스명 규칙: `{결과형식}OutputParser`

| 형식 | 클래스 |
|------|--------|
| String | `Str` |
| JSON | `SimpleJson` |
| DateTime | `DateTime` |
| XML | `XML` |
| Markdown | `MarkdownList` |
| CSV | `CommaSeparatedList` |
| Class | `Pydantic` |

#### Structured Output
Parser 대신 LLM이 제공받은 결과 Class 구조대로 리턴. LLM 객체 생성 시 결과 Class 지정 → 형식 보장, 안정적 출력.

## 5. ② LLM 인터페이스: LCEL (LangChain Expression Language)

컴포넌트를 `|`(파이프) 연산자로 선언적 결합하는 LangChain 고유 언어. 파이프 앞의 결과가 뒤의 입력이 됨 — 가독성, 병렬 처리, 스트리밍 자동 지원.

### 5.1 공통 Workflow: 객체 생성 → 체인 구성 → 실행

#### STEP 1 컴포넌트 객체 생성
1. LLM 객체: `ChatOpenAI(model=...)`  
2. Prompt 객체: `ChatPromptTemplate`  
3. Parser 객체: `StrOutputParser()`  

#### STEP 2 체인 구성 (파이프 연산자)
```python
chain = prompt | model | parser
```

#### STEP 3 실행 — Runnable 인터페이스
| 메서드 | 설명 |
|--------|------|
| `invoke()` | 동기 |
| `ainvoke()` | 비동기 |
| `batch()` | 병렬 |
| `stream()` | 동기 스트리밍 |
| `astream()` | 비동기 스트리밍 |

```python
chain.invoke({"topic": "인공지능"})
```

### 5.2 Chain 파라미터 비교: OutputParser vs Structured Output

#### 일반 OutputParser
```python
chain = prompt | llm | parser
chain.invoke({
    "dish": "스파게티",
    "format_instructions": parser.get_format_instructions()
})
```
→ parser + format_instructions 필요.

#### Structured Output (실무 권장)
```python
structured_llm = llm.with_structured_output(Recipe)
chain = prompt | structured_llm
chain.invoke({"dish": "스파게티"})
```
→ parser 불필요, API가 구조 보장.

### 5.3 체인 합성 패턴

#### ① 순차 체인 (Sequential)
가장 기본 패턴. 파이프로 순서대로 연결.
```python
prompt | model | parser
```

#### ② 병렬 체인 (RunnableParallel)
여러 작업을 동시 실행, 결과를 딕셔너리로 반환.
```python
parallel_chain = RunnableParallel(
    summary = prompt | model | parser,
    word_count = lambda x: ...
)
result = parallel_chain.invoke({...})
# result["summary"], result["word_count"]
```

#### ③ 분기 체인 (RunnableBranch)
조건에 따라 다른 체인을 실행하는 if-else 패턴.
```python
branch = RunnableBranch(
    (cond_1, tech_chain),
    (cond_2, science_chain),
    default_chain
)
```

#### ④ 패스스루 (RunnablePassthrough)
입력을 그대로 통과시키는 역할. RAG 체인에서 질문을 변환 없이 전달할 때 사용.

## 6. ③ RAG (Retrieval Augmented Generation): Retrieval

### 6.1 WHY
내·외부 데이터를 검색하여 모델 지식을 보강 → 결과 품질 향상.

### 6.2 두 단계 흐름

| 단계 | 흐름 | 의미 |
|------|------|------|
| **Indexing** (불쪼임) | Load → Split → Embed → Store | 문서 로드 → 청크 분할 → 벡터 변환 & 저장 |
| **Retrieval** (문탐생) | Query → Retrieve → Generate | 질문 입력 → 문서 검색 → 응답 생성 |

### 6.3 Load — 문서 포맷별 클래스 이용
Document 객체: `page_content`와 `metadata`(출처, 페이지번호)로 구성.

```python
loader = PyPDFLoader("특허법.pdf")
documents = loader.load()
```

### 6.4 Split — 청크 사이즈로 문서 분할
```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200,
    separators=["\n\n", "\n"]
)
splits = text_splitter.split_documents(documents)
```

### 6.5 Embed — 텍스트를 숫자 좌표값으로 변환
```python
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectors = embeddings.embed_documents([doc.page_content for doc in splits])
```

### 6.6 Store — 벡터 DB에 저장
임베딩된 벡터값을 벡터 DB에 저장: ChromaDB, FAISS, Pinecone, Weaviate 등.

```python
vectorstore = FAISS.from_documents(
    documents=splits,
    embedding=embeddings
)
```

> 응답 시 원본 텍스트 전달을 위해 임베딩 결과와 청크를 벡터로 저장.

### 6.7 Retrievers — 벡터스토어 검색하여 LLM에 전달
```python
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)
mmr_retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 4, "fetch_k": 10}
)
```

| 검색 방법 | 설명 |
|-----------|------|
| `similarity` | 유사도 기반 검색 |
| `mmr` | 유사도 + 다양성. `fetch_k={후보건수}` → K개 반환 |

> 의미가 비슷한 텍스트를 가까운 위치에 배치하여 유사문서를 검색.

## 7. ④ Tools: Agent & Tools

### 7.1 WHY
LLM을 '생각하는 존재'에서 '행동하는 Agent'로 전환 → 정보 최신성/정확성 향상, 외부 시스템 연동, 반복/다단계 작업 수행.

### 7.2 HOW — ReAct 패턴
추론(Reasoning) → 행동(Action) → 관찰(Observation) 사이클 반복: **DREAM**.

#### 5단계 프로세스 (LangChain)

| # | 단계 | 구현 |
|---|------|------|
| 1 | 도구 정의 (Define) | `@tool` 데코레이터 + 타입힌트 + DocString → 자동 스키마 생성 |
| 2 | 요청 전송 (Request) | `bind_tools()`로 활용. 도구 한 번만 바인딩 |
| 3 | 모델 판단 (Evaluate) | `{응답}.tool_calls`에서 실행 함수 추출 |
| 4 | 함수 실행 (Action) | 도구명으로 툴 매핑하여 `invoke`로 실행 |
| 5 | 결과 반환 (Model response) | `ToolMessage` 클래스로 결과 반환. 도구 호출 불필요 시 종료 |

### 7.3 ReAct 루프 구현

#### Low-level 구현
- `{LLM 객체}.bind_tools(도구리스트)`로 바인딩  
- While 반복 사용: 모델 응답에서 함수 추출  

#### High-level 구현
- `create_agent` 함수로 모델과 툴 정의  
- `{agent}.invoke`로 자동 ReAct 루프 수행  

### 7.4 Middleware: Agent와 Tool 사이 관문
Agent 동작을 세밀하게 제어.

| 미들웨어 | 역할 |
|----------|------|
| **HumanInTheLoop** | 중요 액션 전 사용자 승인 요청 |
| **Summarization** | 긴 대화 일정 토큰 초과 시 자동 요약 |
| **PII** | 개인정보(PII) 자동 마스킹 |

## 8. ⑤ Harness: LangSmith & Callbacks

AI 에이전트에 "고삐(Harness)"를 씌워 안전하고 예측 가능하게 제어하는 엔지니어링.

### 8.1 운영 리스크 3축

| 축 | 리스크 | 약어 |
|----|--------|------|
| 비용 | 무한루프 · 토큰누수 · Agent 폭주 | 돌·토·폭 |
| 성능 | 시스템마비 · 응답지연 · 할루시네이션 전파 | 멈·느·할 |
| 보안 | Prompt Injection · 데이터유출 · 권한오남용 | 침·유·권 |

### 8.2 LangChain Harness 구성요소 매핑

| 구성요소 | 담당 리스크 |
|----------|-------------|
| **Observability — LangSmith** | 전체 관측·비용 관리 |
| **Callbacks** | 돌·토·폭 (성능 관리) |
| **RateLimiter** | 멈·느·할 (보안 관리) |
| **Guardrails** | 침·유·권 |

> Middleware(에이전트 레벨 실행 제어)와 Harness(관측 + 운영 제어)는 상호 보완적 관계.

## 9. LangChain 실습

### 9.1 공통 환경
Streamlit + LangChain `@tool` + `bind_tools()` + 멀티 모델 (OpenAI / Claude / Gemini) + 3개 도구 (날씨, 관광지, 맛집).

### 9.2 chatbot (Non-Streaming)

| 항목 | 내용 |
|------|------|
| 핵심 메서드 | `llm.invoke(messages)` |
| 응답 방식 | 완료 후 한 번에 반환 (`AIMessage`) |
| Tool 처리 | `response.tool_calls` → 도구 실행 → 재호출 |
| 핵심 함수 | `process_tool_calls()` → 문자열 반환 |
| UI 출력 | `st.markdown(response)` — 전체 텍스트 |
| 코드 난이도 | 기본 — Tool Calling 입문에 적합 |

흐름: `invoke()` → `tool_calls?` → 도구 실행 → `ToolMessage` → `invoke()` → 최종 응답.

### 9.3 chatbot-stream (Streaming)

| 항목 | 내용 |
|------|------|
| 핵심 메서드 | `llm.stream(messages)` |
| 응답 방식 | 청크 단위 실시간 반환 (`AIMessageChunk`) |
| Tool 처리 | 청크 누적 → `+` 연산자 조립 → 도구 실행 |
| 핵심 함수 | `process_tool_calls_streaming()` → `yield` |
| UI 출력 | `st.write_stream(generator)` — 실시간 |
| 추가 처리 | `extract_text_from_chunk()` — Claude 대응 |

흐름: `stream()` → 청크 수집 → `tool_calls?` → 도구 실행 → `stream()` → `yield` 텍스트.
