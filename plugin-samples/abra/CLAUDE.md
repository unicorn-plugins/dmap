# Abra 플러그인

선언형 멀티에이전트 플러그인(DMAP) 샘플. Dify 워크플로우 자동화부터 AI Agent 개발까지 엔드-투-엔드 자동화 지원.

**필수 선행 작업**: `setup` 및 `dify-setup` 스킬을 먼저 실행하여 플러그인 초기 설정 및 Dify 환경 구축 완료.

## 라우팅 테이블

| 감지 패턴 | 라우팅 대상 | 설명 |
|-----------|------------|------|
| "에이전트 만들어", "Agent 개발", "워크플로우 자동화", "전체 실행" | → 전체 5단계 순차 실행 | scenario → dsl-generate → prototype → dev-plan → develop 순차 호출 |
| "시나리오 생성", "요구사항 생성", "요구사항 정의", "STEP 1" | → Skill: scenario | 비즈니스 시나리오 생성 및 선택 |
| "DSL 생성", "워크플로우 DSL", "YAML 만들어", "STEP 2" | → Skill: dsl-generate | Dify Workflow DSL 자동생성 |
| "프로토타이핑", "Dify 업로드", "Dify 실행", "Dify 배포", "STEP 3" | → Skill: prototype | Dify 프로토타이핑 자동화 |
| "개발계획서", "계획서 작성", "개발 계획", "STEP 4" | → Skill: dev-plan | 개발계획서 작성 |
| "코드 개발", "Agent 구현", "구현해줘", "STEP 5" | → Skill: develop | AI Agent 개발 및 배포 |
| "Dify 설치", "Docker 실행", "Dify 환경", "Dify Docker" | → Skill: dify-setup | Dify 로컬 환경 구축 |
| "초기 설정", "setup", "설정", "플러그인 설정" | → Skill: setup | 플러그인 초기 설정 |
