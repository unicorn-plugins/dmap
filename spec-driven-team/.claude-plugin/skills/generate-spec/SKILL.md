---
name: generate-spec
description: 분석 결과를 바탕으로 선언적 명세 자동 생성 - 스마트 알고리즘 적용
user-invocable: true
model: sonnet
context: ["spec-generation", "code-analysis"]
---

# 명세 자동 생성 (Generate Spec)

[generate-spec 스킬 활성화 - 코드 분석 결과를 바탕으로 선언적 명세 자동 생성]

## 목표

코드베이스 분석 결과를 바탕으로 선언적 로직은 완전한 명세로, 복잡한 로직은 명세 스켈레톤으로 자동 생성함.
함수/클래스 시그니처, 제어 흐름, 데이터 변환 로직을 명세 형식으로 변환하여 specs/ 디렉토리에 저장함.

## 활성화 조건

- 사용자가 "명세 생성해줘", "스펙 만들어줘", "generate-spec" 명령 시
- 코드 분석 완료 후 명세 생성이 필요한 상황
- Step 3 단계에서 자동 호출

## 워크플로우

### Phase 1: 분석 결과 로드 (`/oh-my-claudecode:deepsearch` 활용)

.omc/analysis-report.json 파일을 읽어 코드 분석 결과를 로드함.
분석 결과가 없으면 사용자에게 먼저 코드 분석을 실행하도록 안내.

### Phase 2: 명세 자동 생성 → Agent: spec-generator (`/oh-my-claudecode:ralph` 활용)

- **TASK**: 스마트 알고리즘을 적용하여 코드 분석 결과를 명세로 변환
- **EXPECTED OUTCOME**: specs/v1.0.0/{domain}/{component}.md 형식의 명세 파일들
- **MUST DO**: 
  - 함수/클래스 시그니처를 명세 변환
  - 제어 흐름 분석을 워크플로우 명세로 변환
  - 데이터 변환 로직을 매핑 테이블로 변환
  - 규칙 기반 검증 로직을 규칙 명세로 변환
  - 복잡한 로직은 명세 스켈레톤으로 의도만 기술
- **MUST NOT DO**: 사용자 확인 없이 기존 명세 파일 덮어쓰기
- **CONTEXT**: 분석 결과, 기존 명세 패턴, 도메인별 템플릿

### Phase 3: 명세 검증 → Agent: spec-generator (`/oh-my-claudecode:analyze` 활용)

- **TASK**: 생성된 명세의 구조와 형식 검증
- **EXPECTED OUTCOME**: 검증 통과한 명세 파일들 또는 수정 사항 목록
- **MUST DO**: 필수 섹션 존재 확인, 마크다운 문법 검증, 명세 간 일관성 확인
- **MUST NOT DO**: 검증 실패 시 자동으로 명세 수정
- **CONTEXT**: DMAP 명세 표준, 도메인별 검증 규칙

### Phase 4: 명세 편집 및 검증 (사용자 개입)

사용자에게 생성된 명세 미리보기를 제공하고 편집 옵션 제공:

```
📄 생성된 명세 파일들:

✅ specs/v1.0.0/auth/user-management.md
✅ specs/v1.0.0/order/workflow.md  
⚠️ specs/v1.0.0/payment/gateway.md (복잡한 로직 - 스켈레톤만)

선택하세요:
[V] 미리보기  [E] 웹 에디터로 편집  [A] 전체 승인  [R] 재생성  [Q] 중단
```

웹 에디터 선택 시 명세 파일들을 편집 가능한 형태로 표시하고 수정 허용.

## 출력 형식

### 명세 생성 완료 보고서
```
📋 명세 자동 생성 완료

📊 생성 결과:
- 분석된 파일: 25개
- 생성된 명세: 8개
- 완전 자동화: 6개 (선언적 로직)
- 스켈레톤: 2개 (복잡한 로직)

📁 생성된 명세 파일:
✅ specs/v1.0.0/auth/user-management.md (완전)
✅ specs/v1.0.0/auth/session.md (완전)
✅ specs/v1.0.0/order/workflow.md (완전)
✅ specs/v1.0.0/order/validation.md (완전)
✅ specs/v1.0.0/payment/gateway.md (스켈레톤)
✅ specs/v1.0.0/notification/email.md (완전)
✅ specs/v1.0.0/notification/sms.md (스켈레톤)
✅ specs/v1.0.0/common/utils.md (완전)

🔍 다음 단계: 스켈레톤 명세의 세부사항을 수동으로 보완하세요.
```

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 분석 결과(.omc/analysis-report.json)가 없으면 명세 생성을 중단하고 사용자에게 안내 |
| 2 | 선언적 로직은 반드시 완전한 명세로 변환 |
| 3 | 복잡한 로직은 스켈레톤 형태로 의도만 기술 |
| 4 | 명세 파일은 반드시 specs/v1.0.0/{domain}/{component}.md 형식으로 저장 |
| 5 | 생성된 명세는 DMAP 표준 형식을 준수 |

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 사용자 확인 없이 기존 명세 파일을 덮어쓰는 것 |
| 2 | 분석되지 않은 코드에 대해 명세를 추측하여 생성하는 것 |
| 3 | 검증 실패한 명세를 강제로 저장하는 것 |
| 4 | 복잡한 로직을 완전 자동화하려고 시도하는 것 |
| 5 | 도메인별 템플릿을 무시하고 일률적으로 생성하는 것 |

## 검증 체크리스트

- [ ] .omc/analysis-report.json 파일이 존재하고 유효한가?
- [ ] 생성된 모든 명세 파일이 올바른 디렉토리 구조에 저장되었는가?
- [ ] 선언적 로직이 완전한 명세로 변환되었는가?
- [ ] 복잡한 로직이 적절한 스켈레톤 형태로 생성되었는가?
- [ ] 명세 파일들이 마크다운 문법을 준수하는가?
- [ ] 필수 섹션들이 모든 명세 파일에 포함되어 있는가?
- [ ] 사용자에게 명세 미리보기와 편집 옵션이 제공되었는가?