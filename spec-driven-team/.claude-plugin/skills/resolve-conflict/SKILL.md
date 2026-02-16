---
name: resolve-conflict
description: 명세-코드 불일치 해소 - 사용자 선택 기반 현행화 또는 되돌리기
user-invocable: true
model: sonnet
context: ["conflict-resolution", "sync-repair"]
---

# 불일치 해소 (Resolve Conflict)

[resolve-conflict 스킬 활성화 - 명세-코드 간 불일치 상황 해소 및 동기화 복구]

## 목표

명세와 코드 간 불일치가 발생한 파일들에 대해 사용자가 선택한 해소 방법으로 동기화를 복구함.
자동 현행화, 수동 현행화, 코드 되돌리기 중 선택하여 각 파일별로 최적의 해결 방안을 적용함.

## 활성화 조건

- 사용자가 "불일치 해소", "conflict 해결", "resolve-conflict" 명령 시
- monitor-sync-status에서 불일치 파일이 발견된 후 해소가 필요한 상황
- 장기간 불일치가 지속되어 수동 개입이 필요한 경우

## 워크플로우

### Phase 1: 불일치 파일 로드 → Agent: sync-monitor (`/oh-my-claudecode:deepsearch` 활용)

- **TASK**: .omc/sync-pending.json에서 불일치 파일 목록 로드
- **EXPECTED OUTCOME**: 불일치 파일 목록과 각 파일의 상태 정보
- **MUST DO**: 
  - 불일치 파일 목록 읽기
  - 각 파일의 명세 vs 코드 수정 시간 비교
  - 불일치 지속 기간 계산
- **MUST NOT DO**: 파일 상태를 임의로 수정
- **CONTEXT**: .omc/sync-pending.json, 프로젝트 파일 구조

### Phase 2: 사용자 선택 (사용자 개입)

불일치 파일 목록을 표시하고 각 파일별 해소 방법 선택 옵션 제공:

```
🔧 불일치 파일 해소 방법 선택

📋 불일치 파일 (7개):

1. src/auth/session.py (12일 경과)
   📄 명세: 2024-12-20 (최신) vs 💻 코드: 2024-12-08 (구버전)
   
2. src/payment/gateway.py (9일 경과)  
   📄 명세: 2024-12-22 (최신) vs 💻 코드: 2024-12-13 (구버전)
   
3. src/order/validation.py (5일 경과)
   💻 코드: 2024-12-27 (최신) vs 📄 명세: 2024-12-22 (구버전)

각 파일별 해소 방법을 선택하세요:

📄 → 💻 자동 현행화: spec-generator가 코드 → 명세 자동 업데이트
✏️ 수동 현행화: 개발자가 명세를 직접 편집 (파일 열기)
💻 → 📄 코드 되돌리기: code-regenerator가 명세 기준으로 코드 재생성  
⏭️ 나중에: 현재 상태 유지 (.omc/sync-pending.json에 남김)

[A] 전체 자동 현행화  [S] 파일별 개별 선택  [R] 전체 되돌리기  [Q] 취소
```

개별 선택 모드:
```
📁 src/auth/session.py 해소 방법 선택:
[1] 자동 현행화 (코드→명세)  [2] 수동 현행화  [3] 코드 되돌리기  [4] 나중에
```

### Phase 3: 자동 현행화 실행 → Agent: spec-generator (`/oh-my-claudecode:ralph` 활용)

- **TASK**: 선택된 파일에 대해 코드 → 명세 업데이트 수행
- **EXPECTED OUTCOME**: 업데이트된 명세 파일들과 변경 diff
- **MUST DO**: 
  - 현재 코드 상태를 분석하여 명세 업데이트
  - 변경사항을 diff 형식으로 생성
  - 원본 명세 백업 생성
- **MUST NOT DO**: 백업 없이 명세 파일 덮어쓰기
- **CONTEXT**: 선택된 파일 목록, 현재 코드 상태

### Phase 4: 코드 되돌리기 실행 → Agent: code-regenerator (`/oh-my-claudecode:ralph` 활용)

- **TASK**: 선택된 파일에 대해 명세 → 코드 재생성 수행
- **EXPECTED OUTCOME**: 재생성된 코드 파일들과 변경 diff
- **MUST DO**: 
  - 현재 명세를 기준으로 코드 재생성
  - 변경사항을 diff 형식으로 생성
  - 원본 코드 백업 생성
- **MUST NOT DO**: 백업 없이 코드 파일 덮어쓰기
- **CONTEXT**: 선택된 파일 목록, 현재 명세 상태

### Phase 5: 사용자 검토 및 확정 (사용자 개입)

생성된 diff를 사용자에게 표시하고 최종 승인 요청:

```
🔍 변경사항 미리보기

📄 명세 업데이트 (자동 현행화):

specs/v1.0.0/auth/session.md:
@@ -15,7 +15,12 @@
 ### SESSION_EXPIRY
-   - **규칙**: 24시간 고정 만료
+   - **규칙**: 동적 만료 시간
+     - 일반 사용자: 24시간
+     - 프리미엄 사용자: 72시간  
+     - 관리자: 168시간
+   - **입력**: user_tier: string
+   - **출력**: expiry_hours: number

💻 코드 재생성 (되돌리기):

src/payment/gateway.py:
@@ -88,15 +88,8 @@
 def process_payment(amount, method):
-    # 임시 할인 로직 (2024-12-15 추가)
-    if method == 'credit' and amount > 1000:
-        amount *= 0.95
-    
     # 표준 결제 처리
     result = gateway.charge(amount, method)
+    return validate_payment_result(result)

최종 승인하시겠습니까?
[Y] 전체 승인  [S] 선택 승인  [N] 거부  [E] 추가 편집
```

### Phase 6: 동기화 완료 → Agent: sync-monitor (`/oh-my-claudecode:analyze` 활용)

- **TASK**: 해소 완료된 파일들의 동기화 상태 업데이트
- **EXPECTED OUTCOME**: 업데이트된 sync-pending.json과 Git 커밋 준비
- **MUST DO**: 
  - .omc/sync-pending.json에서 해소된 항목 제거
  - .omc/sync-history.json에 해소 이력 추가
  - Git 스테이징 및 커밋 메시지 제안
- **MUST NOT DO**: 사용자 승인받지 않은 변경사항 적용
- **CONTEXT**: 해소 완료된 파일 목록, 변경 타입

## 출력 형식

### 불일치 해소 완료 보고서
```
🔧 불일치 해소 완료
📅 처리일: 2024-01-01 16:45

📊 처리 결과:
- 대상 파일: 7개
- 자동 현행화: 3개 (코드→명세)
- 코드 되돌리기: 2개 (명세→코드)  
- 수동 현행화: 1개 (사용자 편집)
- 나중에 처리: 1개 (유지)

✅ 해소 완료:
📄→💻 src/order/validation.py (코드→명세 자동 현행화)
📄→💻 src/user/profile.py (코드→명세 자동 현행화)
📄→💻 src/common/utils.py (코드→명세 자동 현행화)
💻→📄 src/auth/session.py (명세→코드 되돌리기)
💻→📄 src/payment/gateway.py (명세→코드 되돌리기)
✏️ src/notification/sms.py (사용자 수동 편집)

⏭️ 나중에 처리:
- src/order/workflow.py (사용자 선택)

💾 백업 위치:
- 명세: .omc/backups/specs-20240101-164500/
- 코드: .omc/backups/code-20240101-164500/

📋 커밋 준비:
git add -A
git commit -m "불일치 해소: 6개 파일 동기화 완료

- 자동 현행화: order/validation, user/profile, common/utils  
- 코드 되돌리기: auth/session, payment/gateway
- 수동 편집: notification/sms"
```

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 모든 변경 전에 반드시 백업 파일 생성 |
| 2 | 사용자가 선택한 해소 방법만 적용 |
| 3 | 변경사항을 diff로 미리보기 제공 후 최종 승인 요청 |
| 4 | 해소 완료된 파일들을 sync-pending.json에서 제거 |
| 5 | 모든 해소 이력을 sync-history.json에 기록 |

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 백업 없이 파일을 변경하는 것 |
| 2 | 사용자가 선택하지 않은 해소 방법을 적용하는 것 |
| 3 | 최종 승인 없이 변경사항을 확정하는 것 |
| 4 | "나중에" 선택한 파일의 상태를 강제로 변경하는 것 |
| 5 | 해소 과정에서 에러 발생 시 부분 적용 상태로 남기는 것 |

## 검증 체크리스트

- [ ] .omc/sync-pending.json이 정상적으로 로드되었는가?
- [ ] 사용자에게 각 파일별 해소 방법 선택 옵션이 제공되었는가?
- [ ] 모든 변경 전에 백업 파일이 생성되었는가?
- [ ] 변경사항이 diff 형식으로 미리보기 제공되었는가?
- [ ] 사용자 승인을 받은 변경사항만 적용되었는가?
- [ ] 해소 완료된 파일들이 sync-pending.json에서 제거되었는가?
- [ ] 해소 이력이 sync-history.json에 정확히 기록되었는가?
- [ ] Git 커밋 메시지가 적절하게 생성되었는가?