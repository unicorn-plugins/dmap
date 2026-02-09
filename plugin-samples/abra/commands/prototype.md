---
description: Dify 프로토타이핑 자동화 (STEP 3)
---

# Prototype Command

이 명령은 `prototype` 스킬의 진입점임.

사용자가 `/abra:prototype` 호출 시 런타임이 이 파일을 로드하고,
`Skill` 도구로 `abra:prototype` 스킬에 위임함.

## 위임

- **INTENT**: Dify 프로토타이핑 자동화
- **ARGS**: 사용자 요청 원문 전달
- **RETURN**: 프로토타이핑 완료 후 검증된 DSL 확보
