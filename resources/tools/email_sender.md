# email_sender

- [email_sender](#email_sender)
  - [기본 정보](#기본-정보)
  - [설치 정보](#설치-정보)
  - [환경 변수](#환경-변수)
  - [명령어](#명령어)
  - [사용 예시](#사용-예시)

---

## 기본 정보

| 항목 | 값 |
|------|---|
| 도구명 | email_sender |
| 카테고리 | 커스텀 앱 |
| 설명 | smtplib를 사용하여 SMTP 서버를 통해 이메일 발송 |
| 소스 경로 | `resources/tools/customs/general/email_sender.py` |

email_sender는 Python 표준 라이브러리만을 사용하여 이메일을 발송하는 도구임. 일반 텍스트 및
HTML 형식의 본문을 지원하며, SMTP 설정을 환경 변수 또는 함수 파라미터로 제공할 수 있음.

[Top](#email_sender)

---

## 설치 정보

| 항목 | 값 |
|------|---|
| 설치 방법 | 소스 파일 포함 (추가 의존성 없음) |
| 의존성 | Python 표준 라이브러리 (smtplib, email.mime) |
| 검증 명령 | `python resources/tools/customs/general/email_sender.py` |

email_sender는 Python 표준 라이브러리만 사용하므로 추가 패키지 설치가 불필요함.
Python 3.6 이상 버전 필요.

[Top](#email_sender)

---

## 환경 변수

| 변수명 | 필수 | 설명 | 기본값 |
|--------|:----:|------|--------|
| `SMTP_SERVER` | 필수 | SMTP 서버 주소 (예: smtp.gmail.com) | - |
| `SMTP_PORT` | 선택 | SMTP 포트 번호 | 587 |
| `SMTP_USER` | 필수 | SMTP 인증 사용자 (발신자 이메일) | - |
| `SMTP_PASSWORD` | 필수 | SMTP 인증 비밀번호 | - |

환경 변수는 시스템 환경 또는 `.env` 파일에 설정 가능. 함수 호출 시 파라미터로 직접
전달하면 환경 변수를 오버라이드함.

Gmail 사용 시 예시:
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

[Top](#email_sender)

---

## 명령어

| 파라미터 | 필수 | 설명 | 기본값 |
|---------|:----:|------|--------|
| `<to>` | 필수 | 수신자 이메일 주소 | - |
| `<subject>` | 필수 | 이메일 제목 | - |
| `<body_text>` | 필수 | 이메일 본문 (텍스트 형식) | - |
| `<body_html>` | 선택 | 이메일 본문 (HTML 형식) | - |

일반 텍스트와 HTML 형식을 모두 제공하면 클라이언트에서 HTML을 우선 표시함.

[Top](#email_sender)

---

## 사용 예시

### 기본 사용 (텍스트 이메일)

```bash
export SMTP_SERVER=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password

python resources/tools/customs/general/email_sender.py \
  "recipient@example.com" \
  "안녕하세요" \
  "이것은 테스트 이메일입니다."
```

### HTML 이메일 발송

```bash
python resources/tools/customs/general/email_sender.py \
  "recipient@example.com" \
  "환영합니다" \
  "환영합니다." \
  "<h1>환영합니다</h1><p>이것은 HTML 이메일입니다.</p>"
```

### Python에서 직접 호출

```python
from resources.tools.customs.general.email_sender import send_email

success = send_email(
    to="recipient@example.com",
    subject="테스트 이메일",
    body_text="일반 텍스트 본문",
    body_html="<h1>HTML 본문</h1>",
    smtp_server="smtp.gmail.com",
    smtp_port=587,
    smtp_user="your-email@gmail.com",
    smtp_password="your-app-password"
)

if success:
    print("이메일 발송 성공")
else:
    print("이메일 발송 실패")
```

### 환경 변수 파일 사용

`.env` 파일 생성:
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

쉘 스크립트에서 로드:
```bash
set -a
source .env
set +a

python resources/tools/customs/general/email_sender.py \
  "recipient@example.com" \
  "메시지" \
  "본문입니다"
```

[Top](#email_sender)
