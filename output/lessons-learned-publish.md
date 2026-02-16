# Lessons Learned: publish 스킬 보안 개선

**날짜**: 2025-02-17
**플러그인**: spec-driven-team
**작업**: publish 스킬 실행 중 보안 취약점 발견 및 수정

---

## 문제 발견

### 1. 보안 취약점: 원격 URL에 토큰 노출

**발생 상황**:
- `create_repo.py` 도구 실행 시 Git 원격 저장소 URL 설정
- 토큰이 URL에 직접 포함되는 형태로 설정됨

**문제 코드**:
```python
# create_repo.py 내부
remote_url = f"https://{token}@github.com/{owner}/{repo}.git"
subprocess.run(['git', 'remote', 'add', 'origin', remote_url])
```

**결과**:
```bash
$ git remote -v
origin  https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/unicorn-plugins/spec-driven-team.git (fetch)
origin  https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/unicorn-plugins/spec-driven-team.git (push)
```

**심각도**: 🔴 **Critical**
- `git remote -v` 명령으로 누구나 토큰 확인 가능
- 로컬 개발자 또는 저장소 접근자가 토큰 탈취 가능

### 2. 수동 복구 필요

**현재 프로세스**:
1. publish 스킬 Step 2 완료 (Git Push 성공)
2. security-review 스킬 부스팅 실행
3. 보안 검증에서 Critical 발견
4. **수동으로** `git remote set-url origin https://github.com/...` 실행
5. 사용자에게 PAT 폐기 안내

**문제점**:
- 자동화된 배포 프로세스에 수동 개입 필요
- 사용자가 보안 이슈를 인지하지 못할 수 있음

---

## 해결 방안

### 1. create_repo.py 수정 (High Priority)

**목표**: 원격 URL에서 토큰 완전 제거

**수정 전**:
```python
remote_url = f"https://{token}@github.com/{owner}/{repo}.git"
subprocess.run(['git', 'remote', 'add', 'origin', remote_url], check=True)
subprocess.run(['git', 'push', '-u', 'origin', 'main'], check=True)
```

**수정 후**:
```python
# 1. 원격 URL은 토큰 없이 설정
remote_url = f"https://github.com/{owner}/{repo}.git"
subprocess.run(['git', 'remote', 'add', 'origin', remote_url], check=True)

# 2. Push 시에만 토큰 사용 (환경변수 또는 일회성)
push_url = f"https://{token}@github.com/{owner}/{repo}.git"
subprocess.run(['git', 'push', '-u', push_url, 'main'], check=True)

# 또는 Git credential helper 사용
subprocess.run(['git', 'config', 'credential.helper', 'store'], check=True)
# credential helper가 토큰을 안전하게 저장 관리
```

**파일 위치**: `resources/tools/customs/git/create_repo.py`

### 2. publish 스킬에 자동 검증 추가 (Medium Priority)

**목표**: Step 2 완료 후 즉시 원격 URL 검증, 토큰 발견 시 자동 수정

**수정 파일**: `skills/publish/SKILL.md`

**추가 내용** (Step 2 마지막에):
```markdown
### Step 2.5: 원격 URL 보안 검증 (자동)

`create_repo.py` 또는 수동 Push 완료 후 즉시 실행:

1. 원격 URL 확인:
   ```
   git remote -v
   ```

2. 토큰 패턴 감지:
   - `ghp_`, `github_pat_`, `gho_`, `ghu_` 등
   - 정규식: `https://[^@]+@github.com/`

3. 토큰 발견 시 자동 수정:
   ```
   git remote set-url origin https://github.com/{owner}/{repo}.git
   ```

4. 사용자에게 알림:
   "⚠️ 원격 URL에서 토큰이 발견되어 제거했습니다. 해당 토큰을 폐기하세요."
```

### 3. Git credential helper 또는 SSH 전환 (Low Priority)

**Git credential helper 설정**:
```bash
git config --global credential.helper store
# 또는 cache (일정 시간 후 만료)
git config --global credential.helper 'cache --timeout=3600'
```

**SSH 키 사용 (권장)**:
```bash
# 원격 URL을 SSH로 변경
git remote set-url origin git@github.com:{owner}/{repo}.git
```

**가이드 추가**: `resources/guides/github/github-ssh-setup.md`

---

## 적용 계획

| 우선순위 | 작업 | 예상 소요 | 담당 |
|---------|------|----------|------|
| High | `create_repo.py` 수정 및 테스트 | 1시간 | 개발팀 |
| Medium | `publish/SKILL.md` Step 2.5 추가 | 30분 | 개발팀 |
| Low | SSH 설정 가이드 작성 | 1시간 | 문서팀 |

**적용 시점**: 다음 publish 스킬 실행 전

---

## 영향 범위

### 현재 배포된 플러그인
- **spec-driven-team**: 토큰 이미 노출됨 → 사용자에게 PAT 폐기 안내 완료
- 원격 URL 수정 완료

### 향후 배포
- 모든 dmap 플러그인 배포 시 자동 적용
- 토큰 노출 위험 제거

---

## 검증 방법

### 단위 테스트
```bash
# create_repo.py 수정 후
python resources/tools/customs/git/create_repo.py --test-mode

# 검증:
# 1. git remote -v에 토큰 없음
# 2. git push 정상 작동
# 3. 로컬에 토큰 저장되지 않음 (credential helper 제외)
```

### 통합 테스트
```bash
# publish 스킬 전체 실행
/dmap:publish

# 검증:
# 1. Step 2 완료 후 원격 URL 자동 검증
# 2. 토큰 발견 시 자동 수정 및 사용자 알림
# 3. security-review에서 PASS
```

---

## 참고 자료

- [GitHub Docs: Caching credentials](https://docs.github.com/en/get-started/getting-started-with-git/caching-your-github-credentials-in-git)
- [Git Credential Helper](https://git-scm.com/docs/gitcredentials)
- [OWASP: Hardcoded Credentials](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)

---

## 결론

publish 스킬 실행 중 Critical 보안 취약점을 발견하고 즉시 수정했습니다.
향후 동일한 문제를 방지하기 위해 `create_repo.py` 도구 수정 및 publish 스킬 자동 검증 추가가 필요합니다.

**다음 액션**:
1. `create_repo.py` 수정 (High)
2. `publish/SKILL.md` Step 2.5 추가 (Medium)
3. 다음 배포 시 자동 적용 확인
