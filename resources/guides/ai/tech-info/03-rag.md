# 05 RAG

## 1. RAG 아키텍처 패턴과 구현 기법

### 1.1 Architecture Patterns (아키텍처 패턴)

| 구분 | Self-RAG | CRAG (Corrective RAG) | Adaptive RAG | Agentic RAG |
|------|----------|------------------------|---------------|--------------|
| 핵심 질문 | 검색할까? | 결과 맞나? | 어떤 전략? | 어떻게 행동? |
| 설명 | 검색 필요 판단 및 결과 검증 | 검색 결과 평가하고 교정 | 쿼리 복잡도에 따라 전략 결정 | ReAct 패턴으로 최적 결과 도출 |
| 작동 시점 | 검색 전 | 검색 후 | 라우팅 시 | 전체 과정 |

### 1.2 Techniques (세부 기법)

| 단계 | 기법 |
|------|------|
| Pre-Retrieval | Query Rewriting, Multi-Query / HyDE, Step-Back |
| Retrieval | Dense / Sparse, Hybrid Search, Graph RAG |
| Post-Retrieval | Re-ranking / Filtering, Compression, Fusion |

#### Pre-Retrieval Techniques

| 기법 | 변환 | 설명 |
|------|------|------|
| Query Rewriting | 질문 → 명확한 질문 | 모호한 질문을 검색에 유리하게 재작성 |
| Query 확장 (멀티쿼리) | 질문 → 여러 질문 | 여러 관점으로 검색 범위 확장 |
| HyDE | 질문 → 가상 답변 | 가상 답변으로 검색, 질문-문서 간 시맨틱 갭 해소 |
| Step-Back | 구체적 → 추상적 | 추상화로 더 넓은 맥락에서 검색 |

#### Retrieval Techniques

| 검색 방식 | 특징 |
|-----------|------|
| Sparse Retrieval | 키워드 일치 기반 (BM25), 정확한 용어 매칭에 강점 |
| Dense Retrieval | 의미적 유사성 기반 (임베딩 벡터), 맥락 파악에 강점 |
| Hybrid Search | 키워드와 의미 검색 결합, 양쪽의 장점 수용 |
| Graph RAG | Knowledge Graph + 벡터 검색 결합, 관계 기반 추론 가능 |

```python
hybrid_retriever = EnsembleRetriever(
    retrievers=[bm25, dense], weights=[0.5, 0.5]
)
```

#### Post-Retrieval Techniques

| 기법 | 설명 | 목적 |
|------|------|------|
| Re-ranking | 검색 결과를 재정렬. Bi-Encoder(질문과 문서 유사도로 1차 검색) 결과를 Cross-Encoder(질문+결과문서 관련도 계산)로 리랭킹 | 정밀도 향상 |
| Compression | 검색된 문서 내용을 압축/요약 | 토큰 비용 절감, 노이즈 제거 |
| Filtering | 관련 없는 검색 결과 문서 제거 | 컨텍스트 품질 향상 |
| Fusion | 여러 검색 결과 통합 | 다양한 소스의 결과 병합 |

### 1.3 RAGAS 평가 프레임워크
RAG 시스템의 성능을 정량적으로 측정하는 프레임워크.

| 지표 | 측정 대상 | 설명 |
|------|-----------|------|
| Context Precision | 검색 정밀도 | 검색 결과에서 질문 연관 청크가 얼마나 상위에 있나? |
| Context Recall | 검색 재현율 | 평가 데이터 세트의 정답 문장 중 검색된 컨텍스트로 뒷받침 가능한 문장의 비율 |
| Faithfulness | 답변 근거성 | 생성된 답변이 검색된 컨텍스트에 얼마나 많이 기반하는가? |
| Answer Relevance | 답변 관련도 | 답변이 사용자의 질문에 얼마나 관련되는가? |

## 2. RAG 실습

공통 구조: PDF 로드 → 전처리 → 청킹(800/200) → 임베딩(text-embedding-3-small) → ChromaDB 저장 → 질문 → 검색 → LLM 답변 생성.

### 2.1 Naive RAG — 기본 RAG 파이프라인
질문 → 임베딩 → ChromaDB 유사도 검색 → Top 5 → LLM 답변.

| 항목 | 내용 |
|------|------|
| 인덱싱 | PDF → 청킹(800/200) → OpenAI 임베딩 → ChromaDB 저장 |
| 검색 | Dense Retrieval (코사인 유사도) Top 5 |
| 특징 | 가장 기본적인 RAG. 단일 벡터 검색만 사용 |
| 한계 | 키워드 매칭 약함, 모호한 질문 대응 부족 |

### 2.2 Query Transformation — Pre-Retrieval 최적화 (4가지 기법)
질문 → 질문 변환 → 변환된 질문으로 검색 → Top 5 → LLM 답변.

| 기법 | 설명 |
|------|------|
| Rewriting | 모호한 질문 → 명확한 법률 용어로 재작성 |
| Multi-Query | 1개 질문 → 3개 변형 질문, 결과 병합 |
| HyDE | 질문 → 가상 답변 문서 생성 → 문서로 검색 |
| Step-Back | 구체적 질문 → 추상적 질문으로 배경 검색 |

### 2.3 Hybrid Search — Dense + Sparse 결합 검색
질문 → Dense(ChromaDB) + Sparse(BM25) → EnsembleRetriever → LLM.

| 구성 | 설명 |
|------|------|
| Dense | ChromaDB 임베딩 벡터 유사도 (의미 검색) |
| Sparse | BM25 키워드 빈도 기반 (정확한 용어 매칭) |
| 결합 | `EnsembleRetriever (weights=[0.5, 0.5])` |
| 추가 산출물 | `chunks.pkl` (BM25용 청크 별도 저장) |

### 2.4 Re-ranking — Post-Retrieval 정밀 재정렬
질문 → 1차 검색 Top 50 → Cross-Encoder Re-ranking → Top 5 → LLM.

| 단계 | 설명 |
|------|------|
| 1차 검색 | Bi-Encoder로 Top 50 후보 문서 추출 (빠름) |
| Re-ranking | Cross-Encoder로 질문+문서 쌍 정밀 평가 |
| 모델 | `bge-reranker-v2-m3-ko` (한국어 최적화) |
| 전략 | 많이 가져와서(50) 정밀하게 걸러내기(5) |

## 3. RAG 품질 튜닝

### 3.1 청킹 전략
**WHY**: 관련 밀도 높은 내용만 LLM에 제공하여 결과 품질 향상.

- **고정크기 청킹**: 청크 500 / 오버랩 100 권장  
- **구분자 이용 청킹**: 특정 구분자로 분할  
- **시맨틱 청킹**: 문장 유사도 기준 분할  
- **계층적 청킹**: 복수 크기별 부모-자식 구조의 청크 생성  
- **오버랩 전략**: 청크 사이즈의 10~20%로 지정. 청크사이즈가 크거나 문장간 의존도가 높으면 상향  
- **RAGAS + GridSearch**(청크/오버랩 크기, Top-k를 복수 지정)로 평가·조정  

### 3.2 임베딩 최적화
**WHY**: 도메인 특화 데이터의 검색 정확도 부족 문제 해결.

- 도메인 합성 데이터로 파인 튜닝  
- **Mafin (Model Augmented Fine-tuning)**: 파인 튜닝이 불가한 모델 위에 작은 임베딩 모델을 추가하여 학습시키는 기법  

### 3.3 벡터스토어 파라미터
**WHY**: 저장소 파라미터 조정으로 검색 품질 향상.

#### HNSW 기반 (Chroma, Qdrant, Weaviate) — 청크 그래프 구성

| 파라미터 | 설명 |
|----------|------|
| M | 각 청크가 몇 개의 다른 청크와 연결되는가? |
| ef_construction | 새 청크 추가 시 연결할 청크를 찾을 때 탐색하는 후보 청크 수 |
| ef_search | 검색 시 탐색하는 후보 청크 수 |

#### IVF 기반 (FAISS, Milvus) — 청크 클러스터 구성 (HNSW도 지원)

| 파라미터 | 설명 |
|----------|------|
| nlist | 클러스터 수 |
| nprobe | 검색 시 탐색할 클러스터 수 |

> 정확도↑ = 속도↓ 트레이드오프.

### 3.4 쿼리 최적화
**WHY**: 질문을 잘해 검색 품질을 높임. 기본적인 방법은 LLM 이용 질문 변환.

- **Query Rewriting**: 검색에 적합하게 변형  
- **Multi-Query**: 단일 질문 검색 부적합 시 여러 질문으로 확장  
- **HyDE**: 짧은 질문/전문용어 검색 시 가상 답변 생성 후 검색  
- **Step-back**: 질문의 개념적 배경 필요 시 개념적 배경 질문  

### 3.5 하이브리드 검색
**WHY**: 벡터 검색만으로는 키워드/전문용어 검색에 한계.

- **가중치 기반**: Sparse(키워드 검색-BM25) + Dense(벡터 검색) 결과에 가중치 조합  
- **랭킹 기반**: RRF(Reciprocal Rank Fusion) — 키워드 검색과 벡터 검색 결과의 랭킹을 기반으로 점수 환산  
- 키워드와 벡터 검색 결과를 최적 결합  

### 3.6 리랭킹
**WHY**: 초기 검색 결과를 재정렬하여 문서 관련성 향상.

- **전용 리랭킹 모델 (로컬)**: Cross-Encoder — 질문-문서 관련도 리랭킹  
- **ColBERT**: 토큰(보통 단어)별 유사도 계산  
- **전용 리랭킹 모델 (API)**: Cohere Rerank / Voyage Rerank  
- **LLM 활용**: LLM 검색 결과와 벡터 검색 결과를 가중치 조합  
- **LangChain 통합 파이프라인 활용**: 동일 인터페이스로 리랭킹  
- 흐름: 질문 → 초기 검색 → Compressor(리랭킹/필터링) → LLM 전달  

### 3.7 평가 및 메트릭스 (RAGAS)
**WHY**: 지속적 측정 및 개선을 위해 필요.

- 검색: Precision, Recall 측정 / 응답: Faithfulness, Relevance 측정  
- 평가 결과 판단: 검색과 응답생성을 분리하여 결과 판단. 0.7~0.9면 양호  
- 검색·응답 생성 가중치 평균 총점 산출  
- 테스트셋 50~100개 준비: RAGAS 라이브러리 이용, LLM 이용, 실제 사용 로그 이용, 수동 작성 방식  

### 3.8 하이퍼파라미터 튜닝
**WHY**: 전체 RAG 파이프라인의 최적 조합 탐색.

- 중요도: LLM 모델 > 임베딩 모델 > Top-K > 청크 > 리랭커 > 오버랩 사이즈  
- **AutoRAG-HP**: 자동 하이퍼파라미터 튜닝 기법  

## 4. 웹 검색 + YouTube 개요

| 도구 | 가격 | 특징 |
|------|------|------|
| DuckDuckGo | 무료 | 대표 웹 검색 도구 |
| Tavily Search | — | 대표 검색 도구 · AI 답변 포함, 도메인 지정 가능 |
| Google Serper | — | 구글 검색 전용, 지역/언어 설정 가능 |
| SerpAPI | — | 멀티 검색 엔진 지원 (Google, Bing, Yahoo 등) |
| YouTube Data API | 유료 | 공식 API. 기간 지정과 정렬 옵션 제공 |
| YouTubeSearchTool / scraptube | 무료 | 웹스크래핑 방식 |
| YouTubeLoader | 무료 | 자막 추출 전용 |

> 각 라이브러리 파라미터와 결과형식은 본 문서 11절 [별첨] 참조.

## 5. 웹 검색 + YouTube 아키텍처

### 5.1 Agentic RAG 아키텍처
웹 검색 + YouTube를 통합하여 다중 소스 RAG 아키텍처 구성.

```
User Query
   ▼
Query Router  "이 질문은 어떤 소스가 적합한가?"
   ▼          ▼              ▼
Web Search   YouTube         Vector DB
(Tavily)     Search+Loader   (문서)
   ▼          ▼              ▼
       Result Synthesis (LLM)
```

### 5.2 웹 검색 보조 유틸리티

| 도구 | 역할 |
|------|------|
| WebBaseLoader | URL에서 전체 HTML 로드 |
| Trafilatura (트리필라투라) | 웹페이지에서 본문만 추출 |
| BeautifulSoup | HTML 파싱 및 정제 라이브러리 |

### 5.3 YouTube RAG 파이프라인
1. `YouTubeSearchTool` (URL 획득)  
2. `YouTubeLoader` (자막 추출)  
3. `TextSplitter` (청킹)  
4. Vector Store / LLM  

### 5.4 성능/안정성 최적화
- **캐싱**: 동일 쿼리 반복 검색 방지 (메모리/Redis 캐싱, 질문 유사도 기반 캐싱으로 캐시 히트 비율 향상)  
- **Resilience**: API 오류, 네트워크 장애, Rate Limit 대응 → 재시도(Retry), 폴백(Fallback), Rate Limiting, Circuit Breaker  

## 6. 웹 검색 + YouTube 실습

### 6.1 웹 검색 통합 RAG (`rag/web-search/`)
- **WHAT**: 질문 유형에 따라 벡터 DB 또는 웹 검색을 자동 선택하는 2-소스 RAG 챗봇  
- **HOW**: LLM이 질문을 legal/web으로 분류 → 법률 질문은 ChromaDB, 최신 정보는 DuckDuckGo에서 검색 후 답변 생성  
- 구성: DuckDuckGo · ChromaDB · LangChain | `chatbot.py` (1개 파일)  

### 6.2 YouTube RAG (`rag/youtube-rag/`)
- **WHAT**: YouTube 자막을 벡터 DB에 인덱싱하고 영상 내용 기반으로 답변하는 챗봇  
- **HOW**: YouTubeSearchTool로 영상 검색 → YoutubeLoader로 자막 추출 (120초 청킹) → 타임스탬프 URL과 함께 답변  
- 구성: YouTubeSearchTool · YoutubeLoader · ChromaDB | `indexing.py + chatbot.py`  

### 6.3 Multi-source RAG (`rag/multi-source/`)
- **WHAT**: Query Router로 질문을 분석하여 벡터 DB + 웹 + YouTube 3개 소스 통합 검색  
- **HOW**: Pydantic 스키마 기반 Query Router가 소스 선택 + Query Rewriting 동시 수행 → 복수 소스 병렬 검색 → 종합 답변  
- 구성: Query Router (Pydantic) · YouTube Data API v3 | `chatbot.py` (1개 파일)  

### 6.4 Agentic RAG (`rag/agentic-rag/`)
- **WHAT**: LangGraph StateGraph 기반 에이전트가 검색 판단 → 검색 → 답변 → 평가를 자율 수행  
- **HOW**: 6개 노드 + 조건부 라우팅 워크플로우 → 답변 유용성 자체 평가 → 실패 시 Query Rewriting 후 재검색 (최대 2회)  
- 구성: LangGraph · Structured Output · 멀티턴 대화 | `agent.py` (1개 파일)  

## 7. Local LLM 이용하기

### 7.1 WHY
Cloud LLM 벤더 종속을 탈피하여 비용 증가, 네트워크 의존, 데이터 보안 위험, 모델 커스터마이징 한계를 극복.

필요 상황: 비용 민감, 저속/저품질/단절된 네트워크, 데이터 보안 중요, 도메인 특화 모델 파인 튜닝.

### 7.2 HOW

#### 런타임 & 모델 포맷

| 시나리오 | 런타임 | 권장 포맷 |
|----------|--------|-----------|
| 처음 시작 | Ollama | GGUF |
| 저사양/경량 | LlamaCpp | GPTQ |
| 연구/파인튜닝 | HuggingFace | SafeTensors |
| 프로덕션 | vLLM, TGI, Triton | AWQ |

#### LangChain 통합

런타임별 사용법:
```python
# Ollama
ChatOllama(model, ...)
# LlamaCpp
LlamaCpp(model_path, ...)
# HuggingFace
HuggingFacePipeline.from_model_id(model_id, ...)
```

통합 인터페이스: `init_chat_model("모델명", "런타임")`.

#### 성능 최적화 Top 3
1. **모델 선택**: 용도에 맞는 모델과 파라미터 규모  
2. **양자화**: vRAM에 맞는 양자화 모델 선택  
3. **GPU 레이어 오프로딩**: 일부 레이어만 GPU 로딩  

기타: 컨텍스트 윈도우 조정, 프롬프트 최적화, 청크 크기 및 검색 전략, 임베딩 모델 선택.

#### 양자화
- 목적: 더 적은 메모리 사용  
- 방법: 모델 가중치 값을 더 적은 bit로 표현  

#### 주요 Local LLM
- **범용**: Gemma3, Qwen3, Llama3, Phi-4  
- **특화**: 코딩 - Qwen3-coder, 추론 - DeepSeek-R1  
- **한국어**: EXAONE, Qwen3, SOLAR Pro, KULLM, A.X 4.0, Kanana  

#### 모니터링
- 응답시간: 요청~응답 지연  
- 처리량: 초당 처리 토큰 수  
- VRAM 사용률: `nvidia-smi` 명령 이용  
- 오류율: 실패 요청 비율  

#### 모델 다운로드 사이트
1. Hugging Face Hub  
2. TensorFlow Hub  
3. PyTorch Hub  
4. Model Zoo  
5. NVIDIA NGC  
6. Papers with Code  

## 8. Local LLM 실습

**On-Device Agentic RAG** | API 키 없이 완전 로컬 환경에서 동작하는 특허 전문 챗봇.

### 8.1 공통 준비
1. Ollama 설치 (ollama.com)  
2. 모델 다운로드: `gemma3:12b` + `nomic-embed-text`  
3. 가상환경 생성: `python -m venv venv`  
4. 의존성 설치: `pip install -r requirements.txt`  
5. 문서 인덱싱: `python indexing.py`  

### 8.2 실습 1. 콘솔 챗봇 (`local-llm`)

| 항목 | 내용 |
|------|------|
| 개요 | Ollama/`gemma3:12b` 기반 터미널 챗봇. LangGraph StateGraph로 에이전트 워크플로우 구성 |
| 기술 스택 | LLM: gemma3:12b, 임베딩: nomic-embed-text, 벡터 DB: ChromaDB, Agent: LangGraph StateGraph, 웹검색: DuckDuckGo, YouTube: scrapetube |
| 주요 기능 | 자동 소스 판단(legal/web/youtube), 소스별 질의어 최적화, 답변 유용성 평가 + Query Rewriting 재시도, 멀티턴 대화 |
| 실행 | `python indexing.py` → `python agent.py` |

### 8.3 실습 2. 웹 챗봇 (`local-llm-webchat`)

| 항목 | 내용 |
|------|------|
| 개요 | 콘솔 예제를 Streamlit 웹 UI로 확장. 4개 LLM 모델 실시간 선택 + 2-Stage Retrieval |
| 추가 스택 | UI: Streamlit, 임베딩: KaLM-Gemma3-12B (4-bit), Reranker: bge-reranker-v2-m3-ko (한국어 특화), YouTube: YoutubeLoader (자막+타임스탬프) |
| 확장 기능 | 모델 선택(gemma3:12b, gpt-oss:20b, deepseek-r1:8b, qwen3:8b), 2-Stage Retrieval: Bi-encoder(Top20) → Cross-encoder(Top5), 스트리밍 응답 + 사이드바 검색 결과 표시, GPU/CPU 자동 감지 + 웹 페이지 본문 정제 |
| 실행 | `python indexing.py` → `streamlit run chatbot.py` |

### 8.4 Agent 워크플로우
`check_retrieval`(검색 필요여부·소스 판단) → `search`(query_optimize, 벡터 DB+웹+YouTube) → `generate`(검색결과 기반 답변 생성) → `evaluate`(답변 유용성 평가) → `rewrite/END`(재시도 or 최종 답변).

> 주의: GPU 메모리 16GB 이상인 머신에서만 실습 가능.

## 9. GraphRAG 개요

### 9.1 WHY
질문-문서 간 유사도에만 의존하는 벡터 RAG의 한계를 넘어 정보 간 관계를 기반으로 멀티홉 추론과 거시적 통찰을 가능하게 함.

| 비교 | Vector RAG (유사도 기반 검색) | Graph RAG (관계 기반 검색) |
|------|-------------------------------|------------------------------|
| 방식 | 질문을 임베딩으로 변환 → 벡터 공간에서 유사 청크 검색 → 가장 가까운 문서 조각 반환 | 질문에서 엔티티·키워드 식별 → 지식 그래프에서 관계 탐색 → 연결된 엔티티와 관계를 함께 반환 |
| 한계/강점 | 단순 유사도 검색의 한계 | 멀티홉 추론 및 거시적 통찰 가능 |

> 예: 소크라테스-플라톤-아리스토텔레스의 사제 관계에서 아리스토텔레스의 할아버지 스승을 찾는 것이 멀티홉 추론. 세 철학자의 사상 비교가 거시적 통찰의 예임.

## 10. GraphRAG 인덱싱과 검색

### 10.1 인덱싱 단계
원본 문서 → Knowledge Graph + Vector DB 구축.
1. 텍스트 분할  
2. 엔티티 추출  
3. 관계 추출  
4. 지식 그래프 구축  
5. 벡터 임베딩  

### 10.2 검색 단계

| 모드 | 용도 | 단계 |
|------|------|------|
| Local Search | 특정 엔티티 중심 미시적 질문 | 1) 핵심 엔티티·키워드 식별 → 2) 벡터 검색으로 진입점 탐색 → 3) 그래프에서 관련 관계 확장 → 4) 컨텍스트 수집 → 답변 생성 |
| Global Search | 문서 전체를 조망하는 거시적 질문 | 1) 광범위 주제·테마 식별 → 2) 커뮤니티 요약 / High-level 키워드 사용 / Cypher 쿼리 집계 → 3) 컨텍스트 통합(탐색된 커뮤니티, 엔티티/관계 정보) → 4) 전체 조망 답변 생성 |
| Hybrid Search | 미시 + 거시 결합 복합 질문 | 1) 미시·거시적 요소 모두 식별 → 2) Local 검색 + Global 검색 병행 → 3) 세부+전체 맥락 결합 → 4) 통합 컨텍스트 기반 답변 |

### 10.3 Global Search 3방식

| # | 방식 | 설명 | 대표 도구 |
|---|------|------|-----------|
| 1 | 커뮤니티 요약 | 사전 생성된 커뮤니티 요약에서 질문 관련 커뮤니티 리포트 탐색 | MS GraphRAG, LlamaIndex |
| 2 | High-level 키워드 사용 | 질문에서 추출한 High-level(일반화/추상화한 키워드) 키워드로 검색 | LightRAG |
| 3 | Cypher 쿼리 집계 | KG(Knowledge Graph) 전체 집계와 패턴 매칭을 위한 Cypher 쿼리 작성 및 실행 | Neo4j |

> 사전 요약: MS GraphRAG, LlamaIndex는 엔티티를 커뮤니티로 그룹핑하고 커뮤니티 요약 생성.

## 11. GraphRAG 프레임워크

| 프레임워크 | 특징 | 인덱싱 | 검색 |
|------------|------|--------|------|
| **MS GraphRAG** | 거시적 통찰에 강점, 커뮤니티 계층적 요약 | 파켓(컬럼 기반 포맷) 파일로 저장, `graphrag index` 명령으로 간편 인덱싱 | Global 검색: 커뮤니티 요약만 이용 / Hybrid(DRIFT) 검색: Global 검색 결과의 follow-up 질문으로 Local 검색하여 결과 조합 |
| **LightRAG** | 빠르고 저렴, 듀얼 레벨 검색, 증분 업데이트 | JSON 파일 또는 Neo4j GraphDB 사용. 엔티티, 관계, 청크를 벡터 DB에 저장. 문서 ID 이용 증분 업데이트 지원 | 질문 키워드를 Low 레벨과 High 레벨로 추출하여 Local/Global 검색에 이용. Local/Global/Hybrid 외 Mix/Naïve/Bypass 검색 모드 제공 |
| **Neo4j 계열** | Neo4j 공식. Neo4j GraphRAG 원조 | Neo4j Graph DB 사용, 엔티티/관계 + 벡터 인덱스 저장 | Cypher 쿼리로 Graph 검색. Hybrid 검색: 벡터 검색으로 엔티티 찾고 관련 엔터티 확장 |
| **LangChain + Neo4j** | LangChain 생태계 통합, 유연한 Vector + Cypher 조합 | — | — |
| **LlamaIndex** | 유연한 스키마, 다양한 스토어, 사전 요약 내장 | PropertyGraph 기반 | 유연한 스키마 활용 |

### 11.1 선택 가이드

| 우선순위 | 권장 |
|----------|------|
| 글로벌 질문 품질 최우선 | MS GraphRAG |
| 비용 효율 + 빠른 처리 | LightRAG |
| LangChain 생태계 활용 | LangChain + Neo4j |
| Neo4j 공식 솔루션 선호 | Neo4j GraphRAG |
| LlamaIndex 기반 프로젝트 | LlamaIndex PropertyGraph |
| 오픈소스 필수 | MS GraphRAG, LightRAG, Neo4j 계열 |

> 검색 품질: GraphRAG 83.30 vs Vector RAG 44.45 (+38.86) — 동일 데이터셋, 9개 쿼리, 3회 반복, qwen3:8b-q4_K_M.

### 11.2 비용 최적화
- 고비용 작업(엔티티/관계 추출, 사전요약)에 Local LLM 사용  
- LightRAG: Gleaning 비활성화, 배치 인덱싱 활용, LLM/임베딩 병렬 처리  

### 11.3 성능 최적화
- Ollama 병렬 처리 + LLM 모델 양자화  
- MS GraphRAG: Gleaning(엔티티/관계 재추출) 비활성화, Entity Types 제한  
- Neo4j: 비동기 병렬, Entity Types 제한, 청크 축소  

## 12. GraphRAG 실습

공통: LLM Groq LPU (`openai/gpt-oss-20b`), Embedding Ollama qwen3-embedding (4096d), UI Streamlit, Data 교재·참고자료(md) + 예제코드(py).

### 12.1 MS GraphRAG (Microsoft GraphRAG 3.0)

| 항목 | 내용 |
|------|------|
| 스토리지 | LanceDB (로컬), Parquet 파일 |
| 인덱싱 | `graphrag index` CLI. 9단계 워크플로우(엔티티/관계 추출 → Leiden 커뮤니티 탐지 → 요약 리포트) |
| 검색 모드 | Basic (텍스트 유닛), Local (엔티티/관계+벡터), Global (Map-Reduce 커뮤니티), DRIFT (Local+Global 복합) |
| 주요 특징 | 커뮤니티 리포트 사전 생성, 커스텀 한국어 프롬프트, 인덱싱 검증/보정 도구, 하이브리드 쿼리 라우터 |

### 12.2 LightRAG (HKUDS)

| 항목 | 내용 |
|------|------|
| 스토리지 | NetworkX (GraphML), nano-vectordb (JSON) |
| 인덱싱 | `rag.ainsert()` 배치 삽입. KG + 벡터 동시 구축(청크 분할 → 엔티티/관계 추출 → 임베딩 → Graph/VDB 업데이트) |
| 검색 모드 | Naive (청크 유사도), Local (엔티티/관계 Low-level), Global (High-level 키워드 확장), Hybrid (Local+Global), Mix (Naive+Local+Global), Auto (패턴+LLM 자동 선택) |
| 주요 특징 | 6가지 검색 모드 지원, 증분 업데이트(insert), PROMPTS 오버라이드, LLM 응답 캐시 |

### 12.3 LangChain + Neo4j (Neo4j Community Docker)

| 항목 | 내용 |
|------|------|
| 스토리지 | Neo4j Graph DB, 이중 벡터 인덱스 |
| 인덱싱 | LLMGraphTransformer KG/Vector 이중 인덱싱 (교재→KG 구축, 코드→벡터, `strict_mode`로 엔티티 타입 제한) |
| 검색 모드 | Vector (엔티티+코드 유사도), Graph QA (Cypher 자동 생성), Hybrid (Vector+Graph 결합), Cypher Direct (직접 쿼리) |
| 주요 특징 | 소스별 분리 인덱싱 전략, Cypher 자동 생성/직접 실행, Neo4j Browser 시각화, 패턴+LLM 쿼리 라우터 |

## 13. [별첨] 웹 검색 + YouTube

### 13.1 DuckDuckGo (무료·대표 웹 검색 도구)

#### 주요 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| region | wt-wt | 검색 지역 (ko-kr, us-en, jp-jp 등) |
| time | None | 시간 필터 (d:하루, w:주, m:월, y:년) |
| max_results | 10 | 반환할 최대 결과 수 |
| source | text | 검색 소스 유형 (text, news, images) |

#### 결과 구조

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `DuckDuckGoSearchRun.invoke()` | str | 내용 요약 텍스트 | X |
| `DuckDuckGoSearchRun.run()` | str | 내용 요약 텍스트 | X |
| `DuckDuckGoSearchAPIWrapper.run()` | str | 내용 요약 텍스트 | X |
| `DuckDuckGoSearchAPIWrapper.results()` | List[dict] | title + 요약 + link | O |
| `DuckDuckGoSearchResults.invoke()` | str | 구조화 텍스트 (제목+요약+링크) | O |

### 13.2 Tavily Search (대표 검색 도구·AI 답변 포함)

#### 주요 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| max_results | 10 | 반환할 최대 결과 수 |
| search_depth | basic | 검색 깊이 (basic / advanced) |
| topic | general | 검색 주제 유형 (general / news) |
| include_answer | False | AI 생성 요약 답변 포함 여부 |
| include_images | False | 검색 결과와 함께 관련 이미지 URL 리스트 포함 여부 |
| include_domains | None | 특정 도메인 검색 (화이트 리스트) |
| exclude_domains | None | 특정 도메인 제외 (블랙 리스트) |

#### 결과 구조

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `TavilySearch.invoke()` | str | AI 답변 + 검색 결과 (제목+내용 요약+URL) | O |
| `TavilySearch.run()` | str | AI 답변 + 검색 결과 (제목+내용 요약+URL) | O |
| `TavilySearchAPIRetriever` | list | Document 객체 리스트 (URL 포함) | O |
| `TavilyClient.search()` | dict | JSON(query, answer, results 배열). 직접 검색 | O |

### 13.3 Google Serper (구글 검색 전용)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| k | 10 | 반환할 결과 수 |
| gl | us | 검색 지역 (kr, us, jp 등) |
| hl | en | 검색 언어 (ko, en, ja 등) |
| type | search | 검색 타입 (search, news, images) |

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `GoogleSerperAPIWrapper.run()` | str | 내용 요약 텍스트 | X |
| `GoogleSerperAPIWrapper.results()` | dict | organic, knowledgeGraph 등 JSON | O |

### 13.4 SerpAPI (멀티 검색 엔진)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| engine | google | 검색 엔진 (google, bing, yahoo 등) |
| num | 10 | 반환할 결과 수 |
| location | None | 검색 위치 (예: South Korea) |
| google_domain | None | Google 도메인 (예: google.co.kr) |

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `SerpAPIWrapper.run()` | str | 내용 요약 텍스트 | X |
| `SerpAPIWrapper.results()` | dict | organic_results, answer_box 등 JSON | O |

### 13.5 YouTube Data API (유료·공식 API)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| q | (필수) | 검색 쿼리 |
| part | 없음 | 반환 정보 (snippet, id, statistics) |
| maxResults | 5 | 최대 결과 수 (1~50) |
| order | relevance | 정렬 기준 (relevance, date, viewCount) |
| publishedAfter | None | 이 날짜 이후 업로드 영상만 |
| relevanceLanguage | None | 우선 언어 (ko, en 등) |

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `youtube.search()` | dict | items 배열 (videoId, snippet) | O |

### 13.6 YouTubeSearchTool (무료·웹스크래핑)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| 검색 쿼리 | (필수) | "검색어" 또는 "검색어,개수" 형식 |
| max_results | 2 | 반환 결과 수 (쿼리에서 지정 가능) |

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `YouTubeSearchTool.run()` | str | URL 리스트 (문자열) | X |
| `youtube_search` 직접 | list | title, duration, views, url | O |
| `scraptube` | dict | 풍부 (조회수, 업로드일 등) | O |

### 13.7 YouTubeLoader (무료·자막 추출 전용)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| youtube_url | (필수) | YouTube 영상 URL |
| add_video_info | False | 제목, 조회수 등 메타데이터 포함 |
| language | ["en"] | 자막 언어 우선순위 |
| translation | None | 자막 번역 언어 (예: ko) |
| transcript_format | TEXT | 자막 형식 (TEXT / CHUNKS) |
| chunk_size_seconds | None | 청크 분할 시간 (초 단위) |

| 클래스/메서드 | 반환 | 설명 | 링크 |
|----------------|------|------|------|
| `Loader.load()` | list | Document (자막 텍스트 + 메타데이터) | O |
