---
name: watch-spec
description: 명세 디렉토리 감시 및 변경 감지 시 자동 코드 재생성 - 백그라운드 실행
user-invocable: true
model: sonnet
context: ["spec-watching", "auto-sync"]
---

# 명세 감시 및 자동 동기화 (Watch Spec)

[watch-spec 스킬 활성화 - 명세 변경 감시 및 코드 자동 재생성 백그라운드 실행]

## 목표

specs/ 디렉토리의 명세 파일 변경사항을 실시간 감시하여 자동으로 코드 재생성을 수행함.
선언적 로직은 즉시 적용하고 복잡한 로직은 변경 제안을 생성하여 사용자 확인을 요청함.

## 활성화 조건

- 사용자가 "명세 감시 시작", "watch-spec", "자동 동기화 켜기" 명령 시
- 개발 중 명세와 코드 간 실시간 동기화가 필요한 상황
- 백그라운드에서 지속적으로 실행됨

## 워크플로우

### Phase 1: 명세 디렉토리 감시 시작 → Agent: spec-versioner (`/oh-my-claudecode:ralph` 활용)

- **TASK**: specs/ 디렉토리 파일 변경 감시 시스템 구축
- **EXPECTED OUTCOME**: 파일 감시 데몬 또는 Git 훅 설정 완료
- **MUST DO**: 
  - specs/ 디렉토리 하위 모든 .md 파일 감시
  - 파일 생성, 수정, 삭제 이벤트 감지
  - 감시 상태 정보를 .omc/watch-status.json에 기록
- **MUST NOT DO**: 시스템 리소스 과다 사용, 무한 루프 생성
- **CONTEXT**: 프로젝트 루트 디렉토리, 기존 Git 훅 설정

### Phase 2: 명세 변경 감지 → Agent: spec-versioner (`/oh-my-claudecode:analyze` 활용)

- **TASK**: Git 훅 또는 파일 감시를 통한 명세 변경사항 실시간 감지
- **EXPECTED OUTCOME**: 변경된 명세 파일 목록과 변경 타입
- **MUST DO**: 
  - 변경 타입 분류 (추가/수정/삭제)
  - 변경 시간과 파일 경로 로깅
  - 동시 변경 시 배치 처리
- **MUST NOT DO**: 임시 파일이나 백업 파일 변경 감지
- **CONTEXT**: 파일 시스템 이벤트, Git 변경 이력

### Phase 3: 변경 내역 분석 → Agent: spec-versioner (`/oh-my-claudecode:deepsearch` 활용)

- **TASK**: 명세 diff 분석 및 영향받는 코드 파일 식별
- **EXPECTED OUTCOME**: 영향받는 코드 파일 목록과 변경 범위
- **MUST DO**: 
  - 명세 변경사항의 diff 분석
  - 해당 명세와 매핑되는 코드 파일 식별
  - 변경 영향 범위 계산
- **MUST NOT DO**: 관련 없는 파일을 영향 범위에 포함
- **CONTEXT**: 명세-코드 매핑 정보, 기존 분석 결과

### Phase 4: 코드 자동 재생성 → Agent: code-regenerator (`/oh-my-claudecode:ultrawork` 활용)

- **TASK**: 명세 기반 코드 재생성 실행
- **EXPECTED OUTCOME**: 재생성된 코드 파일들 또는 변경 제안
- **MUST DO**: 
  - 선언적 로직은 자동으로 즉시 적용
  - 복잡한 로직은 변경 제안만 생성
  - 기존 코드와의 diff 생성
- **MUST NOT DO**: 사용자 확인 없이 복잡한 로직 자동 적용
- **CONTEXT**: 변경된 명세, 기존 코드 패턴, 매핑 규칙

### Phase 5: 회귀 테스트 실행 → Agent: verification-engineer (`/oh-my-claudecode:ultraqa` 활용)

- **TASK**: 재생성된 코드에 대한 자동 회귀 테스트
- **EXPECTED OUTCOME**: 테스트 통과 시 Git 커밋, 실패 시 롤백 제안
- **MUST DO**: 
  - 자동 테스트 실행 (npm test, pytest 등)
  - 테스트 통과 시 변경사항 Git 커밋
  - 테스트 실패 시 롤백 및 사용자 알림
- **MUST NOT DO**: 테스트 실패 상태로 변경사항 유지
- **CONTEXT**: 테스트 설정, Git 상태, 백업 정보

## 백그라운드 실행 관리

### 감시 상태 정보
```json
// .omc/watch-status.json
{
  "status": "active", // active, paused, stopped
  "started_at": "2024-01-01T12:00:00Z",
  "watched_files": 15,
  "total_changes": 23,
  "auto_applied": 18,
  "manual_review": 5,
  "last_change": "2024-01-01T15:30:00Z"
}
```

### 사용자 알림 시나리오
```
🔍 [WATCH-SPEC] 명세 변경 감지
📄 변경된 파일: specs/auth/user-management.md
🤖 자동 적용: src/auth/user.py (선언적 로직)
⏳ 검토 필요: src/auth/session.py (복잡한 로직)

[V] 변경 제안 보기  [A] 승인  [P] 일시정지  [S] 중단
```

## 출력 형식

### 감시 상태 리포트
```
🔍 명세 감시 상태 리포트
📅 시작: 2024-01-01 12:00 (실행 중: 3시간 30분)

📊 처리 현황:
- 감시 중인 파일: 15개 명세
- 감지된 변경: 23건
- 자동 적용: 18건 (선언적 로직)
- 검토 대기: 5건 (복잡한 로직)

🔄 최근 활동:
- 15:30 specs/order/workflow.md 변경 → src/order/process.py 자동 업데이트 ✅
- 15:25 specs/payment/gateway.md 변경 → 검토 대기 ⏳
- 15:20 specs/auth/session.md 변경 → src/auth/session.py 자동 업데이트 ✅

⚙️ 제어:
[P] 일시정지  [S] 중단  [C] 설정  [L] 상세 로그
```

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 백그라운드에서 지속적으로 실행되어야 함 |
| 2 | 선언적 로직만 자동 즉시 적용 |
| 3 | 복잡한 로직은 반드시 변경 제안만 생성하고 사용자 확인 요청 |
| 4 | 모든 자동 변경 후 회귀 테스트 실행 |
| 5 | 감시 상태와 변경 이력을 .omc/watch-status.json에 기록 |

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 사용자 확인 없이 복잡한 로직을 자동 적용하는 것 |
| 2 | 테스트 실패 상태로 변경사항을 유지하는 것 |
| 3 | 시스템 리소스를 과도하게 사용하는 것 |
| 4 | 임시 파일이나 백업 파일 변경에 반응하는 것 |
| 5 | 백그라운드 실행 중 사용자 인터페이스를 독점하는 것 |

## 검증 체크리스트

- [ ] specs/ 디렉토리 감시가 정상적으로 시작되었는가?
- [ ] 파일 변경 감지가 실시간으로 작동하는가?
- [ ] 선언적 로직과 복잡한 로직이 올바르게 구분되는가?
- [ ] 자동 적용된 변경사항에 대해 회귀 테스트가 실행되는가?
- [ ] 테스트 실패 시 적절한 롤백이 수행되는가?
- [ ] 감시 상태 정보가 정확히 기록되고 있는가?
- [ ] 사용자에게 변경 제안 검토 옵션이 제공되는가?
- [ ] 백그라운드 실행이 시스템 성능에 영향을 주지 않는가?