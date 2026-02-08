# Runtime 표준

> **교차 참조**: 아래 상황에서 추가 문서를 로드할 것.
> - Gateway 매핑 테이블 작성이 필요하면 → `standards/plugin-standard-gateway.md`
> - 에이전트 패키지 구조가 필요하면 → `standards/plugin-standard-agent.md`
> - 전체 아키텍처 확인이 필요하면 → `standards/plugin-standard.md`

---

## 한 줄 정의

런타임(Runtime)은 에이전트를 스폰(생성·초기화)하고 실행하는 환경으로, Gateway의 매핑 테이블을 참조하여 추상 선언을 구체 구현으로 변환함.

[Top](#runtime-표준)

---

## 런타임 유형

| 런타임 | 제공자 | 특징 |
|--------|--------|------|
| Claude Code | Anthropic | CLI 기반, MCP/LSP 지원 |
| Codex CLI | OpenAI | CLI 기반 에이전트 실행 |
| Gemini CLI | Google | CLI 기반 에이전트 실행 |
| Cursor, Windsurf | 3rd party | IDE 기반 에이전트 실행 |

[Top](#runtime-표준)

---

## 실행 흐름

런타임이 에이전트를 실행하는 전체 과정:

```
① 에이전트 패키지 로드
   ├── AGENT.md       → 프롬프트
   ├── agentcard.yaml → 역량·제약·핸드오프
   └── tools.yaml     → 필요 도구 선언

② Gateway의 runtime-mapping.yaml 참조
   ├── tier: HIGH           → model 매핑
   ├── tools.yaml 선언       → 실제 도구 해석
   └── forbidden_actions     → 제외할 도구 목록

③ 실행 컨텍스트 조립
   ├── model    = 티어에서 매핑된 모델
   ├── prompt   = AGENT.md 내용
   ├── tools    = 매핑된 도구 - 금지 도구

④ 에이전트 스폰 및 실행
   ├── 허용된 도구만 사용 가능
   ├── 예산 내에서 실행
   └── 결과 반환

⑤ 후처리
   ├── handoff 조건 확인 → 필요시 다른 에이전트로 위임
   └── escalation 조건 확인 → 상위 티어로 위임
```

> **직결형 스킬 참고**: 위 실행 흐름은 위임형 스킬의 에이전트 스폰 경로임.
> 직결형 스킬(Setup, Utility)은 에이전트 스폰 없이 Gateway의 builtin 도구를 직접 사용하므로
> ①~⑤의 전체 흐름을 거치지 않음.

[Top](#runtime-표준)

---

## 런타임 책임

| 단계 | 런타임 책임 | 참조 파일 |
|------|------------|----------|
| **프롬프트 조립·주입** | AGENT.md + agentcard.yaml + tools.yaml을 합쳐 프롬프트로 주입 | `AGENT.md`, `agentcard.yaml`, `tools.yaml` |
| **모델 결정** | tier를 실제 모델로 매핑 | `agentcard.yaml` → `runtime-mapping.yaml` |
| **도구 참조 해석** | AGENT.md의 `{tool:name}`을 tools.yaml에서 확인 | `AGENT.md` → `tools.yaml` |
| **도구 매핑** | 추상 도구를 실제 도구로 변환 | `tools.yaml` → `runtime-mapping.yaml` |
| **도구 필터링** | forbidden_actions를 실제 도구로 변환 후 제외 | `agentcard.yaml` → `runtime-mapping.yaml` |
| **예산 적용** | 티어에서 매핑된 예산(토큰, 타임아웃 등) 적용 | `runtime-mapping.yaml` |
| **핸드오프 처리** | 실행 결과에 따라 다른 에이전트로 위임 | `agentcard.yaml` |
| **에스컬레이션** | 역량 초과 시 상위 티어 에이전트로 위임 | `agentcard.yaml` |

> **원칙**:
> - 런타임은 플러그인 표준의 추상 선언을 **해석만** 함 — 표준을 변경하지 않음
> - 매핑 테이블에 없는 추상 선언은 런타임 기본값으로 처리
> - 런타임별 고유 기능은 Gateway의 매핑 테이블을 확장하여 지원

[Top](#runtime-표준)

---

## 런타임 유형별 매핑 해석

런타임이 Gateway의 매핑 테이블을 해석하는 방식은 런타임 유형에 따라 다름.

| 유형 | 매핑 해석 방식 | 예시 |
|------|--------------|------|
| **LLM 런타임** | 프롬프트 기반 — 핵심 스킬이 매핑 참조 가이드를 포함 | Claude Code, Codex CLI |
| **코드 런타임** | 프로그래밍 기반 — 런타임이 YAML을 파싱하여 자동 해석 | IDE 플러그인, 커스텀 런타임 |

### LLM 런타임 권장사항

LLM 기반 런타임(Claude Code 등)은 코드로 매핑을 파싱하는 것이 아니라
**프롬프트를 읽고 따르는 방식**으로 동작함.
따라서 매핑 해석 로직을 LLM이 이해할 수 있는 형태로 제공해야 함.

**권장 2계층 구조:**

| 계층 | 위치 | 역할 | 무게 |
|------|------|------|------|
| **라우팅** | 런타임 상주 파일 (예: `CLAUDE.md`) | 플러그인별 활성화 조건만 명시 | 가벼움 (항상 로드) |
| **실행** | 핵심 스킬 (예: `core`) | 매핑 해석, 오케스트레이션 워크플로우 | 무거움 (조건 매칭 시 로드) |

이 구조가 필요한 이유:
- 활성화 조건이 핵심 스킬 안에만 있으면, 스킬을 로드하기 위해 조건을 알아야 하는 **순환 문제** 발생
- 런타임 상주 파일은 항상 로드되므로 라우팅 규칙을 배치하기에 적합
- 실제 매핑 해석 로직은 무거우므로 필요할 때만 스킬로 로드

**런타임 상주 파일 라우팅 테이블 (가벼움):**

> **런타임별 상주 파일**: Claude Code → `CLAUDE.md`, Codex CLI → `AGENTS.md` 등 런타임마다 다름.

```markdown
## 플러그인 활성화 조건

| 조건 | 플러그인 | 진입 스킬 |
|------|---------|----------|
| 코드 품질 분석 요청 | code-quality | core |
| 데이터 파이프라인 작업 | data-pipeline | core |
| UI/UX 작업 | design-system | frontend |
```

**핵심 스킬 내 매핑 해석 가이드 (무거움):**
- 에이전트 스폰 시 `runtime-mapping.yaml`의 `tier_mapping`을 참조하여 모델 + 예산 결정
- 에이전트에 도구 할당 시 `tool_mapping`을 참조하여 실제 도구 해석
- `agentcard.yaml`의 `forbidden_actions`를 `action_mapping`으로 변환하여 도구 제외

이 패턴은 모든 플러그인 매핑을 항상 로드하지 않고, 필요한 플러그인만 선택적으로 참조하여
토큰 소비를 최소화함.

### 코드 런타임 권장사항

프로그래밍 기반 런타임은 `runtime-mapping.yaml`을 직접 파싱하여 매핑 로직을 구현함.
별도의 프롬프트 가이드가 불필요하며, 런타임 구현체가 매핑 해석을 내장함.

[Top](#runtime-표준)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 런타임은 표준의 추상 선언을 해석만 함 — 표준을 변경하지 않음 |
| 2 | 매핑 테이블에 없는 추상 선언은 런타임 기본값으로 처리 |
| 3 | 에이전트 스폰 시 반드시 AGENT.md + agentcard.yaml + tools.yaml 3파일 로드 |
| 4 | forbidden_actions를 action_mapping으로 변환하여 해당 도구 제외 |
| 5 | handoff/escalation 조건 확인하여 후처리 수행 |
| 6 | AGENT.md의 `{tool:name}` 참조를 tools.yaml → runtime-mapping.yaml 순서로 실제 도구에 해석 |

[Top](#runtime-표준)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 런타임이 플러그인 표준 파일(AGENT.md, agentcard.yaml, tools.yaml 등) 변경 금지 — 해석만 수행 |
| 2 | 매핑 테이블에 없는 도구를 에이전트에 임의 제공 금지 — 미매핑 선언은 기본값으로 처리 |

[Top](#runtime-표준)

---

## 검증 체크리스트

- [ ] 에이전트 패키지 3파일(AGENT.md, agentcard.yaml, tools.yaml) 로드 가능
- [ ] runtime-mapping.yaml의 tier_mapping으로 모델 + 예산 결정 가능
- [ ] tool_mapping으로 추상 도구→실제 도구 변환 가능
- [ ] action_mapping으로 forbidden_actions→실제 도구 제외 가능
- [ ] handoff 조건에 따른 에이전트 간 위임 처리 가능
- [ ] escalation 조건에 따른 상위 티어 위임 처리 가능
- [ ] AGENT.md의 `{tool:name}` 참조가 tools.yaml → runtime-mapping.yaml로 해석 가능

[Top](#runtime-표준)
