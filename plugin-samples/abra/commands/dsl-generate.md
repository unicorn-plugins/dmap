---
description: Dify DSL 자동생성 (STEP 2)
---

# dsl-generate 명령

이 파일은 `/abra:dsl-generate` 슬래시 명령의 진입점임.

## 실행

Skill 도구를 사용하여 `dsl-generate` 스킬로 위임:

- **INTENT**: 선택된 시나리오 문서를 기반으로 Dify Workflow DSL(YAML) 자동 생성
- **ARGS**: 사용자 요청 원문 전달 (시나리오 파일 경로, 출력 디렉토리 등)
- **RETURN**: DSL 생성 완료 후 사용자에게 결과 보고

## 사용 예시

```
/abra:dsl-generate
```

scenario.md 파일이 `output/` 디렉토리에 존재하면 DSL 생성을 시작함.
파일이 없으면 자동으로 scenario 스킬로 위임됨.
