# 팀 기획서

## 기본 정보
- 플러그인명: single-seller
- 목적: 합병 후 개별 업무를 진행하던 Dell EMC 리뉴얼팀과 APOS팀의 업무 통합에 필요한
  실행 계획 및 협업 체계를 구축하여, 단일 세일즈가 L-EMC 하드웨어(스토리지·스위치·백업솔루션)
  리뉴얼과 L-DELL 장비(서버·스토리지·스위치·노트북·워크스테이션·데스크탑) 유지보수·
  워런티 연장 서비스를 통합 제공할 수 있도록 지원
- 대상 도메인: 비즈니스 프로세스
- 대상 사용자: 통합 준비팀 리더/매니저

## 핵심기능
- Milestone 수립: 2026년 8월 100% 런칭 목표 기준 단계별 목표·일정 및 KPI 설계
  (3/20 draft, 3/25 1차 리뷰, 4/1 공지·실행 포함)
- Action Plan 작성: 리뉴얼팀·APOS팀별 실행 과제 도출 및 담당자·기한 관리
- 협업 체계 구축: 두 팀 역할 분담 매트릭스 및 커뮤니케이션 채널 정의
- 결과물 생성: Word/Excel 문서 작성(Claude Skills 직접 생성) 및 이미지 생성·임베딩

## 사용자 플로우
- Step 1. 현황 정보 입력: 두 팀의 현재 업무 범위, 인원, KPI 현황 입력
- Step 2. 통합 계획 수립: Milestone·Action Plan 자동 생성
- Step 3. 역할 분담 설계: 팀별 책임 및 커뮤니케이션 채널 정의
- Step 4. 결과물 생성: Word/Excel 문서 및 이미지 출력

## 에이전트 구성 힌트
- integration-planner (HIGH): KPI 분석·Milestone 설계·Action Plan 수립 전문가.
  복잡한 전략적 의사결정과 일정 계획이 필요하므로 HIGH(Opus) 티어 권장.
- collaboration-architect (MEDIUM): 리뉴얼팀·APOS팀 역할 분담 매트릭스 설계 및
  커뮤니케이션 채널 정의 전문가. 구조 설계 중심이므로 MEDIUM(Sonnet) 티어 권장.
- document-writer (MEDIUM): python-docx·openpyxl을 활용한 Word/Excel 결과물 생성
  및 이미지 임베딩 전문가. MEDIUM(Sonnet) 티어 권장.

## 참고 공유 자원
- 참고 가이드: 해당 자원 없음 — 비즈니스 통합 계획 도메인 가이드 직접 작성 필요
- 참고 샘플: 해당 자원 없음 — 플러그인 개발 시 직접 작성 필요
- 참고 템플릿: general/develop (개발 계획서 구조를 통합 실행 계획서에 참고)
- 참고 도구:
  - generate_image: 결과물 문서에 이미지 임베딩 지원 (핵심기능 직접 매칭)
  - context7: python-docx·openpyxl 라이브러리 공식 문서 검색
  - check-mermaid: Milestone 간트차트 다이어그램 검증 (선택적 활용)
