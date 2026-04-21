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
| plugin | resource-contribution-guide | 리소스 마켓플레이스에 가이드, 템플릿, 샘플, 커스텀 도구를 추가하는 방법 안내 | [상세](guides/plugin/resource-contribution-guide.md) |
| plugin | agent-runtime-adapters | 에이전트 SSOT(`agents/{name}/`)의 런타임별 포인터 스텁 생성·동기화 가이드 (Claude Code / Cursor / Codex / Antigravity) | [상세](guides/agent-runtime-adapters.md) |
| office | pptx-build-guide | pptxgenjs 기반 PPT 작성 가이드 (스타일+빌드규칙 통합, 컬러·타이포·패턴 A~F + fs12 등 검증 규칙 11종) | [상세](guides/office/pptx-build-guide.md) |
| office | xlsx-build-guide | openpyxl 기반 XLSX 빌드 가이드 (입력 데이터→코드, 셀/병합/스타일/수식, 자가검증 9항) | [상세](guides/office/xlsx-build-guide.md) |
| office | docx-build-guide | python-docx 기반 DOCX 빌드 가이드 (입력 본문→코드, 헤딩/표/이미지/한글폰트, 자가검증 9항) | [상세](guides/office/docx-build-guide.md) |
| ai/plan | problem-hypothesis-guide | AI 활용 문제가설 정의 가이드 (대표 현상문제 3개 · 5WHY 근본원인 · 비즈니스 가치) | [상세](guides/ai/plan/01-problem-hypothesis-guide.md) |
| ai/plan | direction-setting-guide | 방향성 정의 가이드 (킹핀 문제 · Needs Statement · 자동화/증강/생성 카테고리) | [상세](guides/ai/plan/02-direction-setting-guide.md) |
| ai/plan | ideation-guide | 아이디어 발상 가이드 (SCAMPER · Steal & Synthesize · AI 패턴 카드) | [상세](guides/ai/plan/03-ideation-guide.md) |
| ai/plan | solution-selection-guide | 솔루션 선정 가이드 (B/F 투표 · 우선순위 매트릭스 · AI 실현 가능성 4요소) | [상세](guides/ai/plan/04-solution-selection-guide.md) |
| ai/plan | event-storming-guide | 이벤트 스토밍 가이드 (PlantUML 시퀀스 · Bounded Context · AI 에이전트 Actor) | [상세](guides/ai/plan/05-event-storming-guide.md) |
| ai/plan | user-stories-guide | 유저스토리 가이드 (UFR/AFR/NFR · Given-When-Then · LLM 검증 기준 AC) | [상세](guides/ai/plan/06-user-stories-guide.md) |
| ai/tech-info | multimodal-ai | 멀티모달 AI 참조 (텍스트·이미지·음성·문서 입출력) | [상세](guides/ai/tech-info/01-multimodal-ai.md) |
| ai/tech-info | langchain | Langchain 참조 (체인·메모리·Tool 바인딩) | [상세](guides/ai/tech-info/02-langchain.md) |
| ai/tech-info | rag | RAG 참조 (청킹·인덱싱·검색·리랭킹) | [상세](guides/ai/tech-info/03-rag.md) |
| ai/tech-info | mcp | MCP 참조 (외부 Tool/MCP 서버 연동) | [상세](guides/ai/tech-info/04-mcp.md) |
| ai/tech-info | mas-langgraph | MAS & LangGraph 참조 (에이전트 토폴로지·노드/엣지/State) | [상세](guides/ai/tech-info/05-mas-langgraph.md) |

> **MS-Office 산출물 패턴 안내**:
> - **pptx**: `pptx-spec-writer` 에이전트(시각 명세 .md) + 빌더 스킬(generate-pptx) 2단계 패턴 — 시각 레이아웃 매핑이 필요하므로 명세 단계 별도 운영
> - **xlsx / docx**: 빌더 스킬(generate-xlsx, generate-docx) 단독 1단계 패턴 — 입력 데이터/본문이 곧 명세이므로 spec-writer 에이전트 미사용
> - 외부 변환 스킬(`anthropic-skills:pptx`/`xlsx` 등) 의존 없음. 오케스트레이터(Claude Code)가 `Write + Bash`로 직접 빌드 → Cursor·Cowork 등 모든 런타임 호환

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
| office | pptx-spec-writer-AGENT | PPT 시각 명세 작성 에이전트 패키지 스켈레톤 (pptx 전용) | [상세](templates/office/pptx-spec-writer-AGENT.md) |
| office | pptx-builder-SKILL | PPT 빌더 스킬 스켈레톤 (spec-agent 위임 + Build/Verify Phase) | [상세](templates/office/pptx-builder-SKILL.md) |
| office | xlsx-builder-SKILL | XLSX 빌더 스킬 스켈레톤 (1단계 — 입력 데이터→직접 빌드) | [상세](templates/office/xlsx-builder-SKILL.md) |
| office | docx-builder-SKILL | DOCX 빌더 스킬 스켈레톤 (1단계 — 입력 본문→직접 빌드) | [상세](templates/office/docx-builder-SKILL.md) |
| runtime-adapters | claude-code | Claude Code / CoWork 런타임 어댑터 스텁 템플릿 (Markdown + frontmatter) | [상세](templates/runtime-adapters/claude-code.md.tmpl) |
| runtime-adapters | cursor | Cursor 런타임 어댑터 스텁 템플릿 (Markdown + frontmatter) | [상세](templates/runtime-adapters/cursor.md.tmpl) |
| runtime-adapters | codex | Codex 런타임 어댑터 스텁 템플릿 (TOML + developer_instructions) | [상세](templates/runtime-adapters/codex.toml.tmpl) |
| runtime-adapters | antigravity | Antigravity 런타임 어댑터 스텁 템플릿 (Markdown + Manager UI 수동 로드 안내) | [상세](templates/runtime-adapters/antigravity.md.tmpl) |

[Top](#리소스-마켓플레이스)

---

## 샘플 목록

| 2차 분류 | 샘플명 | 설명 | 상세 |
|---------|-------|------|------|
| plugin | README | 플러그인 README.md 작성 예시 (Abra 플러그인 기준) | [상세](samples/plugin/README.md) |
| office | pptx-build-sample | pptxgenjs 기반 PPT 빌드 샘플 (4슬라이드, 검증 규칙 11항 준수) | [상세](samples/office/pptx-build-sample.js) |
| office | xlsx-build-sample | openpyxl 기반 XLSX 빌드 샘플 (2시트, 합계 수식·인쇄 설정) | [상세](samples/office/xlsx-build-sample.py) |
| office | docx-build-sample | python-docx 기반 DOCX 빌드 샘플 (헤딩·표·강조박스·페이지 나눔) | [상세](samples/office/docx-build-sample.py) |

[Top](#리소스-마켓플레이스)

---

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
| 커스텀 앱 | convert-to-markdown | Office 문서(pptx/docx/xlsx)를 Markdown으로 변환, Groq VLM으로 이미지 설명 자동 생성 | [상세](tools/convert-to-markdown.md) |
| 커스텀 앱 | youtube-search | YouTube Data API v3 기반 동영상 검색, 최근 N일 이내 필터링 및 한국어 우선 정렬 지원 | [상세](tools/youtube-search.md) |

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
