# DMAP 빌더 플러그인 비교 분석 보고서

- [DMAP 빌더 플러그인 비교 분석 보고서](#dmap-빌더-플러그인-비교-분석-보고서)
  - [개요](#개요)
  - [DMAP 핵심 특성 요약](#dmap-핵심-특성-요약)
  - [가장 유사한 시스템 (유사도 ★★★★★)](#가장-유사한-시스템-유사도-)
    - [Open Agent Specification](#open-agent-specification)
    - [Claude Code Plugins](#claude-code-plugins)
    - [oh-my-claudecode](#oh-my-claudecode)
  - [코드 기반 에이전트 프레임워크 (유사도 ★★★)](#코드-기반-에이전트-프레임워크-유사도--1)
    - [CrewAI](#crewai)
    - [AutoGen](#autogen)
    - [LangGraph](#langgraph)
    - [OpenAI Agents SDK (구 Swarm)](#openai-agents-sdk-구-swarm)
    - [Microsoft Semantic Kernel](#microsoft-semantic-kernel)
  - [선언형 에이전트 시스템 (유사도 ★★★★)](#선언형-에이전트-시스템-유사도--2)
    - [Hector](#hector)
    - [Microsoft 365 Declarative Agents](#microsoft-365-declarative-agents)
    - [AWS Bedrock AgentCore](#aws-bedrock-agentcore)
  - [No-Code / Low-Code 플랫폼 (유사도 ★★~★★★)](#no-code--low-code-플랫폼-유사도--3)
    - [Dify](#dify)
    - [LangFlow](#langflow)
    - [Flowise](#flowise)
    - [n8n](#n8n)
  - [클라우드 플랫폼 (유사도 ★★★~★★★★)](#클라우드-플랫폼-유사도--4)
    - [Google Vertex AI Agent Builder](#google-vertex-ai-agent-builder)
    - [Databricks AI Agents](#databricks-ai-agents)
  - [핵심 비교 매트릭스](#핵심-비교-매트릭스)
  - [DMAP의 독특한 강점](#dmap의-독특한-강점)
  - [DMAP 포지셔닝](#dmap-포지셔닝)
  - [발표 시 권장 비교 대상](#발표-시-권장-비교-대상)
  - [참고 자료](#참고-자료)

---

## 개요

본 문서는 DMAP(Declarative Multi-Agent Plugin) 빌더가 생성하는 플러그인과
비교 가능한 유명 AI 에이전트 프레임워크, 플러그인 시스템, 멀티에이전트 오케스트레이션 플랫폼을
조사·분석한 결과임.

- **조사 기준일**: 2026-02-09
- **분류 기준**: 유사도(★ 1~5), 타입, 선언형 여부, 오픈소스 여부

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## DMAP 핵심 특성 요약

비교의 기준이 되는 DMAP의 핵심 특성:

| 특성 | 설명 |
|------|------|
| **선언형 정의** | Markdown + YAML로 에이전트·스킬·게이트웨이를 코드 없이 정의 |
| **런타임 중립** | 추상 선언 → Gateway의 runtime-mapping.yaml이 구체 구현으로 변환 |
| **Clean Architecture** | Skills → Agents → Gateway 단방향 5-Layer 구조 |
| **4-Tier 모델 라우팅** | LOW/MEDIUM/HIGH/HEAVY 티어별 자동 모델 매핑 |
| **프롬프트 조립 파이프라인** | 공통 정적 → 에이전트별 정적 → 동적 (캐시 적중률 최적화) |
| **플러그인 패키징** | 마켓플레이스 배포, 네임스페이스(FQN), 슬래시 명령 |
| **비개발자 접근성** | 코딩 없이 도메인 전문가도 에이전트 시스템 구축 가능 |
| **Git 친화적** | 텍스트 파일 기반으로 버전관리·코드리뷰·CI/CD 자연 통합 |

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 가장 유사한 시스템 (유사도 ★★★★★)

### Open Agent Specification

- **개발사**: 커뮤니티 (prime-vector)
- **GitHub**: [prime-vector/open-agent-spec](https://github.com/prime-vector/open-agent-spec)
- **오픈소스**: O
- **핵심 특징**:
  - 프레임워크 비종속적 에이전트 정의 언어
  - JSON/YAML 직렬화, JSON Schema 강타입
  - 제어 흐름과 데이터 흐름 명확 분리
  - 모듈형 컴포넌트 추상화
- **DMAP과 비교**:
  - **유사점**: 선언형 YAML 기반, 프레임워크 비종속적 추상화
  - **차이점**: Agent Spec은 표준 스펙일 뿐, DMAP은 게이트웨이(런타임 매핑, 티어 매핑)와
    스킬 시스템까지 포함한 **실행 가능한** 플러그인 시스템

### Claude Code Plugins

- **개발사**: Anthropic
- **참고**: [Claude Code Plugins](https://www.anthropic.com/news/claude-code-plugins)
- **오픈소스**: O (플러그인 시스템)
- **핵심 특징**:
  - 슬래시 커맨드, 서브에이전트, MCP 서버, 훅으로 구성
  - MCP(Model Context Protocol) 통합으로 외부 도구/데이터 소스 연결
  - 플러그인 동적 설치/비활성화
- **DMAP과 비교**:
  - **유사점**: 플러그인 패키징, 서브에이전트, 외부 도구 통합, 마켓플레이스
  - **차이점**: Claude Code는 IDE 종속적, DMAP은 플랫폼 비종속적.
    DMAP의 게이트웨이 런타임 매핑이 더 명시적

### oh-my-claudecode

- **개발사**: 커뮤니티
- **오픈소스**: O
- **핵심 특징**:
  - Claude Code용 멀티에이전트 오케스트레이션
  - 32개 전문 에이전트 (architect, executor, designer 등)
  - 스킬 시스템 (autopilot, ralph, ultrawork 등)
  - 티어 기반 모델 라우팅 (HEAVY/HIGH/MEDIUM/LOW)
- **DMAP과 비교**:
  - **유사점**: 멀티에이전트, 스킬 시스템, 티어 기반 라우팅
  - **차이점**: oh-my-claudecode는 Claude Code 전용이며 코드 기반,
    DMAP은 플랫폼 비종속적 선언형 표준

> **DMAP 차별점**: 이 3개의 장점을 결합 — 선언형 표준 + 플러그인 아키텍처 + 멀티에이전트 오케스트레이션

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 코드 기반 에이전트 프레임워크 (유사도 ★★★)

### CrewAI

- **개발사**: CrewAI Inc.
- **GitHub Stars**: 43.6k+
- **오픈소스**: O
- **인기도**: Series A $18M 펀딩, 일 10만 건 이상 에이전트 실행
- **핵심 특징**:
  - 역할 기반 에이전트 모델 (직원처럼 특정 책임)
  - 비즈니스 워크플로우 패턴 기본 지원
  - 직관적 에이전트 협업 조율
- **비교**:
  - 유사: 역할 기반 에이전트, 멀티에이전트 협업
  - 차이: Python 코드 필수, DMAP의 agentcard.yaml이 역할/정체성을 더 명시적으로 분리

### AutoGen

- **개발사**: Microsoft
- **GitHub Stars**: 43.6k+
- **월간 다운로드**: 250,000+
- **오픈소스**: O
- **핵심 특징**:
  - 대화 기반 에이전트 워크플로우
  - 비동기 이벤트 루프, 확장성 중심
  - 400% 전년 대비 성장률
- **비교**:
  - 유사: 멀티에이전트, 에이전트 간 핸드오프
  - 차이: 대화 중심 vs DMAP의 워크플로우 중심. DMAP의 스킬 시스템이 더 구조적

### LangGraph

- **개발사**: LangChain AI
- **GitHub Stars**: 24.5k+
- **오픈소스**: O
- **핵심 특징**:
  - 그래프 기반 워크플로우 오케스트레이션
  - 노드·엣지로 워크플로우 시각적 표현
  - 상태 관리, 순환 그래프 지원
  - 400개 이상 기업 프로덕션 사용
- **비교**:
  - 유사: 워크플로우 기반 멀티에이전트 조율
  - 차이: Python 코드 중심, DMAP의 런타임 매핑과 티어 기반 라우팅이 더 추상화

### OpenAI Agents SDK (구 Swarm)

- **개발사**: OpenAI
- **GitHub Stars**: 9k+ (Agents SDK, 2025.3 출시)
- **오픈소스**: 교육용 (Swarm) → 프로덕션 (Agents SDK)
- **핵심 특징**:
  - 경량 멀티에이전트 오케스트레이션
  - 에이전트와 핸드오프를 핵심 추상화로 사용
- **비교**:
  - 유사: 에이전트 핸드오프, 경량 오케스트레이션
  - 차이: 코드 기반, 게이트웨이 개념 없음

### Microsoft Semantic Kernel

- **개발사**: Microsoft
- **오픈소스**: O
- **핵심 특징**:
  - 경량, 모델 비종속적 SDK
  - AutoGen + Semantic Kernel → Microsoft Agent Framework로 진화
  - .NET 생태계 강력 통합
  - 1,400개 이상 비즈니스 시스템 연결
- **비교**:
  - 유사: 플러그인 시스템, 에이전트 오케스트레이션
  - 차이: .NET/Python 코드 우선, DMAP의 런타임 매핑이 더 명시적

> **DMAP 차별점**: 이 프레임워크들은 모두 **Python/코드**로 에이전트를 정의하지만,
> DMAP은 **Markdown + YAML만으로** 정의 → 비개발자도 접근 가능

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 선언형 에이전트 시스템 (유사도 ★★★★)

### Hector

- **개발사**: 커뮤니티 (kadirpekel)
- **GitHub**: [kadirpekel/hector](https://github.com/kadirpekel/hector)
- **오픈소스**: O
- **핵심 특징**:
  - A2A(Agent-to-Agent) 네이티브 선언형 플랫폼
  - YAML 기반 에이전트 정의
  - LLM 엔진과 도구 설정
- **비교**:
  - 유사: YAML 선언형, 에이전트 간 협업
  - 차이: 실험적 수준, DMAP은 마켓플레이스와 리소스 카탈로그까지 포함

### Microsoft 365 Declarative Agents

- **개발사**: Microsoft
- **오픈소스**: X (Microsoft 365 전용)
- **핵심 특징**:
  - JSON 기반 에이전트 정의
  - API 플러그인은 OpenAPI(JSON/YAML) 활용
  - TypeSpec으로 에이전트 스펙 작성
- **비교**:
  - 유사: 선언형 JSON/YAML 설정, 플러그인 시스템
  - 차이: Microsoft 365 전용(벤더 종속), DMAP의 프롬프트 조립 파이프라인이 더 정교

### AWS Bedrock AgentCore

- **개발사**: Amazon Web Services
- **오픈소스**: X (클라우드 서비스)
- **핵심 특징**:
  - CloudFormation으로 AI 에이전트 구축
  - 선언형 인프라(IaC)
  - Terraform/Terragrunt 지원
- **비교**:
  - 유사: 선언형 정의 (CloudFormation YAML)
  - 차이: AWS 종속, 인프라 중심. DMAP은 에이전트 로직과 워크플로우에 초점

> **DMAP 차별점**: 선언형이면서 **플랫폼 비종속적** + **런타임 매핑으로 이식성** 확보

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## No-Code / Low-Code 플랫폼 (유사도 ★★~★★★)

### Dify

- **개발사**: Dify.ai
- **GitHub Stars**: 58,000+
- **오픈소스**: O
- **핵심 특징**:
  - 올인원 LLMOps 플랫폼
  - 워크플로우, 에이전트, RAG 기본 제공
  - GUI 빌더, 셀프 호스팅 가능
  - SOC 2, ISO 27001:2022, GDPR 준수
- **비교**:
  - 유사: 워크플로우 기반, 에이전트 오케스트레이션
  - 차이: GUI 종속, Git 버전관리 어려움. DMAP은 텍스트 기반으로 Git 친화적

### LangFlow

- **개발사**: Datastax (인수)
- **GitHub Stars**: 42,000+
- **오픈소스**: O
- **핵심 특징**:
  - LangChain 기반 비주얼 디버깅
  - 조합 가능한 그래프 빌딩
  - Loop 컴포넌트 지원 (2025.2 베타)
- **비교**:
  - 유사: 그래프 기반 워크플로우
  - 차이: GUI 중심, DMAP의 스킬 부스팅과 계층적 구조가 더 정교

### Flowise

- **개발사**: FlowiseAI
- **GitHub Stars**: ~30,000
- **오픈소스**: O
- **핵심 특징**:
  - 경량, 드래그 앤 드롭 UI
  - LangChain 기반 비주얼 빌더
  - 빠른 프로토타이핑 최적화
- **비교**:
  - 유사: 빠른 에이전트 구축
  - 차이: 완전 노코드 GUI, DMAP은 텍스트 선언형으로 버전 관리 용이

### n8n

- **개발사**: n8n
- **오픈소스**: O
- **핵심 특징**:
  - 워크플로우 자동화 플랫폼 (400+ 통합)
  - 드래그 앤 드롭 + 고급 커스터마이징
  - 에이전트 결정을 실제 액션으로 전환
- **비교**:
  - 유사: 워크플로우 자동화, 외부 도구 통합
  - 차이: AI 전용이 아닌 범용 자동화 도구

> **DMAP 차별점**: 텍스트 파일 기반이라 **Git 버전관리, 코드리뷰, CI/CD**에 자연 통합

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 클라우드 플랫폼 (유사도 ★★★~★★★★)

### Google Vertex AI Agent Builder

- **개발사**: Google Cloud
- **오픈소스**: X (클라우드 서비스, ADK는 오픈소스)
- **핵심 특징**:
  - 에이전트 개발·확장·거버넌스 전체 라이프사이클
  - Agent Development Kit (ADK): 오픈소스 멀티에이전트 프레임워크
  - Agent Designer: 로우코드 비주얼 디자이너
  - Agent Garden: 샘플 에이전트 및 도구 라이브러리
- **비교**:
  - 유사: 에이전트 라이프사이클 관리, 도구 라이브러리/마켓플레이스
  - 차이: Google Cloud 종속, DMAP의 선언형 접근이 더 경량

### Databricks AI Agents

- **개발사**: Databricks
- **오픈소스**: X (클라우드 서비스)
- **핵심 특징**:
  - MCP(Model Context Protocol) 카탈로그
  - 중앙화된 도구 검색·액세스 제어·감사
  - 엔터프라이즈 거버넌스
- **비교**:
  - 유사: 도구 마켓플레이스/카탈로그, 거버넌스
  - 차이: Databricks 종속, DMAP은 독립 실행 가능

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 핵심 비교 매트릭스

| 특성 | DMAP | CrewAI | LangGraph | Dify | Open Agent Spec | Claude Code Plugins |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **선언형 정의** | O (MD+YAML) | X (Python) | X (Python) | 부분 (DSL) | O (YAML/JSON) | 부분 |
| **비개발자 접근** | O | X | X | O (GUI) | O | X |
| **런타임 중립** | O | X | X | X | O | X |
| **4-Tier 모델 라우팅** | O | X | X | X | X | X |
| **플러그인 패키징** | O | X | X | X | X | O |
| **마켓플레이스** | O | X | X | O | X | O |
| **Git 친화적** | O | O | O | X | O | O |
| **프롬프트 캐싱 최적화** | O | X | X | X | X | X |
| **오픈소스** | O | O | O | O | O | O |
| **GitHub Stars** | - | 43.6k+ | 24.5k+ | 58k+ | - | - |

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## DMAP의 독특한 강점

1. **완전 선언형 정의**
   YAML + Markdown로 에이전트·스킬·게이트웨이를 코드 없이 정의
   (Open Agent Spec, Hector와 유사하지만 더 포괄적)

2. **플러그인 아키텍처**
   패키징·배포·마켓플레이스 개념
   (Claude Code Plugins와 유사하지만 플랫폼 비종속적)

3. **런타임 매핑**
   Abstract 도구 → Concrete 도구 매핑, 티어 기반 모델 라우팅
   (다른 시스템에서 찾기 어려운 독특한 접근)

4. **계층적 구조**
   에이전트 → 스킬 → 워크플로우의 명확한 관심사 분리
   (CrewAI, LangGraph보다 더 구조화)

5. **프롬프트 조립 파이프라인**
   정적(공통 + 에이전트별) + 동적(작업 지시) 단계별 조립
   (프롬프트 캐싱 최적화를 위한 독특한 설계)

6. **리소스 마켓플레이스**
   가이드, 템플릿, 샘플, 도구의 체계적 분류
   (Vertex AI Agent Garden과 유사하지만 더 세분화)

7. **스킬 부스팅**
   다른 스킬을 자동 호출하는 메타 오케스트레이션
   (oh-my-claudecode와 유사한 접근)

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## DMAP 포지셔닝

DMAP은 기존 시스템들의 교차점에 위치하는 독특한 조합:

```
Open Agent Spec의 '선언형 표준'
    + CrewAI의 '역할 기반 멀티에이전트'
    + Claude Code Plugins의 '플러그인 아키텍처'
    + Vertex AI의 '에이전트 라이프사이클 관리'
    = DMAP (선언형 멀티에이전트 플러그인)
```

2025~2026년 현재, 완전히 선언형이면서도 프로덕션급 멀티에이전트 플러그인 시스템을
제공하는 유사 시스템은 거의 없음.
DMAP은 **코드 없는 에이전트 정의 + 플러그인 마켓플레이스 + 런타임 매핑**의
독특한 조합으로 차별화됨.

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 발표 시 권장 비교 대상

| 순위 | 시스템 | 추천 이유 | 대비 효과 |
|:---:|--------|-----------|-----------|
| 1 | **CrewAI** | 인지도 최고 (43k+ stars), 역할 기반 에이전트 | "코드 vs 선언형" |
| 2 | **Open Agent Spec** | 학술적 유사성 최고, 선언형 표준 | "표준 vs 실행 가능한 시스템" |
| 3 | **Dify** | 대중적 인지도 (58k+ stars), No-Code 대표 | "GUI vs 텍스트 선언형" |

[Top](#dmap-빌더-플러그인-비교-분석-보고서)

---

## 참고 자료

### AI 에이전트 프레임워크
- [A Detailed Comparison of Top 6 AI Agent Frameworks in 2025](https://www.turing.com/resources/ai-agent-frameworks)
- [Best AI Agent Frameworks 2025](https://www.getmaxim.ai/articles/top-5-ai-agent-frameworks-in-2025-a-practical-guide-for-ai-builders/)
- [CrewAI vs LangGraph vs AutoGen](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen)
- [AutoGen vs LangChain vs CrewAI](https://www.instinctools.com/blog/autogen-vs-langchain-vs-crewai/)

### 선언형 시스템
- [Open Agent Specification Technical Report](https://arxiv.org/html/2510.04173v1)
- [GitHub - prime-vector/open-agent-spec](https://github.com/prime-vector/open-agent-spec)
- [GitHub - kadirpekel/hector](https://github.com/kadirpekel/hector)
- [Building Declarative Agents with Plugins](https://nanddeepnachanblogs.com/posts/2025-01-14-declarative-agents-plugins/)
- [AI Agents Made Easy with YAML](https://dimitaronai.com/ai-agents-made-easy-with-yaml)

### 멀티에이전트 오케스트레이션
- [GitHub - openai/swarm](https://github.com/openai/swarm)
- [Multi-Agent Orchestration with OpenAI Swarm](https://www.akira.ai/blog/multi-agent-orchestration-with-openai-swarm)
- [Semantic Kernel Agent Framework](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/)

### No-Code/Low-Code 플랫폼
- [Dify Review 2025](https://skywork.ai/blog/dify-review-2025-workflows-agents-rag-ai-apps/)
- [12 Best Dify Alternatives](https://sider.ai/blog/ai-tools/best-dify-alternatives-for-building-ai-apps-and-agents-in-2025)
- [Agentic AI Orchestration Comparison](https://medium.com/@gaddam.rahul.kumar/agentic-ai-orchestration-for-full-stack-developers-comparing-autogen-crewai-langflow-flowise-e0f917e3cd4e)

### Claude Code 생태계
- [Claude Code Plugins](https://www.anthropic.com/news/claude-code-plugins)
- [Awesome Claude Code Plugins](https://github.com/ccplugins/awesome-claude-code-plugins)
- [50+ Best MCP Servers for Claude Code](https://claudefa.st/blog/tools/mcp-extensions/best-addons)

### 클라우드 플랫폼
- [Vertex AI Agent Builder](https://cloud.google.com/products/agent-builder)
- [AWS Bedrock AgentCore with CloudFormation](https://aws.amazon.com/blogs/machine-learning/build-ai-agents-with-amazon-bedrock-agentcore-using-aws-cloudformation/)
- [Building Trusted AI Agents - Databricks](https://www.databricks.com/blog/building-trusted-ai-agents-new-capabilities-choose-govern-and-scale-confidence)

### GitHub 리포지토리
- [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) — 24.5k+ stars
- [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) — 43.6k+ stars
- [microsoft/semantic-kernel](https://github.com/microsoft/semantic-kernel)
- [deepset-ai/haystack](https://github.com/deepset-ai/haystack)

[Top](#dmap-빌더-플러그인-비교-분석-보고서)
