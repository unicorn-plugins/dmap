"""Dify Console API 클라이언트"""
import base64
import logging
from typing import Any

import httpx

from config import DifyConfig

logger = logging.getLogger(__name__)


class DifyClientError(Exception):
    """Dify API 호출 오류"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")


class DifyClient:
    """Dify Console API 비동기 클라이언트"""

    def __init__(self, config: DifyConfig):
        self.config = config
        self._authenticated = False
        self._csrf_token: str | None = None
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            # cookies=True: httpx가 쿠키를 자동 관리 (쿠키 기반 인증)
            self._client = httpx.AsyncClient(timeout=30.0, cookies=httpx.Cookies())
        return self._client

    async def _ensure_authenticated(self):
        """인증 토큰 확보 (쿠키 기반 + CSRF 토큰)"""
        if self._authenticated:
            return
        if self.config.use_admin_key:
            self._authenticated = True
            return
        # Login with email/password (Base64 인코딩 필수)
        client = await self._get_client()
        encoded_password = base64.b64encode(self.config.password.encode()).decode()
        resp = await client.post(
            f"{self.config.console_api_url}/login",
            json={
                "email": self.config.email,
                "password": encoded_password,
                "remember_me": False,
            },
        )
        if resp.status_code != 200:
            raise DifyClientError(resp.status_code, f"Login failed: {resp.text}")
        # 쿠키에서 CSRF 토큰 추출 (httpx가 access_token/refresh_token 쿠키를 자동 저장)
        self._csrf_token = resp.cookies.get("csrf_token")
        # httpx 쿠키 저장소에 로그인 쿠키 반영
        client.cookies.update(resp.cookies)
        self._authenticated = True
        logger.info("Dify 로그인 성공")

    def _headers(self) -> dict[str, str]:
        """인증 헤더 생성"""
        headers: dict[str, str] = {}
        if self.config.use_admin_key:
            headers["Authorization"] = f"Bearer {self.config.admin_api_key}"
            if self.config.workspace_id:
                headers["X-WORKSPACE-ID"] = self.config.workspace_id
        elif self._csrf_token:
            headers["X-CSRF-Token"] = self._csrf_token
        return headers

    async def _request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        """API 요청 공통 메서드"""
        await self._ensure_authenticated()
        client = await self._get_client()
        url = f"{self.config.console_api_url}{path}"
        resp = await client.request(method, url, headers=self._headers(), **kwargs)
        if resp.status_code == 401:
            # Token expired, retry login
            self._authenticated = False
            self._csrf_token = None
            await self._ensure_authenticated()
            resp = await client.request(method, url, headers=self._headers(), **kwargs)
        if resp.status_code >= 400:
            raise DifyClientError(resp.status_code, resp.text)
        return resp.json()

    # ========== App Management ==========

    async def list_apps(self, mode: str = "all", page: int = 1, limit: int = 20) -> dict:
        """앱 목록 조회"""
        return await self._request("GET", "/apps", params={"mode": mode, "page": page, "limit": limit})

    async def get_app(self, app_id: str) -> dict:
        """앱 상세 조회"""
        return await self._request("GET", f"/apps/{app_id}")

    # ========== DSL Import/Export ==========

    async def export_dsl(self, app_id: str, include_secret: bool = False) -> str:
        """DSL 내보내기 (YAML 문자열 반환)"""
        result = await self._request("GET", f"/apps/{app_id}/export", params={"include_secret": str(include_secret).lower()})
        return result.get("data", "")

    async def import_dsl(self, yaml_content: str, name: str | None = None, description: str | None = None, app_id: str | None = None) -> dict:
        """DSL 가져오기 (신규 생성 또는 기존 앱 덮어쓰기)"""
        body: dict[str, Any] = {
            "mode": "yaml-content",
            "yaml_content": yaml_content,
        }
        if name:
            body["name"] = name
        if description:
            body["description"] = description
        if app_id:
            body["app_id"] = app_id
        return await self._request("POST", "/apps/imports", json=body)

    async def confirm_import(self, import_id: str) -> dict:
        """대기 중인 가져오기 확인"""
        return await self._request("POST", f"/apps/imports/{import_id}/confirm")

    # ========== Workflow ==========

    async def get_draft_workflow(self, app_id: str) -> dict:
        """드래프트 워크플로우 조회"""
        return await self._request("GET", f"/apps/{app_id}/workflows/draft")

    async def update_draft_workflow(self, app_id: str, graph: dict, features: dict | None = None, hash: str | None = None, environment_variables: list | None = None, conversation_variables: list | None = None) -> dict:
        """드래프트 워크플로우 수정"""
        body: dict[str, Any] = {"graph": graph}
        if features is not None:
            body["features"] = features
        if hash is not None:
            body["hash"] = hash
        if environment_variables is not None:
            body["environment_variables"] = environment_variables
        if conversation_variables is not None:
            body["conversation_variables"] = conversation_variables
        return await self._request("POST", f"/apps/{app_id}/workflows/draft", json=body)

    async def publish_workflow(self, app_id: str, marked_name: str | None = None, marked_comment: str | None = None) -> dict:
        """워크플로우 배포"""
        body: dict[str, Any] = {}
        if marked_name:
            body["marked_name"] = marked_name
        if marked_comment:
            body["marked_comment"] = marked_comment
        return await self._request("POST", f"/apps/{app_id}/workflows/publish", json=body)

    async def list_workflow_versions(self, app_id: str, page: int = 1, limit: int = 10) -> dict:
        """워크플로우 버전 목록"""
        return await self._request("GET", f"/apps/{app_id}/workflows", params={"page": page, "limit": limit})

    async def close(self):
        """HTTP 클라이언트 종료"""
        if self._client:
            await self._client.aclose()
            self._client = None
