#!/usr/bin/env python3
"""
Email Sender

smtplib를 사용하여 이메일을 발송하는 도구.
환경 변수로 SMTP 설정을 받음.
"""

import sys
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


def send_email(
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    smtp_server: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None
) -> bool:
    """
    이메일 발송

    Args:
        to: 수신자 이메일
        subject: 제목
        body_text: 본문 (텍스트)
        body_html: 본문 (HTML, 선택)
        smtp_server: SMTP 서버 (환경 변수 SMTP_SERVER 또는 인자)
        smtp_port: SMTP 포트 (환경 변수 SMTP_PORT 또는 인자, 기본: 587)
        smtp_user: SMTP 사용자 (환경 변수 SMTP_USER 또는 인자)
        smtp_password: SMTP 비밀번호 (환경 변수 SMTP_PASSWORD 또는 인자)

    Returns:
        성공 여부
    """
    smtp_server = smtp_server or os.getenv("SMTP_SERVER")
    smtp_port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
    smtp_user = smtp_user or os.getenv("SMTP_USER")
    smtp_password = smtp_password or os.getenv("SMTP_PASSWORD")

    if not all([smtp_server, smtp_user, smtp_password]):
        print("Error: SMTP configuration missing. Set SMTP_SERVER, SMTP_USER, SMTP_PASSWORD environment variables.", file=sys.stderr)
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = to

        part1 = MIMEText(body_text, 'plain')
        msg.attach(part1)

        if body_html:
            part2 = MIMEText(body_html, 'html')
            msg.attach(part2)

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to, msg.as_string())

        print(f"Email sent successfully to {to}")
        return True

    except Exception as e:
        print(f"Error sending email: {e}", file=sys.stderr)
        return False


def main():
    """CLI 진입점"""
    if len(sys.argv) < 4:
        print("Usage: email_sender.py <to> <subject> <body_text> [<body_html>]")
        print("Environment variables: SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD")
        sys.exit(1)

    to = sys.argv[1]
    subject = sys.argv[2]
    body_text = sys.argv[3]
    body_html = sys.argv[4] if len(sys.argv) > 4 else None

    success = send_email(to, subject, body_text, body_html)

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
