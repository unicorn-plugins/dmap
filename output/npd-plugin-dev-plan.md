# NPD 플러그인 개발 계획서

- [NPD 플러그인 개발 계획서](#npd-플러그인-개발-계획서)
  - [1. 개요](#1-개요)
  - [2. 필요 공유자원 목록](#2-필요-공유자원-목록)
  - [3. 스킬 구성 및 분류](#3-스킬-구성-및-분류)
  - [4. 에이전트 구성](#4-에이전트-구성)
  - [5. Gateway 설정 계획](#5-gateway-설정-계획)
  - [6. Domain Expert 동적 생성 메커니즘](#6-domain-expert-동적-생성-메커니즘)
  - [7. 개발 순서 (DMAP 표준 Phase 3)](#7-개발-순서-dmap-표준-phase-3)
  - [8. 리스크 및 주의사항](#8-리스크-및-주의사항)

---

## 1. 개요

**플러그인명**: npd (New Product Development)
**목적**: 사람과 AI가 협업하여 새로운 프로젝트의 기획-설계-개발-배포 전 과정을 지원
**개발 디렉토리**: `~/workspace/npd`
**특징**: 도메인전문가 동적 생성, 모노레포 패턴 기반 프로젝트 관리

[Top](#npd-플러그인-개발-계획서)

---

## 2. 필요 공유자원 목록

### 가이드 문서
| 경로 | 설명 | 활용 |
|------|------|------|
| `guides/github/github-token-guide.md` | GitHub PAT 생성 가이드 | create 스킬 — GitHub 레포 자동 생성 시 토큰 설정 안내 |
| `guides/plugin/plugin-dev-guide.md` | DMAP 플러그인 개발 가이드 | 개발 참조 표준 |

### 템플릿
| 경로 | 설명 | 활용 |
|------|------|------|
| `templates/plugin/README-plugin-template.md` | 플러그인 README 스켈레톤 | README.md 작성 |
| `templates/general/team-plan-template.md` | AI 팀 기획서 자동 생성 프롬프트 | plan 스킬 — 기획서 작성 |

### 샘플
| 경로 | 설명 | 활용 |
|------|------|------|
| `samples/plugin/README.md` | 플러그인 README 작성 예시 | README.md 작성 참고 |

### 도구
| 경로 | 설명 | 활용 |
|------|------|------|
| `tools/create-repo.md` | GitHub REST API 기반 원격 저장소 생성 | create 스킬 — GitHub 레포 자동 생성 |
| `tools/context7.md` | 라이브러리 공식 문서 검색 MCP | develop 스킬 — 코드 생성 시 최신 문서 참조 |
| `tools/check-mermaid.md` | Mermaid 다이어그램 문법 검증 | design 스킬 — 아키텍처 다이어그램 검증 |

### 플러그인
| 경로 | 설명 | 활용 |
|------|------|------|
| `plugins/devops/github-release-manager.md` | GitHub Release 자동화 플러그인 | ext-github-release-manager 스킬 연동 후보 |

[Top](#npd-플러그인-개발-계획서)

---

## 3. 스킬 구성 및 분류

| 스킬명 | 유형 | 설명 | 명령어 |
|--------|------|------|--------|
| `setup` | Setup | NPD 플러그인 초기 설정 | `/npd:setup` |
| `help` | Utility | 사용법 안내 | `/npd:help` |
| `create` | Router | 새 프로젝트 생성 및 초기화 | `/npd:create` |
| `plan` | Planning | 기획 단계 지원 | `/npd:plan` |
| `design` | Router | 설계 단계 지원 | `/npd:design` |
| `develop` | Router | 개발 단계 지원 | `/npd:develop` |
| `deploy` | Router | 배포 단계 지원 | `/npd:deploy` |
| `add-ext-skill` | External | 외부 스킬 추가 | `/npd:add-ext-skill` |
| `remove-ext-skill` | External | 외부 스킬 제거 | `/npd:remove-ext-skill` |

### 스킬 상세 기능

**create 스킬**
- 프로젝트명, 기술스택, MVP 주제 입력 받기
- 도메인 자동 추론
- 모노레포 구조 생성
- CLAUDE.md 자동 설정
- domain-expert-{서비스명} 에이전트 동적 생성
- GitHub 레포지토리 자동 생성

**plan 스킬**
- 상위수준 기획서 작성
- 기획 구체화 (PO + Service Planner 협업)
- 유저스토리 생성
- 프로토타입 개발

**design 스킬**
- 클라우드 아키텍처 설계
- 논리적 설계 (모듈, 컴포넌트)
- 시퀀스 다이어그램
- API 설계
- 클래스 다이어그램
- 데이터베이스 설계

**develop 스킬**
- 공통 모듈 개발
- 백엔드 API 개발
- 프론트엔드 개발
- AI 기능 통합
- 테스트 자동화

**deploy 스킬**
- Docker 컨테이너 빌드
- 로컬 실행 테스트
- Kubernetes 배포
- CI/CD 파이프라인 구축

[Top](#npd-플러그인-개발-계획서)

---

## 4. 에이전트 구성

### 조율 에이전트
| 에이전트 | Tier | 역할 |
|----------|------|------|
| `orchestrator` | HIGH | 전체 프로세스 조율, 에이전트 간 협업 관리 |

### 기획 단계 에이전트
| 에이전트 | Tier | 역할 |
|----------|------|------|
| `product-owner` | HIGH | 제품 비전 및 요구사항 정의 |
| `service-planner` | MEDIUM | 서비스 기획 구체화 |
| `architect` | HIGH | 기술 아키텍처 검토 |
| `domain-expert-{서비스명}` | HIGH | 도메인 특화 지식 제공 (동적 생성) |
| `ai-engineer` | HIGH | AI 기능 통합 계획 |

### 설계 단계 에이전트
| 에이전트 | Tier | 역할 |
|----------|------|------|
| `architect` | HIGH | 시스템 아키텍처 설계 |
| `ai-engineer` | HIGH | AI 모델 설계 및 통합 |

### 개발 단계 에이전트
| 에이전트 | Tier | 역할 |
|----------|------|------|
| `backend-developer` | MEDIUM | 백엔드 API 개발 |
| `frontend-developer` | MEDIUM | 프론트엔드 개발 |
| `ai-engineer` | HIGH | AI 기능 구현 |
| `qa-engineer` | MEDIUM | 테스트 자동화 및 품질 보증 |

### 배포 단계 에이전트
| 에이전트 | Tier | 역할 |
|----------|------|------|
| `devops-engineer` | MEDIUM | 인프라 구축 및 배포 자동화 |

[Top](#npd-플러그인-개발-계획서)

---

## 5. Gateway 설정 계획

### 추상 도구 → 구체 도구 매핑

```yaml
# gateway/runtime-mapping.yaml
version: "1.0"
mappings:
  # 프로젝트 관리 도구
  - abstract_tool: "project_initializer"
    concrete_implementations:
      - tool: "create_monorepo_structure"
        provider: "npd"
      - tool: "setup_claude_md"
        provider: "npd"
      - tool: "create_github_repo"
        provider: "github"

  # 기획 도구
  - abstract_tool: "requirement_generator"
    concrete_implementations:
      - tool: "generate_user_stories"
        provider: "npd"
      - tool: "create_prd"
        provider: "npd"

  # 설계 도구
  - abstract_tool: "architecture_designer"
    concrete_implementations:
      - tool: "create_architecture_diagram"
        provider: "npd"
      - tool: "design_api_spec"
        provider: "openapi"
      - tool: "design_database_schema"
        provider: "npd"

  # 개발 도구
  - abstract_tool: "code_generator"
    concrete_implementations:
      - tool: "generate_backend_code"
        provider: "npd"
      - tool: "generate_frontend_code"
        provider: "npd"
      - tool: "generate_test_code"
        provider: "npd"

  # 배포 도구
  - abstract_tool: "deployment_orchestrator"
    concrete_implementations:
      - tool: "build_docker_image"
        provider: "docker"
      - tool: "deploy_to_kubernetes"
        provider: "k8s"
      - tool: "setup_cicd_pipeline"
        provider: "github_actions"
```

[Top](#npd-플러그인-개발-계획서)

---

## 6. Domain Expert 동적 생성 메커니즘

### 생성 트리거
프로젝트 생성 시 MVP 주제 입력 → 도메인 자동 추론

### 도메인 추론 프로세스
```
1. MVP 주제 분석
   - 키워드 추출
   - 산업 분야 식별
   - 기술 도메인 파악

2. 도메인 전문가 프로파일 생성
   - 도메인명 결정 (예: e-commerce, healthcare, fintech)
   - 필요 전문 지식 정의
   - 관련 규제/표준 식별

3. 디렉토리 구조 생성
   agents/domain-expert-{서비스명}/
   ├── AGENT.md          # 에이전트 역할 및 지식 정의
   ├── agentcard.yaml    # 에이전트 메타데이터
   └── tools.yaml        # 도메인 특화 도구 정의
```

### AGENT.md 템플릿
```markdown
# Domain Expert - {서비스명}

## 역할
{서비스명} 도메인의 전문 지식을 제공하는 에이전트

## 전문 분야
- {도메인 특화 지식 1}
- {도메인 특화 지식 2}
- {관련 규제/표준}

## 책임
- 도메인 요구사항 검증
- 비즈니스 로직 검토
- 규제 준수 확인
- 도메인 모델링 지원
```

### agentcard.yaml 템플릿
```yaml
name: domain-expert-{서비스명}
version: "1.0"
tier: HIGH
domain: {도메인명}
expertise:
  - {전문분야1}
  - {전문분야2}
capabilities:
  - requirement_validation
  - domain_modeling
  - regulation_compliance
```

### 복수 서비스 지원
- 서비스별 독립 디렉토리 관리
- 예: `domain-expert-payment/`, `domain-expert-inventory/`
- 각 서비스의 도메인 전문가가 독립적으로 동작

[Top](#npd-플러그인-개발-계획서)

---

## 7. 개발 순서 (DMAP 표준 Phase 3)

### Step 1: 플러그인 스켈레톤 생성 ✅ (완료)
- `.claude-plugin/plugin.json` — 플러그인 메타데이터
- `.claude-plugin/marketplace.json` — 마켓플레이스 배포 정보
- `.gitignore` — 보안·임시 파일 제외

### Step 2: Gateway 설정 ✅ (완료)
- `gateway/install.yaml` — MCP 서버, 커스텀 도구 설치 매니페스트
- `gateway/runtime-mapping.yaml` — tier·tool·forbidden_actions 추상→구체 매핑

### Step 3: clauding-guide 공유자원 복사 및 적응
원본: `~/workspace/clauding-guide/guides/` → 복사 목적지: `resources/guides/`

복사 후 아래 항목을 npd 플러그인에 맞게 조정:
- 경로 참조: 절대경로 → npd 프로젝트 기준 상대경로
- 기술스택 기본값: Spring Boot 백엔드, 모노레포 구조 반영
- 에이전트 참조: 각 가이드를 어떤 에이전트가 사용하는지 헤더에 명시

| 스킬 | 원본 가이드 경로 | 복사 목적지 |
|------|----------------|------------|
| **plan** | `guides/prompt/02.think-prompt.md` | `resources/guides/plan/think-prompt.md` |
| **design** | `guides/design/architecture-patterns.md` | `resources/guides/design/architecture-patterns.md` |
| **design** | `guides/design/architecture-highlevel.md` | `resources/guides/design/architecture-highlevel.md` |
| **design** | `guides/design/logical-architecture-design.md` | `resources/guides/design/logical-architecture-design.md` |
| **design** | `guides/design/sequence-outer-design.md` | `resources/guides/design/sequence-outer-design.md` |
| **design** | `guides/design/sequence-inner-design.md` | `resources/guides/design/sequence-inner-design.md` |
| **design** | `guides/design/api-design.md` | `resources/guides/design/api-design.md` |
| **design** | `guides/design/class-design.md` | `resources/guides/design/class-design.md` |
| **design** | `guides/design/data-design.md` | `resources/guides/design/data-design.md` |
| **design** | `guides/design/uiux-design.md` | `resources/guides/design/uiux-design.md` |
| **design** | `guides/design/uiux-prototype.md` | `resources/guides/design/uiux-prototype.md` |
| **develop** | `guides/develop/dev-backend.md` | `resources/guides/develop/dev-backend.md` |
| **develop** | `guides/develop/dev-backend-testcode.md` | `resources/guides/develop/dev-backend-testcode.md` |
| **develop** | `guides/develop/dev-frontend.md` | `resources/guides/develop/dev-frontend.md` |
| **develop** | `guides/develop/test-backend.md` | `resources/guides/develop/test-backend.md` |
| **develop** | `guides/develop/database-plan.md` | `resources/guides/develop/database-plan.md` |
| **develop** | `guides/develop/database-install.md` | `resources/guides/develop/database-install.md` |
| **develop** | `guides/tools/mermaid-guide.md` | `resources/guides/tools/mermaid-guide.md` |
| **develop** | `guides/tools/plantuml-guide.md` | `resources/guides/tools/plantuml-guide.md` |
| **deploy** | `guides/deploy/build-image-back.md` | `resources/guides/deploy/build-image-back.md` |
| **deploy** | `guides/deploy/build-image-front.md` | `resources/guides/deploy/build-image-front.md` |
| **deploy** | `guides/deploy/run-container-guide-back.md` | `resources/guides/deploy/run-container-guide-back.md` |
| **deploy** | `guides/deploy/run-container-guide-front.md` | `resources/guides/deploy/run-container-guide-front.md` |
| **deploy** | `guides/deploy/deploy-k8s-back.md` | `resources/guides/deploy/deploy-k8s-back.md` |
| **deploy** | `guides/deploy/deploy-k8s-front.md` | `resources/guides/deploy/deploy-k8s-front.md` |
| **deploy** | `guides/deploy/deploy-actions-cicd-back.md` | `resources/guides/deploy/deploy-actions-cicd-back.md` |
| **deploy** | `guides/deploy/deploy-actions-cicd-front.md` | `resources/guides/deploy/deploy-actions-cicd-front.md` |

### Step 4: 에이전트 개발
각 에이전트 디렉토리에 AGENT.md + agentcard.yaml + tools.yaml 생성

| 에이전트 | Tier | 담당 단계 |
|----------|------|----------|
| `orchestrator` | HIGH | 전체 조율 |
| `product-owner` | HIGH | 기획 |
| `service-planner` | MEDIUM | 기획 |
| `architect` | HIGH | 기획·설계 |
| `ai-engineer` | HIGH | 기획·설계·개발 |
| `backend-developer` | MEDIUM | 개발 |
| `frontend-developer` | MEDIUM | 개발 |
| `qa-engineer` | MEDIUM | 개발 |
| `devops-engineer` | MEDIUM | 배포 |

### Step 5: 스킬 개발
| 스킬 | 유형 | 참조 가이드 |
|------|------|------------|
| `setup` | Setup | gateway/install.yaml |
| `help` | Utility | — |
| `add-ext-skill` | Utility | — |
| `remove-ext-skill` | Utility | — |
| `create` | Router | — (모노레포 생성, domain-expert 동적 생성) |
| `plan` | Router | `resources/guides/plan/` |
| `design` | Orchestrator | `resources/guides/design/` |
| `develop` | Orchestrator | `resources/guides/develop/` |
| `deploy` | Orchestrator | `resources/guides/deploy/` |

### Step 6: commands/ 진입점 생성
각 스킬에 대응하는 `commands/{skill-name}.md` 파일 생성

### Step 7: README.md 작성
`resources/templates/plugin/README-plugin-template.md` 및
`resources/samples/plugin/README.md` 참조하여 작성

[Top](#npd-플러그인-개발-계획서)

---

## 8. 리스크 및 주의사항

### 기술적 리스크
| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| GitHub API 제한 | 높음 | API 호출 최적화, 캐싱 전략 |
| 도메인 추론 정확도 | 중간 | 사용자 확인 단계 추가 |
| 모노레포 복잡도 | 중간 | 점진적 구조 확장 전략 |
| K8s 배포 실패 | 높음 | 롤백 메커니즘 구현 |

### 운영 고려사항
1. **도메인 전문가 관리**
   - 동적 생성된 에이전트의 버전 관리
   - 복수 프로젝트 간 에이전트 충돌 방지
   - 에이전트 성능 모니터링

2. **자원 관리**
   - 동시 실행 에이전트 수 제한
   - 메모리 사용량 모니터링
   - API 호출 횟수 관리

3. **보안 고려사항**
   - GitHub 토큰 안전 관리
   - K8s 클러스터 접근 제어
   - 민감 정보 마스킹

### 개발 우선순위
1. **필수 기능 (MVP)**
   - 프로젝트 생성 (`create`)
   - 기획 지원 (`plan`)
   - 기본 에이전트 구성

2. **확장 기능**
   - 설계 자동화 (`design`)
   - 개발 자동화 (`develop`)
   - CI/CD 통합 (`deploy`)

3. **고급 기능**
   - 도메인 전문가 학습 기능
   - 프로젝트 템플릿 마켓플레이스
   - 팀 협업 기능

### 성공 지표
- 프로젝트 생성 시간: 5분 이내
- 기획서 작성 품질: 80% 이상 만족도
- 코드 자동 생성 정확도: 70% 이상
- 배포 성공률: 90% 이상

[Top](#npd-플러그인-개발-계획서)