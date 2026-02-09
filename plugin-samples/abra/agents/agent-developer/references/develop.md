/oh-my-claudecode:ralph
개발 계획서에 따라 Agent를 개발 하세요.
# 요구사항
- Base 디렉토리: {{Base 디렉토리}}
- 개발 계획서: {{Base 디렉토리}}/{{개발 계획서 파일 경로}} 
# README.md
- 아키텍처 다이어그램
- 디렉토리 구조
- 소스 코드 설명 (주요 함수, 처리 흐름)
- 가상환경 설정 및 실행 방법
- MCP 서버인 경우 Claude Code에 추가 방법 안내
  ```
  # Streaming HTTP 일때 
  claude mcp add --transport http [-s local|user|project] {MCP서버명} {MCP서버 주소}

  # stdio일때 
  claude mcp add-json {MCP서버명} '{
    "type": "stdio",
    "command": "python",
    "args": ["{MCP 서버 파일 경로}"],
    "env": {
      "{Key}": "{Value}"
    }
  }' [-s local|user|project]
  ```  

# 결과파일
- {{Base 디렉토리}}/
- 'src' 디렉토리 하위에 생성하지 말것 
