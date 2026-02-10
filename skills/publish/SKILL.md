---
name: publish
description: 개발 완료된 플러그인을 GitHub에 배포
type: setup
user-invocable: true
---

# Publish

[PUBLISH 활성화]

## 목표

개발 완료된 DMAP 플러그인을 GitHub 원격 저장소에 배포하고,
사용자가 마켓플레이스를 통해 플러그인을 바로 설치할 수 있도록 안내함.

## 활성화 조건

사용자가 `/dmap:publish` 호출 시 또는 develop-plugin 스킬의 Phase 4 완료 후 연결 시.
"배포", "publish", "GitHub에 올려줘", "플러그인 등록" 키워드 감지 시.

## 참조

| 문서 | 경로 | 용도 |
|------|------|------|
| GitHub 계정 가이드 | `resources/guides/github/github-account-setup.md` | 계정 생성 안내 |
| GitHub 토큰 가이드 | `resources/guides/github/github-token-guide.md` | PAT 생성 안내 |
| GitHub Organization 가이드 | `resources/guides/github/github-organization-guide.md` | Organization 생성 안내 |

## 워크플로우

### Step 1: GitHub 인증 정보 수집

사용자에게 GitHub 인증 정보를 수집함.

AskUserQuestion 도구로 다음 정보를 순차적으로 문의:

1. **GitHub 계정 보유 여부**
   - 보유: 다음 단계로 진행
   - 미보유: 계정 생성 가이드 링크 제공 후 대기
     `resources/guides/github/github-account-setup.md` 참조 안내

2. **GitHub Username** 입력 요청

3. **Personal Access Token (PAT)** 입력 요청
   - 미보유 시: 토큰 생성 가이드 링크 제공
     `resources/guides/github/github-token-guide.md` 참조 안내
   - PAT 필요 권한: `repo` (전체)

4. **Organization 사용 여부**
   - 개인 계정 사용: username을 owner로 설정
   - Organization 사용: org 이름 입력 요청
   - Organization 미보유 시: 생성 가이드 링크 제공
     `resources/guides/github/github-organization-guide.md` 참조 안내

5. **토큰 저장**
   - 플러그인 디렉토리에 `.dmap/secrets/` 디렉토리 생성
   - `.dmap/secrets/git-token-{plugin-name}.env` 파일에 저장:
     ```
     GITHUB_USERNAME={username}
     GITHUB_TOKEN={token}
     GITHUB_OWNER={owner}
     ```
   - `.gitignore`에 `.dmap/secrets/` 패턴이 포함되어 있는지 확인, 없으면 추가

### Step 2: gh CLI 설치 및 인증

gh CLI 설치 여부를 확인하고 필요 시 설치함.

1. `gh --version` 명령으로 설치 확인
2. 미설치 시:
   - Windows: `winget install --id GitHub.cli` 실행
   - macOS: `brew install gh` 실행
   - Linux: 공식 설치 스크립트 실행
3. `gh auth login --with-token` 명령으로 토큰 인증
   - Step 1에서 저장된 토큰 사용

### Step 3: 원격 저장소 생성

GitHub에 원격 저장소를 생성함.

1. 저장소명 결정: 플러그인명 사용 (plugin.json의 name 필드)
2. 저장소 존재 여부 확인: `gh repo view {owner}/{repo-name}` 실행
   - 이미 존재: Step 4로 진행 (멱등성 보장)
   - 미존재: 신규 생성
3. 저장소 생성:
   ```
   gh repo create {owner}/{repo-name} --public --description "{plugin description}"
   ```
   - Organization 사용 시: `gh repo create {org}/{repo-name} ...`
   - 개인 계정 시: `gh repo create {username}/{repo-name} ...`

### Step 4: 로컬 Git 초기화 및 Push

플러그인 디렉토리를 Git 저장소로 초기화하고 원격에 Push함.

1. 플러그인 디렉토리로 이동
2. `.gitignore` 존재 확인 (develop-plugin에서 이미 생성됨)
3. Git 초기화 및 Push:
   ```
   git init
   git add .
   git commit -m "Initial commit: {plugin-name} DMAP plugin"
   git branch -M main
   git remote add origin https://github.com/{owner}/{repo-name}.git
   git push -u origin main
   ```
4. 이미 git 저장소인 경우:
   ```
   git add .
   git commit -m "Update: {plugin-name} DMAP plugin"
   git push
   ```

### Step 5: 완료 메시지 및 플러그인 등록 안내

Git Push 완료 후 다음 내용을 출력함.

**축하 메시지 (감성적으로):**

```
🎉 축하합니다!

당신의 플러그인 '{plugin-name}'이 세상에 첫 발을 내딛었습니다.
아이디어에서 시작해 요구사항 정의, 설계, 개발, 그리고 배포까지 —
모든 여정을 함께 해서 기뻤습니다.

이제 누구나 당신의 플러그인을 설치하고 사용할 수 있습니다.
```

**플러그인 등록 방법 안내:**

```
📦 플러그인 설치 방법 (사용자에게 공유하세요)

# 1. GitHub 저장소를 마켓플레이스로 등록
claude plugin marketplace add {owner}/{repo-name}

# 2. 플러그인 설치
claude plugin add {plugin-name}@{repo-name}

# 3. 설치 확인
claude plugin list
```

**README 참조 안내:**

```
📖 자세한 설치·사용법은 README.md를 참고하세요:
   https://github.com/{owner}/{repo-name}/blob/main/README.md
```

## 사용자 상호작용

모든 단계에서 AskUserQuestion 도구를 사용하여 사용자 입력을 수집함.
특히 Step 1의 인증 정보는 민감 정보이므로 안전한 저장을 보장함.

## 문제 해결

| 문제 | 해결 방법 |
|------|----------|
| gh CLI 설치 실패 | 수동 설치 안내: https://cli.github.com/ |
| 인증 실패 | 토큰 권한(repo) 확인, 토큰 재생성 안내 |
| 저장소 생성 실패 | Organization 권한 확인, 이름 중복 확인 |
| Push 실패 | 원격 저장소 URL 확인, 인증 토큰 확인 |
