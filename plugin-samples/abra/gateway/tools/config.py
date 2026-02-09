"""Dify MCP Server 설정"""
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


@dataclass
class DifyConfig:
    """Dify Console API 접속 설정"""
    base_url: str = os.getenv("DIFY_BASE_URL", "http://localhost")
    email: str = os.getenv("DIFY_EMAIL", "")
    password: str = os.getenv("DIFY_PASSWORD", "")
    admin_api_key: str = os.getenv("DIFY_ADMIN_API_KEY", "")
    workspace_id: str = os.getenv("DIFY_WORKSPACE_ID", "")

    @property
    def console_api_url(self) -> str:
        """Console API base URL"""
        return f"{self.base_url.rstrip('/')}/console/api"

    @property
    def use_admin_key(self) -> bool:
        """Admin API Key 사용 여부"""
        return bool(self.admin_api_key)
