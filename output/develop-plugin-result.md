# develop-plugin 결과

## 플러그인 정보

- **이름:** spec-driven-team
- **버전:** 1.0.0
- **디렉토리:** C:/Users/hiond/workspace/spec-driven-team
- **설명:** 느슨한 명세-코드 양방향 동기화로 소프트웨어를 유지보수하는 팀

## 개발 완료 항목

### Phase 1: 요구사항 수집
- ✅ 요구사항 정의서: `.dmap/spec-driven-team/requirements.md`
- ✅ 사용자 질문 4개 응답 완료
- ✅ 플러그인 적합성 검증 완료

### Phase 2: 설계 및 계획
- ✅ 공유 자원 선택 (6개)
- ✅ 개발 계획서 v2.0: `.dmap/spec-driven-team/develop-plan.md`
- ✅ ralplan 합의 (Planner → Architect → Critic)
- ✅ 에이전트 7→4개, 스킬 11→9개 최적화

### Phase 3: 플러그인 개발
- ✅ 플러그인 스켈레톤 생성
- ✅ .gitignore 생성
- ✅ Gateway 설정 (install.yaml, runtime-mapping.yaml)
- ✅ 공유자원 복사
- ✅ 4개 에이전트 개발
  - analyzer (HIGH)
  - spec-manager (HIGH)
  - code-generator (MEDIUM)
  - quality-guardian (MEDIUM)
- ✅ 10개 스킬 개발
  - core, setup, help, add-ext-skill, remove-ext-skill
  - analyze, generate, sync, watch, verify
- ✅ 9개 commands/ 진입점
- ✅ 3개 MVP 커스텀 도구
  - spec_analyzer.py
  - sync_checker.py
  - code_generator.py
- ✅ README.md 작성

### Phase 4: 검증 및 완료
- ✅ 14개 DMAP 표준 검증 항목 전체 통과
- ✅ plugin.json 표준 준수 확인 및 수정
- ✅ marketplace.json 표준 준수 확인 및 수정

## 슬래시 명령 목록

```
/spec-driven-team:setup
/spec-driven-team:help
/spec-driven-team:add-ext-skill
/spec-driven-team:remove-ext-skill
/spec-driven-team:analyze
/spec-driven-team:generate
/spec-driven-team:sync
/spec-driven-team:watch
/spec-driven-team:verify
```

## 설치 방법

```bash
# GitHub 마켓플레이스
claude plugin marketplace add unicorn-plugins/spec-driven-team
claude plugin install spec-driven-team@unicorn-plugins

# 로컬 마켓플레이스
claude plugin marketplace add ~/workspace/spec-driven-team
claude plugin install spec-driven-team@local

# 초기 설정
/spec-driven-team:setup
```

## 다음 단계

GitHub 배포를 위해 publish 스킬로 체인합니다.
