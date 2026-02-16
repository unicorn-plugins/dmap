---
name: sync-spec
description: 명세 기반 코드 수동 재생성 - 사용자 승인 기반 동기화
user-invocable: true
model: sonnet
context: ["spec-sync", "code-generation"]
---

# 명세→코드 수동 동기화 (Sync Spec)

[sync-spec 스킬 활성화 - 명세를 기반으로 코드 수동 재생성 및 동기화]

## 목표

현재 명세 파일들을 기반으로 해당 코드를 재생성하여 명세와 코드 간 동기화를 수행함.
선언적 로직은 자동 생성하고 복잡한 로직은 변경 제안만 생성하여 사용자 승인 후 적용함.

## 활성화 조건

- 사용자가 "명세 동기화", "코드 재생성", "sync-spec" 명령 시
- 명세 수정 후 코드에 반영이 필요한 상황
- 코드와 명세 간 불일치가 발견된 경우

## 워크플로우

### Phase 1: 명세 로드 (`/oh-my-claudecode:deepsearch` 활용)

specs/v1.0.0/{domain}/{component}.md 형식의 모든 명세 파일을 읽어 
현재 명세 상태를 파악하고 코드 생성 대상을 결정함.

### Phase 2: 코드 재생성 → Agent: code-regenerator (`/oh-my-claudecode:ralph` 활용)

- **TASK**: 명세 기반 선언적 로직 코드 자동 생성
- **EXPECTED OUTCOME**: 재생성된 코드 파일들과 변경 제안
- **MUST DO**: 
  - 명세의 선언적 로직을 코드로 자동 변환
  - 복잡한 로직은 변경 제안만 생성
  - 기존 코드와의 diff 비교 생성
  - 백업 파일 생성
- **MUST NOT DO**: 사용자 승인 없이 복잡한 로직 자동 적용
- **CONTEXT**: 현재 명세 파일들, 기존 코드 패턴, 매핑 규칙

### Phase 3: 변경 제안 표시 (사용자 개입)

사용자에게 재생성된 코드와 변경 제안을 표시하고 승인 여부 확인:

```
🔄 명세→코드 동기화 변경 제안

📁 src/auth/user.py (선언적 로직 - 자동 생성됨)
✅ validate_email() 함수 업데이트 완료
✅ hash_password() 함수 새로 생성 완료

📁 src/auth/session.py (복잡한 로직 - 검토 필요)
⚠️ 세션 만료 로직 변경 제안:

@@ -45,7 +45,10 @@
 def check_session_expiry(session):
-    return session.created_at + timedelta(hours=24) > datetime.now()
+    # 새 명세: 동적 만료 시간 지원
+    expiry_hours = session.user.tier.session_hours or 24
+    return session.created_at + timedelta(hours=expiry_hours) > datetime.now()

선택하세요:
[A] 전체 승인  [S] 선택 승인  [R] 거부  [E] 편집  [P] 미리보기
```

### Phase 4: 회귀 테스트 → Agent: verification-engineer (`/oh-my-claudecode:ultraqa` 활용)

- **TASK**: 재생성 코드에 대해 회귀 테스트 자동 실행
- **EXPECTED OUTCOME**: 테스트 통과 확인 또는 실패 원인 파악
- **MUST DO**: 
  - 테스트 명령 자동 감지 (package.json, pytest 등)
  - 전체 테스트 스위트 실행
  - 테스트 결과 상세 리포트 생성
- **MUST NOT DO**: 테스트 실패 시 변경사항 강제 적용
- **CONTEXT**: 승인된 변경사항, 테스트 설정, 프로젝트 구조

## 출력 형식

### 동기화 완료 보고서
```
🔄 명세→코드 동기화 완료
📅 실행일: 2024-01-01 15:30

📊 처리 결과:
- 로드된 명세: 8개 파일
- 자동 생성: 12개 함수 (선언적 로직)
- 사용자 승인: 5개 함수 (복잡한 로직)
- 거부됨: 2개 함수 (사용자 판단)

📁 업데이트된 파일:
✅ src/auth/user.py (3개 함수 자동 생성)
✅ src/auth/session.py (2개 함수 사용자 승인)
✅ src/order/workflow.py (4개 함수 자동 생성) 
✅ src/order/validation.py (3개 함수 사용자 승인)
❌ src/payment/gateway.py (사용자 거부)
⏭️ src/notification/email.py (변경 불필요)

🧪 회귀 테스트 결과:
✅ Unit Tests: 45/45 통과
✅ Integration Tests: 12/12 통과  
✅ Build: 성공

💾 백업 위치: .omc/backups/code-20240101-153000/

📋 다음 단계: git add -A && git commit -m "명세 동기화: 12개 함수 재생성"
```

## 상태 관리

### 동기화 상태 파일
```json
// .omc/sync-state.json
{
  "last_sync": "2024-01-01T15:30:00Z",
  "specs_processed": 8,
  "auto_generated": 12,
  "user_approved": 5,
  "rejected": 2,
  "backup_location": ".omc/backups/code-20240101-153000/",
  "test_results": {
    "unit": "45/45",
    "integration": "12/12", 
    "build": "success"
  }
}
```

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 명세 파일이 존재하지 않으면 동기화 중단 및 사용자 안내 |
| 2 | 모든 기존 코드의 백업을 생성한 후 재생성 시작 |
| 3 | 선언적 로직은 자동 생성, 복잡한 로직은 변경 제안만 생성 |
| 4 | 사용자 승인 없이 복잡한 로직 변경 금지 |
| 5 | 승인된 변경사항에 대해 회귀 테스트 필수 실행 |

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 백업 없이 기존 코드를 덮어쓰는 것 |
| 2 | 사용자가 거부한 변경사항을 적용하는 것 |
| 3 | 테스트 실패 상태로 동기화를 완료 처리하는 것 |
| 4 | 명세에 정의되지 않은 코드를 임의로 생성하는 것 |
| 5 | 동기화 과정에서 에러 발생 시 부분 적용 상태로 남기는 것 |

## 검증 체크리스트

- [ ] 모든 명세 파일이 성공적으로 로드되었는가?
- [ ] 기존 코드의 백업이 올바른 위치에 생성되었는가?
- [ ] 선언적 로직과 복잡한 로직이 올바르게 구분되었는가?
- [ ] 사용자에게 변경 제안이 명확하게 표시되었는가?
- [ ] 승인된 변경사항만 코드에 반영되었는가?
- [ ] 회귀 테스트가 모두 통과했는가?
- [ ] 동기화 상태가 .omc/sync-state.json에 정확히 기록되었는가?
- [ ] 생성된 코드가 기존 코딩 스타일을 준수하는가?