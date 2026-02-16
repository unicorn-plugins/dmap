---
name: monitor-sync-status
description: 명세-코드 동기화 상태 조회 및 불일치 파일 모니터링
user-invocable: true
model: haiku
context: ["sync-monitoring", "status-check"]
---

# 동기화 상태 모니터링 (Monitor Sync Status)

[monitor-sync-status 스킬 활성화 - 명세-코드 동기화 상태 및 불일치 현황 조회]

## 목표

명세와 코드 간 동기화 상태를 실시간 모니터링하여 불일치 파일 목록, 지속 기간, 동기화 이력을 제공함.
일주일 이상 불일치가 지속된 파일에 대해 동기화 권고를 제공함.

## 활성화 조건

- 사용자가 "동기화 상태", "sync status", "불일치 확인" 명령 시
- 정기적인 프로젝트 상태 점검 시
- Git 커밋 전 동기화 상태 확인이 필요한 상황

## 워크플로우

### Phase 1: 동기화 상태 로드 → Agent: sync-monitor (`/oh-my-claudecode:deepsearch` 활용)

- **TASK**: 동기화 관련 상태 파일들을 로드하여 현황 파악
- **EXPECTED OUTCOME**: 불일치 파일 목록과 동기화 이력 데이터
- **MUST DO**: 
  - .omc/sync-pending.json 읽기 (불일치 파일 목록)
  - .omc/sync-history.json 읽기 (동기화 이력)
  - 파일이 없으면 빈 상태로 초기화
- **MUST NOT DO**: 상태 파일을 수정하거나 삭제
- **CONTEXT**: 프로젝트 루트 디렉토리, .omc/ 디렉토리

### Phase 2: 불일치 파일 분석 → Agent: sync-monitor (`/oh-my-claudecode:analyze` 활용)

- **TASK**: 각 불일치 파일의 최종 수정 시간 및 지속 기간 계산
- **EXPECTED OUTCOME**: 파일별 불일치 지속 기간과 우선순위 정보
- **MUST DO**: 
  - 각 파일의 최종 수정 시간 확인 (Git 또는 파일시스템)
  - 현재 시간 기준 불일치 지속 기간 계산
  - 장기 불일치 파일 (7일 이상) 식별
- **MUST NOT DO**: 파일 내용을 수정하거나 자동 동기화 실행
- **CONTEXT**: 불일치 파일 목록, Git 이력, 파일 메타데이터

### Phase 3: 상태 리포트 출력 (`ulw` 활용)

종합적인 동기화 상태 리포트를 생성하여 사용자에게 제공:

```
📊 명세-코드 동기화 상태 리포트
📅 조회 시점: 2024-01-01 15:30

🎯 전체 현황:
- 전체 파일: 45개
- 동기화 완료: 38개 (84.4%)
- 불일치 파일: 7개 (15.6%)

⚠️ 불일치 파일 상세:

🔴 긴급 (7일 이상):
- src/auth/session.py (12일 경과) - 명세: 2024-12-20, 코드: 2024-12-08
- src/payment/gateway.py (9일 경과) - 명세: 2024-12-22, 코드: 2024-12-13

🟡 주의 (3-7일):
- src/order/validation.py (5일 경과) - 명세: 2024-12-27, 코드: 2024-12-22
- src/notification/sms.py (4일 경과) - 명세: 2024-12-28, 코드: 2024-12-24

🟢 최근 (1-3일):
- src/user/profile.py (2일 경과) - 명세: 2024-12-30, 코드: 2024-12-28
- src/order/workflow.py (1일 경과) - 명세: 2024-12-31, 코드: 2024-12-30
- src/common/utils.py (1일 경과) - 명세: 2024-12-31, 코드: 2024-12-30

📋 최근 동기화 이력 (최근 5건):
✅ 2024-12-30 14:20: src/auth/user.py 동기화 완료 (수동)
✅ 2024-12-29 16:45: src/order/process.py 동기화 완료 (자동)  
✅ 2024-12-29 11:30: src/notification/email.py 동기화 완료 (수동)
✅ 2024-12-28 09:15: src/user/settings.py 동기화 완료 (자동)
✅ 2024-12-27 15:00: src/common/validator.py 동기화 완료 (수동)

💡 권고사항:
- 긴급 파일 2개의 즉시 동기화를 권장합니다
- 전체 동기화를 마지막으로 실행한 지 3일이 경과했습니다

🛠️ 다음 단계:
[S] 전체 동기화 실행  [R] 불일치 해소  [F] 특정 파일 동기화  [W] 감시 시작
```

## 상태 파일 스키마

### sync-pending.json
```json
{
  "files": [
    {
      "path": "src/auth/session.py",
      "spec_path": "specs/v1.0.0/auth/session.md",
      "spec_modified": "2024-12-20T10:30:00Z",
      "code_modified": "2024-12-08T14:20:00Z",
      "conflict_type": "spec_newer"
    }
  ],
  "last_updated": "2024-01-01T15:30:00Z"
}
```

### sync-history.json
```json
{
  "history": [
    {
      "timestamp": "2024-12-30T14:20:00Z",
      "file": "src/auth/user.py",
      "action": "manual_sync",
      "result": "success"
    }
  ],
  "stats": {
    "total_syncs": 25,
    "auto_syncs": 15,
    "manual_syncs": 10,
    "last_full_sync": "2024-12-28T09:00:00Z"
  }
}
```

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 상태 파일들을 읽기 전용으로만 접근 |
| 2 | 불일치 지속 기간을 정확히 계산 |
| 3 | 7일 이상 불일치 파일에 대해 긴급 표시 |
| 4 | 전체 파일 수 대비 불일치 비율 제공 |
| 5 | 최근 5건의 동기화 이력 표시 |

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 상태 파일을 수정하거나 삭제하는 것 |
| 2 | 자동으로 동기화를 실행하는 것 |
| 3 | 불일치 원인을 추측하여 부정확한 정보 제공 |
| 4 | 파일 내용을 직접 비교하여 성능 저하 유발 |
| 5 | 사용자 요청 없이 해결책을 자동 실행하는 것 |

## 검증 체크리스트

- [ ] .omc/sync-pending.json과 .omc/sync-history.json이 정상적으로 로드되었는가?
- [ ] 각 불일치 파일의 지속 기간이 정확히 계산되었는가?
- [ ] 7일 이상 불일치 파일이 긴급으로 분류되었는가?
- [ ] 전체 파일 대비 불일치 비율이 정확히 표시되었는가?
- [ ] 최근 동기화 이력이 시간 역순으로 표시되었는가?
- [ ] 사용자에게 다음 단계 옵션이 명확히 제공되었는가?
- [ ] 상태 조회 과정에서 어떤 파일도 수정되지 않았는가?