#!/usr/bin/env python3
"""
Dify Workflow DSL Validator
===========================
Dify DSL YAML 파일을 Import 전에 사전 검증하는 도구.
Dify 소스 코드의 검증 로직을 기반으로 구현.

Usage:
    python validate_dsl.py <yaml_file>
    python validate_dsl.py smart-inquiry-routing.yml
"""

import sys
import io
import json
import re

# Windows 콘솔 UTF-8 출력 설정
if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML 필요. 설치: pip install pyyaml")
    sys.exit(1)


class Severity(Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


@dataclass
class ValidationIssue:
    severity: Severity
    category: str
    message: str
    path: str = ""
    suggestion: str = ""


@dataclass
class ValidationResult:
    issues: list[ValidationIssue] = field(default_factory=list)

    def add(self, severity: Severity, category: str, message: str,
            path: str = "", suggestion: str = ""):
        self.issues.append(ValidationIssue(severity, category, message, path, suggestion))

    def error(self, category: str, message: str, path: str = "", suggestion: str = ""):
        self.add(Severity.ERROR, category, message, path, suggestion)

    def warning(self, category: str, message: str, path: str = "", suggestion: str = ""):
        self.add(Severity.WARNING, category, message, path, suggestion)

    def info(self, category: str, message: str, path: str = "", suggestion: str = ""):
        self.add(Severity.INFO, category, message, path, suggestion)

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == Severity.ERROR)

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == Severity.WARNING)

    @property
    def is_valid(self) -> bool:
        return self.error_count == 0


# ── 상수 정의 ──────────────────────────────────────────────────────

CURRENT_DSL_VERSION = "0.5.0"
DSL_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
MAX_VARIABLE_SIZE_BYTES = 200 * 1024   # 200KB

VALID_APP_MODES = {
    "completion", "chat", "advanced-chat", "agent-chat",
    "workflow", "channel", "rag-pipeline",
}

WORKFLOW_APP_MODES = {"workflow", "advanced-chat"}

VALID_NODE_TYPES = {
    "start", "end", "answer", "llm", "knowledge-retrieval",
    "knowledge-index", "if-else", "code", "template-transform",
    "question-classifier", "http-request", "tool", "datasource",
    "variable-aggregator", "variable-assigner", "loop", "loop-start",
    "loop-end", "iteration", "iteration-start", "parameter-extractor",
    "assigner", "document-extractor", "list-operator", "agent",
    "trigger-webhook", "trigger-schedule", "trigger-plugin", "human-input",
}

TRIGGER_NODE_TYPES = {"trigger-webhook", "trigger-schedule", "trigger-plugin"}

VALID_LLM_MODES = {"chat", "completion"}

VALID_CODE_LANGUAGES = {"python3", "javascript"}

VALID_CODE_OUTPUT_TYPES = {
    "string", "number", "object", "boolean",
    "array[string]", "array[number]", "array[object]", "array[boolean]",
}

VALID_HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}

VALID_VARIABLE_TYPES = {
    "string", "secret", "number", "integer", "float", "boolean",
    "object", "array[string]", "array[number]", "array[object]", "array[boolean]",
}

VALID_EDGE_SOURCE_HANDLES = {"source", "true", "false"}

VALID_COMPARISON_OPERATORS = {
    "contains", "not contains", "start with", "end with",
    "is", "is not", "empty", "not empty", "in", "not in", "all of",
    "=", "≠", ">", "<", "≥", "≤",
    "null", "not null", "exists", "not exists",
}

# 일반 기호 → Dify 유니코드 기호 매핑 (흔한 실수)
COMPARISON_OPERATOR_FIXES = {
    ">=": "≥",
    "<=": "≤",
    "!=": "≠",
}


# ── 검증 함수 ──────────────────────────────────────────────────────

def validate_yaml_structure(data: Any, result: ValidationResult) -> bool:
    """1단계: YAML 기본 구조 검증"""
    if not isinstance(data, dict):
        result.error("YAML", "YAML 데이터가 딕셔너리(매핑)가 아님",
                     suggestion="최상위 구조가 key-value 형태인지 확인")
        return False
    return True


def validate_version(data: dict, result: ValidationResult):
    """2단계: 버전 검증"""
    version = data.get("version")

    if version is None:
        result.warning("VERSION", "version 필드 누락 — Dify가 '0.1.0'으로 자동 설정",
                       path="version",
                       suggestion='version: "0.5.0" 추가 권장')
        return

    if not isinstance(version, str):
        result.error("VERSION", f"version 타입이 str이 아님: {type(version).__name__}",
                     path="version",
                     suggestion=f'version: "{version}" (따옴표로 감싸기)')
        return

    # 시맨틱 버전 파싱
    parts = version.split(".")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        result.error("VERSION", f"유효하지 않은 시맨틱 버전 형식: '{version}'",
                     path="version",
                     suggestion='형식: "X.Y.Z" (예: "0.5.0")')
        return

    imported = tuple(int(p) for p in parts)
    current = tuple(int(p) for p in CURRENT_DSL_VERSION.split("."))

    if imported > current:
        result.warning("VERSION",
                       f"DSL 버전({version})이 현재 지원 버전({CURRENT_DSL_VERSION})보다 높음 — PENDING 상태로 처리됨",
                       path="version")
    elif imported[0] < current[0]:
        result.warning("VERSION",
                       f"메이저 버전 차이 ({version} vs {CURRENT_DSL_VERSION}) — PENDING 상태로 처리됨",
                       path="version")
    elif imported[1] < current[1]:
        result.info("VERSION",
                    f"마이너 버전 차이 ({version} vs {CURRENT_DSL_VERSION}) — 경고와 함께 진행됨",
                    path="version")


def validate_kind(data: dict, result: ValidationResult):
    """kind 필드 검증"""
    kind = data.get("kind")
    if kind is None:
        result.info("KIND", "kind 필드 누락 — Dify가 'app'으로 자동 설정", path="kind")
    elif kind != "app":
        result.info("KIND", f"kind가 '{kind}'임 — Dify가 'app'으로 자동 변경", path="kind")


def validate_app_section(data: dict, result: ValidationResult) -> dict | None:
    """3단계: app 섹션 검증"""
    app_data = data.get("app")
    if app_data is None:
        result.error("APP", "app 섹션 누락", path="app",
                     suggestion="app: 섹션에 name, mode 등 필수")
        return None

    if not isinstance(app_data, dict):
        result.error("APP", "app 섹션이 딕셔너리가 아님", path="app")
        return None

    # name 검증
    name = app_data.get("name")
    if not name:
        result.warning("APP", "app.name 누락 또는 빈 문자열", path="app.name")

    # mode 검증
    mode = app_data.get("mode")
    if not mode:
        result.error("APP", "app.mode 누락", path="app.mode",
                     suggestion=f"유효한 값: {', '.join(sorted(VALID_APP_MODES))}")
        return None

    if mode not in VALID_APP_MODES:
        result.error("APP", f"유효하지 않은 app.mode: '{mode}'", path="app.mode",
                     suggestion=f"유효한 값: {', '.join(sorted(VALID_APP_MODES))}")

    # icon 검증
    icon_type = app_data.get("icon_type")
    if icon_type and icon_type not in ("image", "emoji", "link"):
        result.warning("APP", f"알 수 없는 icon_type: '{icon_type}'", path="app.icon_type")

    return app_data


def validate_workflow_section(data: dict, app_mode: str, result: ValidationResult) -> dict | None:
    """4단계: workflow 섹션 검증"""
    if app_mode not in WORKFLOW_APP_MODES:
        return None

    workflow = data.get("workflow")
    if workflow is None or not isinstance(workflow, dict):
        result.error("WORKFLOW", "workflow/advanced-chat 모드에서 workflow 섹션 필수",
                     path="workflow",
                     suggestion="workflow:\n  graph:\n    nodes: [...]\n    edges: [...]")
        return None

    return workflow


def validate_graph(workflow: dict, result: ValidationResult):
    """5단계: 그래프 구조 검증"""
    graph = workflow.get("graph")
    if graph is None or not isinstance(graph, dict):
        result.error("GRAPH", "workflow.graph 섹션 누락 또는 잘못된 형식",
                     path="workflow.graph")
        return

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    if not isinstance(nodes, list):
        result.error("GRAPH", "graph.nodes가 배열이 아님", path="workflow.graph.nodes")
        return

    if not isinstance(edges, list):
        result.error("GRAPH", "graph.edges가 배열이 아님", path="workflow.graph.edges")
        return

    if not nodes:
        result.warning("GRAPH", "노드가 없는 빈 그래프", path="workflow.graph.nodes")
        return

    # 노드 ID 수집 및 검증
    node_ids = set()
    node_types_found = set()
    has_start = False
    has_end = False

    for i, node in enumerate(nodes):
        path = f"workflow.graph.nodes[{i}]"
        _validate_node(node, i, node_ids, node_types_found, result)
        node_data = node.get("data", {})
        node_type = node_data.get("type", "")
        if node_type == "start":
            has_start = True
        if node_type == "end":
            has_end = True

    # START + 트리거 노드 공존 검증
    if has_start and node_types_found & TRIGGER_NODE_TYPES:
        result.error("GRAPH", "START 노드와 트리거 노드는 공존 불가",
                     suggestion="START 노드 또는 트리거 노드 중 하나만 사용")

    # 기본 노드 존재 확인
    if not has_start and not (node_types_found & TRIGGER_NODE_TYPES):
        result.error("GRAPH", "START 노드 또는 트리거 노드가 없음",
                     suggestion="start 타입 노드 추가 필요")

    if not has_end:
        result.warning("GRAPH", "END 노드가 없음 — 워크플로우 종료점 없음",
                       suggestion="end 타입 노드 추가 권장")

    # 엣지 검증
    for i, edge in enumerate(edges):
        _validate_edge(edge, i, node_ids, result)


def _validate_node(node: dict, index: int, node_ids: set, node_types: set,
                   result: ValidationResult):
    """개별 노드 검증"""
    path = f"workflow.graph.nodes[{index}]"

    if not isinstance(node, dict):
        result.error("NODE", f"노드가 딕셔너리가 아님", path=path)
        return

    # id 검증
    node_id = node.get("id")
    if not node_id:
        result.error("NODE", "노드 id 누락", path=path)
    elif node_id in node_ids:
        result.error("NODE", f"중복 노드 id: '{node_id}'", path=path)
    else:
        node_ids.add(node_id)

    # data 검증
    data = node.get("data")
    if data is None or not isinstance(data, dict):
        result.error("NODE", f"노드 data 섹션 누락", path=f"{path}.data")
        return

    # type 검증
    node_type = data.get("type")
    if not node_type:
        result.error("NODE", "노드 data.type 누락", path=f"{path}.data.type",
                     suggestion=f"유효한 값: {', '.join(sorted(VALID_NODE_TYPES))}")
        return

    if node_type not in VALID_NODE_TYPES:
        result.error("NODE", f"유효하지 않은 노드 타입: '{node_type}'",
                     path=f"{path}.data.type",
                     suggestion=f"유효한 값: start, end, llm, code, if-else, http-request 등")

    node_types.add(node_type)

    # title 검증 (BaseNodeData 필수)
    title = data.get("title")
    if not title:
        result.error("NODE", f"노드 title 누락 (BaseNodeData 필수 필드)",
                     path=f"{path}.data.title",
                     suggestion="모든 노드에 title 필드 필수")

    # 노드 타입별 상세 검증
    if node_type == "llm":
        _validate_llm_node(data, path, result)
    elif node_type == "code":
        _validate_code_node(data, path, result)
    elif node_type == "if-else":
        _validate_if_else_node(data, path, result)
    elif node_type == "http-request":
        _validate_http_request_node(data, path, result)
    elif node_type == "template-transform":
        _validate_template_transform_node(data, path, result)
    elif node_type == "end":
        _validate_end_node(data, path, result)
    elif node_type == "variable-aggregator":
        _validate_variable_aggregator_node(data, path, result)


def _validate_llm_node(data: dict, path: str, result: ValidationResult):
    """LLM 노드 검증"""
    # model 검증
    model = data.get("model")
    if model is None or not isinstance(model, dict):
        result.error("LLM", "model 설정 누락", path=f"{path}.data.model",
                     suggestion="model: {{ provider: '...', name: '...', mode: 'chat' }}")
        return

    if not model.get("provider"):
        result.error("LLM", "model.provider 누락", path=f"{path}.data.model.provider",
                     suggestion="예: langgenius/openai/openai, langgenius/groq/groq")

    if not model.get("name"):
        result.error("LLM", "model.name 누락", path=f"{path}.data.model.name",
                     suggestion="예: gpt-4o, llama-3.1-8b-instant")

    mode = model.get("mode")
    if mode and mode not in VALID_LLM_MODES:
        result.error("LLM", f"유효하지 않은 model.mode: '{mode}'",
                     path=f"{path}.data.model.mode",
                     suggestion="유효한 값: chat, completion")

    # prompt_template 검증
    prompt = data.get("prompt_template")
    if prompt is None:
        result.error("LLM", "prompt_template 누락", path=f"{path}.data.prompt_template")
    elif isinstance(prompt, list):
        for j, msg in enumerate(prompt):
            if isinstance(msg, dict):
                if not msg.get("role"):
                    result.warning("LLM", f"prompt_template[{j}].role 누락",
                                   path=f"{path}.data.prompt_template[{j}]")
                text = msg.get("text", "")
                # YAML folded scalar 경고
                if text and "\n" not in text and len(text) > 200:
                    result.warning("LLM",
                                   f"prompt_template[{j}].text에 줄바꿈 없음 — "
                                   "YAML '>' (folded) 대신 '|' (literal) 사용 필요할 수 있음",
                                   path=f"{path}.data.prompt_template[{j}].text")

    # context 검증
    context = data.get("context")
    if context is None:
        result.warning("LLM", "context 설정 누락 — 기본값 사용됨",
                       path=f"{path}.data.context")


def _validate_code_node(data: dict, path: str, result: ValidationResult):
    """Code 노드 검증"""
    lang = data.get("code_language")
    if lang not in VALID_CODE_LANGUAGES:
        result.error("CODE", f"유효하지 않은 code_language: '{lang}'",
                     path=f"{path}.data.code_language",
                     suggestion="유효한 값: python3, javascript")

    if not data.get("code"):
        result.error("CODE", "code 필드 누락", path=f"{path}.data.code")

    outputs = data.get("outputs")
    if outputs and isinstance(outputs, dict):
        for key, output in outputs.items():
            if isinstance(output, dict):
                out_type = output.get("type", "")
                if out_type not in VALID_CODE_OUTPUT_TYPES:
                    result.error("CODE",
                                 f"outputs.{key}.type '{out_type}' 미허용",
                                 path=f"{path}.data.outputs.{key}.type",
                                 suggestion=f"허용 값: {', '.join(sorted(VALID_CODE_OUTPUT_TYPES))}")


def _validate_if_else_node(data: dict, path: str, result: ValidationResult):
    """If/Else 노드 검증"""
    cases = data.get("cases")
    conditions = data.get("conditions")

    if not cases and not conditions:
        result.error("IF_ELSE", "cases 또는 conditions 중 하나 필수",
                     path=f"{path}.data",
                     suggestion="cases: [{case_id: '...', conditions: [...]}]")

    if cases and isinstance(cases, list):
        for j, case in enumerate(cases):
            if isinstance(case, dict):
                if not case.get("case_id"):
                    result.error("IF_ELSE", f"cases[{j}].case_id 누락",
                                 path=f"{path}.data.cases[{j}]")
                case_conditions = case.get("conditions")
                if not case_conditions:
                    result.warning("IF_ELSE", f"cases[{j}].conditions 비어있음",
                                   path=f"{path}.data.cases[{j}].conditions")
                elif isinstance(case_conditions, list):
                    for k, cond in enumerate(case_conditions):
                        if isinstance(cond, dict):
                            op = cond.get("comparison_operator", "")
                            cond_path = f"{path}.data.cases[{j}].conditions[{k}]"
                            if op and op not in VALID_COMPARISON_OPERATORS:
                                fix = COMPARISON_OPERATOR_FIXES.get(op)
                                suggestion = f"'{op}' → '{fix}' 로 변경" if fix else \
                                    f"유효한 값: {', '.join(sorted(VALID_COMPARISON_OPERATORS))}"
                                result.error("IF_ELSE",
                                             f"유효하지 않은 comparison_operator: '{op}'",
                                             path=f"{cond_path}.comparison_operator",
                                             suggestion=suggestion)


def _validate_http_request_node(data: dict, path: str, result: ValidationResult):
    """HTTP Request 노드 검증"""
    method = data.get("method", "").lower()
    if method not in VALID_HTTP_METHODS:
        result.error("HTTP", f"유효하지 않은 method: '{data.get('method')}'",
                     path=f"{path}.data.method",
                     suggestion=f"유효한 값: {', '.join(VALID_HTTP_METHODS)}")

    if not data.get("url"):
        result.error("HTTP", "url 필드 누락", path=f"{path}.data.url")

    auth = data.get("authorization")
    if auth and isinstance(auth, dict):
        auth_type = auth.get("type", "")
        auth_config = auth.get("config")
        if auth_type == "no-auth" and auth_config is not None:
            result.error("HTTP", "type이 'no-auth'이면 config은 None이어야 함",
                         path=f"{path}.data.authorization",
                         suggestion="config 필드 제거 또는 null로 설정")
        elif auth_type != "no-auth" and not isinstance(auth_config, dict):
            result.error("HTTP", f"type이 '{auth_type}'이면 config은 dict 필수",
                         path=f"{path}.data.authorization.config")


def _validate_template_transform_node(data: dict, path: str, result: ValidationResult):
    """Template Transform 노드 검증"""
    if not data.get("template"):
        result.error("TEMPLATE", "template 필드 누락", path=f"{path}.data.template")


def _validate_end_node(data: dict, path: str, result: ValidationResult):
    """End 노드 검증"""
    outputs = data.get("outputs")
    if outputs is not None and not isinstance(outputs, list):
        result.error("END", "outputs가 배열이 아님", path=f"{path}.data.outputs")


def _validate_variable_aggregator_node(data: dict, path: str, result: ValidationResult):
    """Variable Aggregator 노드 검증"""
    if not data.get("output_type"):
        result.warning("VAR_AGG", "output_type 누락", path=f"{path}.data.output_type")

    # advanced_settings.groups 필수 검증
    adv = data.get("advanced_settings")
    if adv and isinstance(adv, dict):
        if "groups" not in adv:
            result.error("VAR_AGG", "advanced_settings.groups 필드 누락 (필수)",
                         path=f"{path}.data.advanced_settings.groups",
                         suggestion="groups: [] 추가 필요")

    variables = data.get("variables")
    if variables is None:
        result.warning("VAR_AGG", "variables 누락", path=f"{path}.data.variables")
    elif isinstance(variables, list):
        for j, var in enumerate(variables):
            if not isinstance(var, list):
                result.error("VAR_AGG", f"variables[{j}]가 배열이 아님 — list[list[str]] 형식 필요",
                             path=f"{path}.data.variables[{j}]")


def _validate_edge(edge: dict, index: int, node_ids: set, result: ValidationResult):
    """엣지 검증"""
    path = f"workflow.graph.edges[{index}]"

    if not isinstance(edge, dict):
        result.error("EDGE", "엣지가 딕셔너리가 아님", path=path)
        return

    source = edge.get("source")
    target = edge.get("target")

    if not source:
        result.error("EDGE", "source 누락", path=f"{path}.source")
    elif source not in node_ids:
        result.error("EDGE", f"source '{source}'가 존재하지 않는 노드 참조",
                     path=f"{path}.source",
                     suggestion="nodes에 정의된 노드 id와 일치해야 함")

    if not target:
        result.error("EDGE", "target 누락", path=f"{path}.target")
    elif target not in node_ids:
        result.error("EDGE", f"target '{target}'가 존재하지 않는 노드 참조",
                     path=f"{path}.target",
                     suggestion="nodes에 정의된 노드 id와 일치해야 함")

    # sourceHandle 검증
    source_handle = edge.get("sourceHandle")
    if source_handle and source_handle not in VALID_EDGE_SOURCE_HANDLES:
        # case_id 형식일 수 있음 (UUID 등)
        if not re.match(r'^[a-zA-Z0-9_-]+$', source_handle):
            result.warning("EDGE", f"비표준 sourceHandle: '{source_handle}'",
                           path=f"{path}.sourceHandle")


def validate_variables(workflow: dict, var_type: str, result: ValidationResult):
    """환경변수/대화변수 검증"""
    variables = workflow.get(f"{var_type}_variables", [])
    if not isinstance(variables, list):
        return

    for i, var in enumerate(variables):
        path = f"workflow.{var_type}_variables[{i}]"
        if not isinstance(var, dict):
            result.error("VARIABLE", f"변수가 딕셔너리가 아님", path=path)
            continue

        if not var.get("name"):
            result.error("VARIABLE", "name 필드 누락", path=f"{path}.name")

        value_type = var.get("value_type")
        if not value_type:
            result.error("VARIABLE", "value_type 필드 누락", path=f"{path}.value_type")
        elif value_type not in VALID_VARIABLE_TYPES:
            result.error("VARIABLE", f"미지원 value_type: '{value_type}'",
                         path=f"{path}.value_type",
                         suggestion=f"유효한 값: {', '.join(sorted(VALID_VARIABLE_TYPES))}")

        value = var.get("value")
        if value is None and value_type != "secret":
            result.warning("VARIABLE", "value 필드 누락", path=f"{path}.value")


def validate_features(workflow: dict, app_mode: str, result: ValidationResult):
    """피처 구조 검증"""
    features = workflow.get("features")
    if features is None:
        result.info("FEATURES", "features 섹션 누락 — 기본값 사용됨",
                    path="workflow.features")
        return

    if not isinstance(features, dict):
        result.error("FEATURES", "features가 딕셔너리가 아님",
                     path="workflow.features")


def validate_dependencies(data: dict, result: ValidationResult):
    """의존성 검증"""
    deps = data.get("dependencies")
    if deps is None:
        result.info("DEPS", "dependencies 섹션 없음 — Dify가 자동 생성 가능",
                    path="dependencies")
        return

    if not isinstance(deps, list):
        result.error("DEPS", "dependencies가 배열이 아님", path="dependencies")
        return

    for i, dep in enumerate(deps):
        path = f"dependencies[{i}]"
        if not isinstance(dep, dict):
            result.error("DEPS", "의존성이 딕셔너리가 아님", path=path)
            continue

        dep_type = dep.get("type")
        if dep_type not in ("github", "marketplace", "package", None):
            result.warning("DEPS", f"알 수 없는 의존성 타입: '{dep_type}'", path=f"{path}.type")


def validate_variable_references(workflow: dict, result: ValidationResult):
    """변수 참조 일관성 검증"""
    graph = workflow.get("graph", {})
    nodes = graph.get("nodes", [])

    node_ids = {n.get("id") for n in nodes if isinstance(n, dict) and n.get("id")}

    # 모든 노드의 텍스트 필드에서 변수 참조 {{#nodeId.var#}} 패턴 검색
    pattern = re.compile(r'\{\{#([^.]+)\.')

    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            continue
        data = node.get("data", {})
        _check_var_refs_in_dict(data, node_ids, pattern,
                                f"workflow.graph.nodes[{i}]", result)


def _check_var_refs_in_dict(obj: Any, node_ids: set, pattern: re.Pattern,
                            path: str, result: ValidationResult):
    """딕셔너리/리스트에서 재귀적으로 변수 참조 검증"""
    if isinstance(obj, str):
        for match in pattern.finditer(obj):
            ref_node_id = match.group(1)
            if ref_node_id not in node_ids and ref_node_id not in ("sys", "env"):
                result.warning("VAR_REF",
                               f"변수 참조 '{{{{#{ref_node_id}...#}}}}'의 노드가 존재하지 않음",
                               path=path)
    elif isinstance(obj, dict):
        for key, value in obj.items():
            _check_var_refs_in_dict(value, node_ids, pattern, f"{path}.{key}", result)
    elif isinstance(obj, list):
        for j, item in enumerate(obj):
            _check_var_refs_in_dict(item, node_ids, pattern, f"{path}[{j}]", result)


def validate_value_selectors(workflow: dict, result: ValidationResult):
    """value_selector 참조 검증"""
    graph = workflow.get("graph", {})
    nodes = graph.get("nodes", [])
    node_ids = {n.get("id") for n in nodes if isinstance(n, dict) and n.get("id")}
    node_ids.add("sys")  # 시스템 변수
    node_ids.add("env")  # 환경변수

    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            continue
        data = node.get("data", {})
        _check_selectors_in_dict(data, node_ids,
                                 f"workflow.graph.nodes[{i}].data", result)


def _check_selectors_in_dict(obj: Any, node_ids: set, path: str,
                              result: ValidationResult):
    """value_selector 필드의 노드 참조 검증"""
    if isinstance(obj, dict):
        if "value_selector" in obj:
            selector = obj["value_selector"]
            if isinstance(selector, list) and len(selector) >= 1:
                ref_id = selector[0]
                if isinstance(ref_id, str) and ref_id not in node_ids:
                    result.warning("SELECTOR",
                                   f"value_selector [{ref_id}, ...] 의 노드가 존재하지 않음",
                                   path=f"{path}.value_selector")
        for key, value in obj.items():
            _check_selectors_in_dict(value, node_ids, f"{path}.{key}", result)
    elif isinstance(obj, list):
        for j, item in enumerate(obj):
            _check_selectors_in_dict(item, node_ids, f"{path}[{j}]", result)


# ── 메인 검증 오케스트레이터 ────────────────────────────────────────

def validate_dsl(file_path: str) -> ValidationResult:
    """DSL YAML 파일 전체 검증"""
    result = ValidationResult()
    path = Path(file_path)

    # 파일 존재 확인
    if not path.exists():
        result.error("FILE", f"파일을 찾을 수 없음: {file_path}")
        return result

    # 파일 크기 확인
    file_size = path.stat().st_size
    if file_size > DSL_MAX_SIZE_BYTES:
        result.error("FILE", f"파일 크기({file_size:,} bytes)가 10MB 제한 초과")
        return result

    result.info("FILE", f"파일 크기: {file_size:,} bytes")

    # YAML 파싱
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw_content = f.read()
            data = yaml.safe_load(raw_content)
    except yaml.YAMLError as e:
        result.error("YAML", f"YAML 파싱 실패: {e}")
        return result

    # 1. 기본 구조 검증
    if not validate_yaml_structure(data, result):
        return result

    # 2. 버전 검증
    validate_version(data, result)

    # 3. kind 검증
    validate_kind(data, result)

    # 4. app 섹션 검증
    app_data = validate_app_section(data, result)
    if app_data is None:
        return result

    app_mode = app_data.get("mode", "")

    # 5. workflow 섹션 검증 (workflow/advanced-chat 모드)
    workflow = validate_workflow_section(data, app_mode, result)

    if workflow:
        # 6. 그래프 검증
        validate_graph(workflow, result)

        # 7. 변수 검증
        validate_variables(workflow, "environment", result)
        validate_variables(workflow, "conversation", result)

        # 8. 피처 검증
        validate_features(workflow, app_mode, result)

        # 9. 변수 참조 일관성 검증
        validate_variable_references(workflow, result)

        # 10. value_selector 참조 검증
        validate_value_selectors(workflow, result)

    # 11. 의존성 검증
    validate_dependencies(data, result)

    return result


# ── 출력 포맷팅 ──────────────────────────────────────────────────────

def print_result(result: ValidationResult, file_path: str):
    """검증 결과 출력"""
    print("=" * 70)
    print(f"  Dify DSL Validator — {Path(file_path).name}")
    print("=" * 70)
    print()

    if not result.issues:
        print("  검증 완료: 이슈 없음")
        print()
        return

    # 심각도별 그룹핑
    for severity in [Severity.ERROR, Severity.WARNING, Severity.INFO]:
        issues = [i for i in result.issues if i.severity == severity]
        if not issues:
            continue

        icon = {"ERROR": "[X]", "WARNING": "[!]", "INFO": "[i]"}[severity.value]
        print(f"  {icon} {severity.value} ({len(issues)}건)")
        print(f"  {'-' * 66}")

        for issue in issues:
            path_str = f" @ {issue.path}" if issue.path else ""
            print(f"  {icon} [{issue.category}]{path_str}")
            print(f"      {issue.message}")
            if issue.suggestion:
                print(f"      -> {issue.suggestion}")
            print()

    # 요약
    print("=" * 70)
    status = "PASS" if result.is_valid else "FAIL"
    print(f"  결과: {status}  |  "
          f"오류: {result.error_count}  |  "
          f"경고: {result.warning_count}  |  "
          f"정보: {len(result.issues) - result.error_count - result.warning_count}")
    print("=" * 70)

    if result.is_valid:
        print("\n  DSL 파일이 기본 검증을 통과함. Import 가능성 높음.")
    else:
        print(f"\n  오류 {result.error_count}건 해결 필요. Import 실패 가능성 높음.")


# ── 엔트리포인트 ─────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_dsl.py <yaml_file>")
        print("Example: python validate_dsl.py smart-inquiry-routing.yml")
        sys.exit(1)

    file_path = sys.argv[1]
    result = validate_dsl(file_path)
    print_result(result, file_path)
    sys.exit(0 if result.is_valid else 1)


if __name__ == "__main__":
    main()
