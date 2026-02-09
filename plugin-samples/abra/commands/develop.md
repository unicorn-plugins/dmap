---
description: AI Agent 개발 및 배포 (STEP 5)
---

# /abra:develop

개발계획서에 따라 AI Agent를 구현하고 배포 가능한 상태로 만듭니다.
Option A(Dify 런타임 활용) 또는 Option B(코드 기반 전환) 방식을 선택할 수 있습니다.

## 사용법

```
/abra:develop
```

## 전제 조건

- 개발계획서(`dev-plan.md`) 존재
- 검증된 DSL(`{app-name}.dsl.yaml`) 존재

## 동작

1. 개발 방식 선택 (Option A: Dify 런타임 / Option B: 코드 기반)
2. 선택된 방식으로 AI Agent 구현
3. 빌드 오류 수정 (Option B)
4. QA/검증
5. 산출물 보고

## 위임

이 명령은 `Skill` 도구를 사용하여 `abra:develop` 스킬의 전체 워크플로우에 위임합니다.

```
Skill: abra:develop
```
