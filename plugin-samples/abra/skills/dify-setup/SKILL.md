---
name: dify-setup
description: Dify 로컬 환경 구축 (Docker Compose)
user-invocable: true
disable-model-invocation: true
---

# dify-setup

[dify-setup 활성화]

## 목표

Docker Compose를 사용하여 Dify 로컬 개발 환경을 구축함.
Docker 설치 확인 → Dify 소스 클론 → 환경 변수 파일 생성 → 컨테이너 실행 → 헬스체크 → 초기 설정 안내 순으로 진행.

## 활성화 조건

사용자가 `/abra:dify-setup` 명령을 호출하거나 "Dify 설치", "Docker 실행", "Dify 환경" 키워드 감지 시.

## 사전 요구사항

| 항목 | 최소 사양 |
|------|----------|
| CPU | 2 Core 이상 |
| RAM | 4 GiB 이상 |
| Docker | 설치 필요 |
| Docker Compose | 설치 필요 |

## 워크플로우

### Step 1: Docker 확인

`docker --version`과 `docker compose version` 명령으로 Docker 설치 여부 확인.

**미설치 시 동작:**
- Docker Desktop 설치 안내 URL 제공:
  - Windows/macOS: https://docs.docker.com/desktop/
  - Linux: https://docs.docker.com/engine/install/
- 설치 안내 후 즉시 중단 (사용자가 설치 완료 후 재실행 필요)

### Step 2: Dify 소스 확인

AskUserQuestion으로 Dify 설치 위치 확인 (기본값: `~/workspace/dify`).

**설치 위치가 없는 경우:**
```bash
git clone https://github.com/langgenius/dify.git {설치_위치}
```

**이미 설치된 경우:**
- 기존 디렉토리 사용

### Step 3: 환경 변수 파일 생성

```bash
cd {설치_위치}/docker
cp .env.example .env
```

`.env` 파일이 이미 있으면 건너뜀 (기존 설정 보존).

### Step 4: Docker Compose 실행

```bash
cd {설치_위치}/docker
docker compose up -d
```

### Step 5: 컨테이너 상태 확인 및 헬스체크

1. `docker compose ps` 명령으로 컨테이너 상태 확인
2. HTTP 헬스체크 (최대 60초 대기):
   ```bash
   curl -f http://localhost/install || echo "Health check failed"
   ```

**컨테이너 시작 실패 시:**
- `docker compose logs` 명령으로 에러 로그 확인
- 주요 원인 안내:
  - 포트 충돌 (80, 443 포트 사용 중)
  - 메모리 부족
  - Docker 데몬 미실행
- 사용자에게 에러 내용 보고 후 중단

### Step 6: 초기 설정 안내

Dify 관리자 계정 생성 안내:
- 접속 URL: `http://localhost/install`
- 브라우저에서 위 URL로 접속하여 관리자 계정 생성 필요
- 계정 생성 후 `/abra:setup` 명령으로 플러그인 설정 진행

### Step 7: 결과 보고

설치 결과 요약:
- 컨테이너 상태 (실행 중인 서비스 목록)
- Dify 접속 URL (`http://localhost/install`)
- 다음 단계 안내: `/abra:setup` 명령으로 플러그인 초기 설정

**출력 형식:**
```
✅ Dify 로컬 환경 구축 완료

📦 컨테이너 상태:
- {서비스명1}: Running
- {서비스명2}: Running
...

🌐 Dify 접속 URL: http://localhost/install

📌 다음 단계:
1. 브라우저에서 http://localhost/install 접속
2. 관리자 계정 생성 (이메일, 비밀번호 설정)
3. /abra:setup 명령으로 플러그인 초기 설정 진행
```

## 사용자 상호작용

AskUserQuestion으로 Dify 설치 위치 확인 (Step 2).

## 문제 해결

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| Docker 미설치 | Docker/Docker Compose 미설치 | 설치 URL 안내 후 사용자 설치 대기 |
| 포트 충돌 (80, 443) | 다른 서비스가 포트 사용 중 | 기존 서비스 중지 또는 Dify 포트 변경 안내 |
| 컨테이너 시작 실패 | 메모리 부족, 설정 오류 | `docker compose logs` 확인 안내 |
| 헬스체크 실패 | 컨테이너 부팅 지연 | 60초 대기 후 재시도 안내 |
