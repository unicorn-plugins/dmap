---
name: setup
description: DMAP 빌더 플러그인 초기 설정
type: setup
user-invocable: true
---

# Setup

[SETUP 활성화]

---

## 목표

DMAP 빌더 플러그인의 초기 설정을 수행함.
이 플러그인은 외부 도구 의존성이 없으므로 도구 설치 과정 없이 활성화 확인 및 환경 설정을 수행.

[Top](#setup)

---

## 선행 요구사항

ext-abra 스킬을 사용하려면 Abra 플러그인이 설치되어 있어야 함.

### Abra 플러그인 설치 확인

다음 명령으로 Abra 플러그인 설치 여부를 확인:

```bash
claude plugin list
```

### Abra 플러그인 설치

Abra 플러그인이 미설치된 경우 다음 명령으로 설치:

```bash
claude plugin marketplace add unicorn-plugins/abra
```
```bash
claude plugin install abra@abra
```

[Top](#setup)

---

## 활성화 조건

사용자가 `/dmap:setup` 호출 시.

[Top](#setup)

---

## 워크플로우

### Step 1: 플러그인 활성화 확인

플러그인이 정상 로드되었는지 확인함.

- `.claude-plugin/plugin.json` 존재 확인
- `skills/` 디렉토리 존재 확인
- `commands/` 디렉토리 존재 확인

### Step 2: 표준 문서 접근성 확인

DMAP 표준 문서에 접근 가능한지 확인함.

- `standards/plugin-standard.md` 존재 확인
- `standards/plugin-standard-agent.md` 존재 확인
- `standards/plugin-standard-skill.md` 존재 확인
- `standards/plugin-standard-gateway.md` 존재 확인
- `resources/plugin-resources.md` 존재 확인

### Step 3: dmap-web 마크다운 렌더링 설정

dmap-web 프로젝트의 마크다운 렌더링을 위한 필수 패키지를 설정함.

**실행 조건:**
- `dmap-web/packages/frontend` 디렉토리가 존재하는 경우에만 수행

**수행 작업:**

1. `@tailwindcss/typography` 패키지 설치 확인:
   ```bash
   cd dmap-web/packages/frontend && npm list @tailwindcss/typography
   ```

2. 미설치 시 패키지 설치:
   ```bash
   cd dmap-web/packages/frontend && npm install @tailwindcss/typography
   ```

3. `tailwind.config.js` 플러그인 설정 확인:
   ```js
   plugins: [
     require('@tailwindcss/typography'),
   ],
   ```

4. 미설정 시 플러그인 추가:
   - `plugins: []`를 찾아서 `require('@tailwindcss/typography')` 추가

**이유:**
- `MessageBubble.tsx`에서 `prose` 클래스를 사용하여 마크다운을 렌더링함
- `prose` 클래스는 `@tailwindcss/typography` 플러그인이 제공함
- 플러그인 미설치 시 마크다운이 일반 텍스트로만 표시됨

### Step 4: 설정 완료 보고

확인 결과를 사용자에게 보고함.

**출력 형식:**

```
✅ DMAP 빌더 플러그인 설정 완료

플러그인 상태:
- 플러그인 매니페스트: 확인
- 스킬 디렉토리: 확인
- 표준 문서: 전체 접근 가능
- dmap-web 마크다운 렌더링: 확인 (조건부)

사용 가능한 명령:
- /dmap:develop-plugin  — DMAP 플러그인 개발
- /dmap:team-planner    — 팀 기획서 작성 지원
- /dmap:publish         — 플러그인 배포
- /dmap:help            — 사용 안내
- /dmap:setup           — 초기 설정 (현재 실행 완료)
```

[Top](#setup)

---

## 적용 범위

현재 프로젝트에만 적용.

[Top](#setup)

---

## MUST 규칙

| # | 규칙 |
|---|------|
| 1 | 플러그인 매니페스트(`.claude-plugin/plugin.json`) 존재를 반드시 확인 |
| 2 | 표준 문서 5종 접근성을 모두 확인 후 결과 보고 |
| 3 | 설정 완료 메시지에 사용 가능한 명령 목록을 포함 |

[Top](#setup)

---

## MUST NOT 규칙

| # | 금지 사항 |
|---|----------|
| 1 | 프로젝트 소스 파일 생성/수정/삭제 수행 금지 — 존재 확인만 수행 (단, 셸 프로필에 환경변수 추가는 허용) |
| 2 | 외부 네트워크 요청 수행 금지 |
| 3 | 표준 문서의 내용을 해석하거나 요약하지 않음 — 접근성만 확인 |

[Top](#setup)

---

## 검증 체크리스트

- [ ] `.claude-plugin/plugin.json` 존재 확인 로직 포함
- [ ] `skills/` 디렉토리 존재 확인 로직 포함
- [ ] `commands/` 디렉토리 존재 확인 로직 포함
- [ ] 표준 문서 5종 경로가 정확한가
- [ ] dmap-web 디렉토리 존재 시 마크다운 렌더링 설정 수행
- [ ] `@tailwindcss/typography` 패키지 설치 확인 및 설치
- [ ] `tailwind.config.js` 플러그인 설정 확인 및 추가
- [ ] 설정 완료 출력 형식에 명령 목록 포함
- [ ] 에이전트 위임 없이 직접 수행하는 구조인가

[Top](#setup)
