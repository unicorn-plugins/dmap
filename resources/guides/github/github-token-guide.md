# GitHub Personal Access Token 생성 가이드

- [GitHub Personal Access Token 생성 가이드](#github-personal-access-token-생성-가이드)
  - [PAT 개요](#pat-개요)
  - [PAT 생성 절차](#pat-생성-절차)
  - [토큰 보안 주의사항](#토큰-보안-주의사항)
  - [토큰 갱신 방법](#토큰-갱신-방법)

---

## PAT 개요

Personal Access Token(PAT)은 GitHub API 및 명령줄(CLI) 접근 시 비밀번호 대신 사용하는 인증 수단임.

**사용 목적:**
- Git CLI에서 HTTPS 방식으로 push/pull 수행
- GitHub API 호출 시 인증
- CI/CD 파이프라인에서 자동 배포
- 서드파티 애플리케이션과 GitHub 연동

**PAT vs 비밀번호:**
- PAT는 특정 권한(scope)만 부여 가능 (보안성 향상)
- 만료 기간 설정 가능
- 언제든지 revoke(폐기) 가능
- 2021년 8월부터 비밀번호를 통한 Git 인증이 deprecated됨

[Top](#github-personal-access-token-생성-가이드)

---

## PAT 생성 절차

Personal Access Token 생성은 다음 단계로 진행됨:

**1. GitHub 로그인**
- [https://github.com](https://github.com)에 접속하여 로그인

**2. Settings 페이지 접근**
- 우측 상단 프로필 아이콘 클릭 → `Settings` 선택

**3. Developer Settings 이동**
- 좌측 사이드바 하단 `Developer settings` 클릭

**4. Personal Access Tokens 선택**
- `Personal access tokens` 확장 → `Tokens (classic)` 클릭

**5. 새 토큰 생성 시작**
- 우측 상단 `Generate new token` → `Generate new token (classic)` 선택
- 비밀번호 재입력 요구 시 입력

**6. 토큰 정보 입력**

   **Note (토큰 설명):**
   - 토큰의 용도를 명확히 작성 (예: "DMAP Plugin Deploy", "CI/CD Pipeline")
   - 나중에 여러 토큰을 구분할 때 유용함

   **Expiration (만료 기간):**
   - 권장: `90 days` (3개월마다 갱신하여 보안성 유지)
   - 옵션: 7일, 30일, 60일, 90일, Custom, No expiration
   - No expiration은 보안상 권장하지 않음

   **Select scopes (권한 선택):**
   - **`repo`** (전체 체크 필수): Private 레포지토리 포함 모든 레포지토리 접근 권한
     - `repo:status`: 커밋 상태 접근
     - `repo_deployment`: 배포 접근
     - `public_repo`: Public 레포지토리만 접근 (제한적)
     - `repo:invite`: 레포지토리 협업자 초대
     - `security_events`: 보안 이벤트 읽기/쓰기
   - 필요에 따라 추가 scope 선택:
     - `workflow`: GitHub Actions 워크플로우 수정
     - `write:packages`: 패키지 레지스트리 업로드
     - `delete:packages`: 패키지 삭제
     - `admin:org`: Organization 관리 (Organization용)
     - `gist`: Gist 생성/수정
     - `user`: 사용자 프로필 정보 읽기

**7. 토큰 생성**
- 페이지 하단 `Generate token` 버튼 클릭

**8. 토큰 복사 및 저장**
- 생성된 토큰이 화면에 표시됨 (예: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **즉시 복사하여 안전한 곳에 저장**
- ⚠️ **이 화면을 벗어나면 토큰을 다시 볼 수 없음!**
- 분실 시 토큰 재생성 필요

**9. 토큰 사용 예시**

Git CLI에서 사용:
```bash
git clone https://github.com/{username}/{repo}.git
Username: {your-username}
Password: {your-PAT}  # 비밀번호 대신 PAT 입력
```

환경 변수로 저장 (권장):
```bash
# Linux/macOS
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Windows (PowerShell)
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

[Top](#github-personal-access-token-생성-가이드)

---

## 토큰 보안 주의사항

Personal Access Token은 계정 비밀번호와 동일한 수준의 보안 자산임.
다음 보안 수칙을 반드시 준수함:

**절대 금지 사항:**
- ❌ 토큰을 코드에 직접 하드코딩
- ❌ 토큰을 Git 커밋에 포함
- ❌ 토큰을 Slack, Discord 등 메신저에 공유
- ❌ 토큰을 Public 레포지토리에 업로드
- ❌ 토큰을 메일이나 문서에 평문으로 저장

**필수 보안 조치:**

1. **`.gitignore` 등록**
   - 토큰을 저장한 파일은 반드시 `.gitignore`에 추가
   ```
   .env
   .env.local
   config/secrets.json
   *.token
   ```

2. **환경 변수 사용**
   - 토큰은 환경 변수로 관리
   - `.env` 파일 사용 시 `.gitignore`에 등록

3. **최소 권한 원칙**
   - 필요한 scope만 선택 (예: Public repo만 사용 시 `public_repo`만 체크)
   - 용도별로 별도 토큰 생성 권장

4. **만료 기간 설정**
   - No expiration은 가급적 사용하지 않음
   - 90일 주기로 토큰 갱신 권장

5. **유출 시 즉시 대응**
   - 토큰 유출이 의심되면 즉시 revoke
   - GitHub Settings → Developer settings → Personal access tokens → 해당 토큰 `Delete` 클릭
   - 새 토큰 재생성

**GitHub의 자동 스캔:**
- GitHub는 Public 레포지토리에 커밋된 토큰을 자동으로 스캔함
- 유출된 토큰은 자동으로 revoke되고 이메일 알림 발송됨
- Private 레포지토리는 자동 스캔되지 않으므로 수동 관리 필요

**토큰 저장 위치 권장사항:**

| 환경 | 권장 방법 |
|------|----------|
| 로컬 개발 | `.env` 파일 + `.gitignore` 등록 |
| CI/CD | GitHub Secrets, GitLab Variables 등 암호화된 환경 변수 |
| 서버 배포 | 환경 변수 또는 암호화된 설정 파일 |
| 팀 공유 | 비밀번호 관리 도구 (1Password, LastPass 등) |

[Top](#github-personal-access-token-생성-가이드)

---

## 토큰 갱신 방법

Personal Access Token이 만료되었거나 갱신이 필요한 경우 다음 절차를 수행함:

**만료된 토큰 확인:**
- Git 작업 시 `authentication failed` 오류 발생
- GitHub Settings → Developer settings → Personal access tokens에서 `Expired` 상태 확인

**토큰 갱신 절차:**

1. **기존 토큰 삭제 (선택사항)**
   - Settings → Developer settings → Personal access tokens
   - 만료된 토큰 우측 `Delete` 클릭
   - 또는 그대로 두고 새 토큰 생성 (자동으로 비활성화됨)

2. **새 토큰 생성**
   - 위의 "PAT 생성 절차" 동일하게 수행
   - Note에 갱신 날짜 기록 권장 (예: "DMAP Deploy - 2024-02-10")
   - 이전과 동일한 scope 선택

3. **새 토큰 복사**
   - 생성된 새 토큰을 복사

4. **기존 토큰 교체**
   - `.env` 파일, 환경 변수, CI/CD 설정 등에서 기존 토큰을 새 토큰으로 교체
   - 여러 곳에서 사용 중이라면 모두 업데이트 필요

5. **동작 확인**
   - `git push` 또는 API 호출로 새 토큰 정상 작동 확인

**토큰 관리 팁:**
- 토큰 생성 시 Note에 만료 예정일 기록 (예: "Expires on 2024-05-10")
- 달력에 갱신 알림 설정하여 만료 전에 갱신
- 여러 프로젝트에서 동일 토큰 사용 시 갱신 시점에 모두 업데이트 필요
- 정기 갱신 자동화 고려 (Organization의 경우 GitHub App 사용 권장)

[Top](#github-personal-access-token-생성-가이드)
