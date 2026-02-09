---
name: agent-developer
description: 개발계획서 기반 AI Agent 프로덕션 코드 구현
---

# Agent Developer

## 목표

개발계획서와 검증된 DSL을 기반으로 AI Agent를 프로덕션 환경에 배포 가능한 코드로 구현함.
Option A(Dify 런타임 활용) 또는 Option B(코드 기반 전환) 방식으로 구현하며,
빌드 성공, 테스트 통과, 에러 핸들링, 보안 요구사항을 모두 충족하는 산출물을 생성함.

## 참조

- 첨부된 `agentcard.yaml`을 참조하여 역할, 역량, 제약, 핸드오프 조건을 준수할 것
- 첨부된 `tools.yaml`을 참조하여 사용 가능한 도구와 입출력을 확인할 것
- `references/develop.md` 프롬프트 템플릿을 활용하여 개발 흐름 구성

## 워크플로우

### 1. 입력 파일 로드

{tool:file_read}로 다음 파일들을 읽어 전체 맥락 파악:
- 개발계획서 (`dev-plan.md`)
- 검증된 DSL (`{app-name}.dsl.yaml`)
- 시나리오 문서 (`scenario.md`)
- `references/develop.md` 템플릿

### 2. 개발 방식 분기

개발계획서의 기술스택과 배포 환경을 기반으로 구현 방식 결정:

**Option A: Dify 런타임 활용**
- DSL을 Dify에 Import → 환경 설정(API Key 등) → Publish → API 테스트
- {tool:dify_dsl_management}로 import 수행
- {tool:dify_workflow_management}로 publish 및 run 수행
- 산출물: Dify 앱 배포 완료 + API 엔드포인트 정보

**Option B: 코드 기반 전환**
- DSL 구조를 참조하여 LangChain/LangGraph/기타 프레임워크로 구현
- {tool:file_write}로 프로덕션 코드 생성
- {tool:code_execute}로 의존성 설치 및 빌드 실행
- 산출물: 독립 실행 가능한 코드 + 테스트 + README

### 3. 프로덕션 코드 구현 (Option B의 경우)

#### 3.1 기술스택 준수
- 개발계획서의 기술스택, 아키텍처, 모듈 설계 준수
- 기존 패턴과 일관성 유지
- {tool:code_search}로 기존 구현 패턴 파악

#### 3.2 코드 생성
- 노드별 모듈 구현 (LLM 호출, 도구 연동, 조건 분기, 상태 관리)
- 엣지 흐름에 따른 데이터 파이프라인 구현
- 변수/파라미터 처리 로직 구현
- {tool:file_write}로 소스 파일 생성

#### 3.3 에러 핸들링 및 보안
- 예외 처리 구현 (API 실패, 타임아웃, 데이터 검증)
- 입력 검증 및 보안 요구사항 반영
- 로깅 및 모니터링 코드 추가

#### 3.4 테스트 코드 작성
- 단위 테스트 작성 (각 노드별 테스트)
- 통합 테스트 작성 (전체 워크플로우 테스트)
- {tool:file_write}로 테스트 파일 생성

### 4. 빌드 및 검증

#### 4.1 코드 진단
- {tool:code_diagnostics}로 파일별 오류·경고 조회
- 타입 체크, 문법 오류, 미사용 변수 등 확인

#### 4.2 빌드 실행
- {tool:code_execute}로 빌드 명령 실행
- 빌드 실패 시 에러 원인 분석 → 코드 수정 → 재빌드

#### 4.3 테스트 실행
- {tool:code_execute}로 테스트 실행
- 테스트 실패 시 원인 분석 → 코드 수정 → 재테스트

### 5. 배포 설정 (필요 시)

개발계획서의 배포 환경에 따라:
- Docker: Dockerfile, docker-compose.yml 생성
- K8s: deployment.yaml, service.yaml 생성
- 서버리스: serverless.yml 또는 함수 설정 파일 생성

### 6. 문서 작성

README.md 작성:
- 아키텍처 다이어그램
- 디렉토리 구조
- 소스 코드 설명 (주요 함수, 처리 흐름)
- 가상환경 설정 및 실행 방법
- API 엔드포인트 정보 (Option A) 또는 실행 방법 (Option B)

## 출력 형식

### Option A 산출물
1. **Dify 앱 정보**: 앱 ID, 앱 이름, API 엔드포인트
2. **환경 설정**: 필요한 환경 변수, API Key 설정 방법
3. **API 테스트 결과**: 샘플 입력/출력
4. **README.md**: 앱 사용법, API 호출 예시

### Option B 산출물
1. **프로덕션 코드**: 실행 가능한 전체 소스 코드
2. **테스트 코드**: 단위·통합 테스트 전체
3. **배포 설정**: Docker/K8s/서버리스 설정 파일
4. **README.md**: 설치·실행 방법, 아키텍처 설명
5. **빌드 결과**: 빌드 성공 로그, 테스트 통과 결과

## 검증

완료 전 다음 사항을 반드시 확인:

### Option A 검증
- [ ] Dify 앱 import 성공
- [ ] 환경 변수 설정 완료
- [ ] publish 성공
- [ ] API 호출 테스트 통과 (샘플 입력으로 정상 응답 확인)

### Option B 검증
- [ ] 모든 파일에 {tool:code_diagnostics} 통과 (에러 0)
- [ ] 빌드 성공 (컴파일/트랜스파일 에러 없음)
- [ ] 모든 테스트 통과
- [ ] README.md 필수 섹션 포함 (아키텍처, 디렉토리 구조, 실행 방법)
- [ ] 개발계획서의 기술스택·아키텍처와 일치

### 공통 검증
- [ ] 개발계획서 범위 외 기능 구현하지 않음
- [ ] DSL 원본 수정하지 않음 (읽기 전용)
- [ ] 에러 핸들링 구현 완료
- [ ] 보안 요구사항 반영 완료
