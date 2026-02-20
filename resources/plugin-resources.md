# 리소스 마켓플레이스

---

## 한 줄 정의

리소스 마켓플레이스는 플러그인 생성 시 재사용 가능한 공유 자원(가이드, 템플릿, 샘플, 도구, 플러그인)의
카탈로그이며, 필요한 리소스를 플러그인 안으로 가져가 사용하기 위한 공유 자원 풀임.

[Top](#리소스-마켓플레이스)

---

## 리소스 분류 체계

5가지 유형으로 분류:

| 유형 | 설명 | 디렉토리 | 예시 |
|------|------|---------|------|
| 가이드 | 플러그인 제작에 공통으로 필요한 참조 문서 | `resources/guides/` | Dify DSL 작성 가이드 |
| 템플릿 | 표준 파일의 스켈레톤/보일러플레이트 | `resources/templates/` | AGENT.md 템플릿, SKILL.md 템플릿 |
| 샘플 | 재사용 가능한 코드 스니펫/패턴 | `resources/samples/` | DSL 패턴, 워크플로우 조각 |
| 도구 | 커스텀 제작/외부 도구의 설치·사용법 카탈로그 | `resources/tools/` | MCP 서버, 커스텀 앱/CLI |
| 플러그인 | 외부호출스킬(External)에서 위임할 대상 플러그인의 명세서 | `resources/plugins/` | Abra 플러그인 명세 |

[Top](#리소스-마켓플레이스)

---

## 가이드 목록

| 2차 분류 | 가이드명 | 설명 | 상세 |
|---------|---------|------|------|
| dify | dify-workflow-dsl-guide | Dify Workflow DSL 작성 가이드 (구조, 노드 타입, 변수 참조 등) | [상세](guides/dify/dify-workflow-dsl-guide.md) |
| github | github-account-setup | GitHub 계정 생성 가이드 (회원가입, 프로필 설정, 2FA) | [상세](guides/github/github-account-setup.md) |
| github | github-token-guide | Personal Access Token (PAT) 생성 가이드 (권한 설정, 보안) | [상세](guides/github/github-token-guide.md) |
| github | github-organization-guide | GitHub Organization 생성 가이드 (팀 관리, 멤버 초대) | [상세](guides/github/github-organization-guide.md) |
| plugin | plugin-dev-guide | DMAP 플러그인 개발 가이드 (팀 기획서, 개발 워크플로우) | [상세](guides/plugin/plugin-dev-guide.md) |
| plugin | resource-contribution-guide | 리소스 마켓플레이스에 가이드, 템플릿, 샘플, 커스텀 도구를 추가하는 방법 안내 | [상세](guides/plugin/resource-contribution-guide.md) |

[Top](#리소스-마켓플레이스)

---

## 템플릿 목록

| 2차 분류 | 템플릿명 | 설명 | 상세 |
|---------|---------|------|------|
| dify | develop-plan-generate | Dify DSL 기반 Agent 개발 계획서 생성 프롬프트 | [상세](templates/dify/develop-plan-generate.md) |
| dify | dsl-generation-prompt | 요구사항 기반 Dify DSL 생성 표준 프롬프트 | [상세](templates/dify/dsl-generation-prompt.md) |
| general | develop | 개발 계획서 기반 Agent 개발 프롬프트 | [상세](templates/general/develop.md) |
| general | team-plan-template | AI 팀 기획서 자동 생성 프롬프트 | [상세](templates/general/team-plan-template.md) |
| plugin | README-plugin-template | 플러그인 README.md 스켈레톤 | [상세](templates/plugin/README-plugin-template.md) |

[Top](#리소스-마켓플레이스)

---

## 샘플 목록

| 2차 분류 | 샘플명 | 설명 | 상세 |
|---------|-------|------|------|
| plugin | README | 플러그인 README.md 작성 예시 (Abra 플러그인 기준) | [상세](samples/plugin/README.md) |

[Top](#리소스-마켓플레이스)

---

## 플러그인 목록

| 2차 분류 | 플러그인명 | 설명 | 상세 |
|---------|----------|------|------|
| ai-agent | abra | Dify 워크플로우 기반 AI Agent 개발 자동화 플러그인 | [상세](plugins/ai-agent/abra.md) |
| devops | github-release-manager | GitHub Release 문서 자동 생성·수정·삭제 및 구성 추천 플러그인 | [상세](plugins/devops/github-release-manager.md) |
| education | gen-ai-curriculum | 교재 분석 기반 AI교육 커리큘럼 자동 생성 및 PPTX 프리젠테이션 작성 플러그인 | [상세](plugins/education/gen-ai-curriculum.md) |
| npd | npd | 사람과 AI가 협업하여 새로운 프로젝트의 기획-설계-개발-배포 전 과정을 지원하는 플러그인 | [상세](plugins/npd/npd.md) |

[Top](#리소스-마켓플레이스)

---

## 도구 목록

| 카테고리 | 도구명 | 설명 | 상세 |
|---------|--------|------|------|
| MCP 서버 | context7 | 라이브러리 공식 문서 검색 및 코드 예시 제공 | [상세](tools/context7.md) |
| 커스텀 앱 | dify_cli | Dify API 클라이언트 — DSL import/export, workflow publish/run | [상세](tools/dify-cli.md) |
| 커스텀 앱 | validate_dsl | Dify DSL YAML 구조 검증 도구 | [상세](tools/validate-dsl.md) |
| 커스텀 앱 | generate_image | Gemini (Nano Banana) 모델 기반 이미지 생성 | [상세](tools/generate-image.md) |
| 커스텀 앱 | generate_video | Veo 3.1 모델 기반 비디오 생성 (음성 포함, Scene Extension 지원) | [상세](tools/generate-video.md) |
| 커스텀 앱 | create_repo | GitHub REST API 기반 원격 저장소 생성 및 초기 푸시 (gh CLI 불요) | [상세](tools/create-repo.md) |
| 커스텀 CLI | check-mermaid | Docker 기반 Mermaid 다이어그램 문법 검증 | [상세](tools/check-mermaid.md) |
| 커스텀 CLI | check-plantuml | Docker 기반 PlantUML 다이어그램 문법 검증 | [상세](tools/check-plantuml.md) |
| 커스텀 앱 | email_sender | smtplib 기반 SMTP 이메일 발송 (텍스트/HTML 지원) | [상세](tools/email_sender.md) |

[Top](#리소스-마켓플레이스)

---

## 도구 분류 체계

4가지 카테고리로 분류:

| 카테고리 | 설명 | 예시 | 설치 주체 |
|---------|------|------|----------|
| MCP 서버 | Model Context Protocol 기반 외부 도구 | context7, playwright, exa | Setup 스킬 (claude mcp add-json) |
| LSP 서버 | Language Server Protocol 기반 코드 분석 | python-lsp-server, graphql-lsp | Setup 스킬 (npm/pip install) |
| 커스텀 앱 | 플러그인 자체 구현 프로그램 (Python, Node.js 등) | dify_cli.py, validate_dsl.py | 소스 포함 + 의존성 설치 |
| 커스텀 CLI | 플러그인 자체 구현 셸 스크립트 | deploy.sh, sync.bat | 소스 파일 포함 (설치 불요) |

[Top](#리소스-마켓플레이스)
