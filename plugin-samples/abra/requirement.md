# 요구사항 정의서

## 기본 정보
- 플러그인명: abra
- 목적: 자연어로 비즈니스 시나리오를 입력하면 Dify 워크플로우 DSL 생성 → 프로토타이핑 →
  개발계획서 → AI Agent 개발까지 전 과정을 자동화
- 대상 도메인: AI Agent 개발 자동화 (Dify 워크플로우 기반)
- 대상 사용자: AI Agent 개발자, 비즈니스 기획자

## 핵심기능
- Dify 환경 구축: Docker Compose로 로컬 Dify 환경 자동 구축 및 설정
- 시나리오 생성: 서비스 목적을 입력하면 다양한 관점(업무자동화, 고객경험, 비용절감 등)의
  요구사항 시나리오 N개를 자동 생성하고 사용자가 선택
- DSL 자동생성: 선택된 시나리오를 기반으로 Dify Workflow DSL(YAML) 자동 생성 및
  문법·구조 사전 검증
- 프로토타이핑: 생성된 DSL을 Dify에 자동 Import → Publish → Run하여 프로토타이핑 수행.
  에러 발생 시 DSL 수정 → 재검증 → 재시도 루프 자동 실행
- 개발계획서 작성: 검증된 DSL과 시나리오를 기반으로 기술스택, 아키텍처, 모듈 설계,
  테스트 전략을 포함한 개발계획서 자동 생성
- AI Agent 개발: 개발계획서에 따라 Dify 런타임 활용(Option A) 또는
  코드 기반 전환(Option B) 방식으로 AI Agent 구현

## 에이전트 구성 힌트
- 시나리오 분석가: 비즈니스 요구사항을 구조화된 시나리오 문서로 변환하는 분석 전문가
- DSL 설계자: 시나리오를 Dify Workflow DSL(YAML)로 변환하는 워크플로우 아키텍트
- 프로토타이핑 실행자: DSL을 Dify에 배포·실행하여 검증하는 프로토타이핑 전문가
- 개발계획서 작성자: DSL과 요구사항을 기반으로 개발계획서를 작성하는 기술 문서 전문가
- Agent 개발자: 개발계획서에 따라 프로덕션 코드를 구현하는 개발 전문가

## 사용자 플로우
- Step 1. 시나리오 생성: 서비스 목적과 생성 갯수를 입력하면 N개의 요구사항 시나리오를
  자동 생성하고, 비교표를 제시하여 사용자가 하나를 선택
- Step 2. DSL 자동생성: 선택된 시나리오를 기반으로 Dify Workflow DSL(YAML) 자동 생성.
  노드 설계, 엣지 연결, 변수 설정, 프롬프트 템플릿 작성 후 문법·구조 사전 검증
- Step 3. 프로토타이핑: DSL을 Dify에 Import → Publish → Run하여 동작 검증.
  에러 시 DSL 수정 → 재검증 → 재시도 루프 자동 실행. 성공 시 Export로 검증된 DSL 확보
- Step 4. 개발계획서 작성: 검증된 DSL과 시나리오를 기반으로 기술스택, 아키텍처,
  모듈 설계, 테스트 전략, 배포 계획을 포함한 개발계획서 생성
- Step 5. AI Agent 개발: 사용자가 개발 방식 선택 후 구현.
  Option A(Dify 런타임 활용): DSL Import → 환경 설정 → 배포 → API 테스트.
  Option B(코드 기반 전환): DSL을 참조하여 LangChain/LangGraph 등으로 구현

## 기술 환경
- Dify 접속 환경: 로컬 Docker (Docker Compose 기반)
- 산출물 저장 위치: 플러그인 내 `output/` 디렉토리
- 기존 자산: `samples/abra/` 참고만 (처음부터 새로 개발)

## 참고 공유 자원
- 참고 가이드:
  - dify-workflow-dsl-guide (Dify Workflow DSL 작성 가이드)
- 참고 템플릿:
  - dsl-generation-prompt (요구사항 기반 Dify DSL 생성 표준 프롬프트)
  - develop-plan-generate (Dify DSL 기반 Agent 개발 계획서 생성 프롬프트)
  - develop (개발 계획서 기반 Agent 개발 프롬프트)
  - requirement-generater (AI 에이전트 요구사항 자동 생성 프롬프트)
- 참고 도구:
  - dify_cli (Dify API 클라이언트 — DSL import/export, workflow publish/run)
  - validate_dsl (Dify DSL YAML 구조 검증 도구)
