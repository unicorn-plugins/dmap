# GitHub Organization 생성 가이드

- [GitHub Organization 생성 가이드](#github-organization-생성-가이드)
  - [Organization 개요](#organization-개요)
  - [Organization이 필요한 경우](#organization이-필요한-경우)
  - [Organization 생성 절차](#organization-생성-절차)
  - [멤버 초대 방법](#멤버-초대-방법)
  - [Organization vs Personal 계정 비교](#organization-vs-personal-계정-비교)

---

## Organization 개요

GitHub Organization은 팀 또는 회사 단위로 프로젝트를 관리할 수 있는 공유 계정임.

**주요 특징:**
- 여러 레포지토리를 하나의 조직 이름 아래 통합 관리
- 팀 단위 권한 관리 및 멤버 초대 가능
- 무료 플랜(Free)과 유료 플랜(Team, Enterprise) 제공
- Organization 소유 레포지토리는 조직이 관리 (개인 계정 의존성 없음)

**Free 플랜 기능:**
- 무제한 Public/Private 레포지토리
- 무제한 협업자
- GitHub Actions 2,000분/월 (Public 레포지토리는 무제한)
- 500MB Packages 스토리지
- 기본적인 팀 및 권한 관리

**유료 플랜 추가 기능:**
- Team ($4/user/month): 보호된 브랜치, 코드 리뷰 필수화, GitHub Pages 고급 기능
- Enterprise ($21/user/month): SAML SSO, 감사 로그, 고급 보안 기능

[Top](#github-organization-생성-가이드)

---

## Organization이 필요한 경우

다음 상황에서 Organization 생성을 고려함:

**1. 팀 프로젝트 관리**
- 2명 이상의 개발자가 협업하는 프로젝트
- 프로젝트 소유권을 특정 개인이 아닌 팀에 귀속
- 멤버 퇴사 시에도 레포지토리 소유권 유지 필요

**2. 회사 플러그인 배포**
- DMAP 플러그인을 회사 이름으로 배포
- 통일된 브랜딩 및 식별성 확보
- 예: `github.com/{company}/dmap-plugin-xxx`

**3. 통합 브랜딩**
- 모든 프로젝트를 하나의 조직 이름 아래 관리
- Organization 프로필 페이지로 포트폴리오 구성
- 대외적으로 전문적인 이미지 제공

**4. 권한 관리 필요**
- 레포지토리별로 다른 권한 부여 (Read, Write, Admin)
- 팀별로 접근 권한 차등 적용
- 외부 협력사 멤버에게 제한적 접근 권한 부여

**5. Organization 수준 기능 활용**
- Organization Projects (프로젝트 보드)
- Organization Discussions (전체 토론 게시판)
- Organization Security Advisories (보안 권고)
- Unified billing (통합 결제)

[Top](#github-organization-생성-가이드)

---

## Organization 생성 절차

GitHub Organization 생성은 다음 단계로 진행됨:

**1. GitHub 로그인**
- [https://github.com](https://github.com)에 접속하여 로그인

**2. Organization 생성 페이지 접근**
- 우측 상단 프로필 아이콘 클릭 → `+` 아이콘 → `New organization` 선택
- 또는 직접 [https://github.com/organizations/plan](https://github.com/organizations/plan) 접속

**3. 플랜 선택**
- **Free**: 무료 플랜 (대부분의 기능 사용 가능)
- **Team**: $4/user/month (고급 협업 기능)
- **Enterprise**: $21/user/month (엔터프라이즈 보안 및 관리 기능)
- `Create a free organization` 또는 원하는 플랜 선택

**4. Organization 기본 정보 입력**

   **Organization account name:**
   - Organization의 고유한 이름 (URL에 사용됨)
   - 영문 소문자, 숫자, 하이픈(-) 사용 가능
   - 3~39자 제한
   - 예: `unicorn-company`, `dmap-builders`, `myteam-devs`
   - ⚠️ 신중하게 선택 (변경 시 URL 변경되어 영향 큼)

   **Contact email:**
   - Organization 공식 연락처 이메일 주소
   - 보안 알림, GitHub 공지사항 수신
   - 개인 이메일 또는 회사 공용 이메일 사용 가능

   **This organization belongs to:**
   - `My personal account`: 개인 프로젝트 또는 소규모 팀용
   - `My business or institution`: 회사 또는 기관용
   - 세금 및 규정 준수 목적으로 사용됨 (Free 플랜에서는 큰 차이 없음)

**5. Organization 생성 완료**
- `Next` 또는 `Create organization` 버튼 클릭
- 사람 인증(캡차) 통과

**6. 초기 설정 (선택사항)**
- **멤버 초대**: 팀원의 GitHub 사용자명 또는 이메일 입력
- **레포지토리 생성**: 첫 번째 레포지토리 생성 또는 기존 레포지토리 이전
- **Skip** 가능 (나중에 설정 가능)

**7. Organization 페이지 확인**
- Organization 대시보드 접근: `https://github.com/{organization-name}`
- 프로필 설정, 레포지토리 생성, 멤버 관리 가능

**초기 설정 권장사항:**

1. **Organization 프로필 설정**
   - Settings → Profile → Display name, Description, Email, Website, Location 입력
   - Organization 아바타 이미지 업로드

2. **기본 레포지토리 권한 설정**
   - Settings → Member privileges → Base permissions
   - 권장: `Read` (멤버는 모든 레포지토리 읽기 가능, 쓰기는 명시적 부여)

3. **Two-factor authentication 요구 설정**
   - Settings → Authentication security → Require two-factor authentication
   - 모든 멤버에게 2FA 활성화 강제 (보안 강화)

[Top](#github-organization-생성-가이드)

---

## 멤버 초대 방법

Organization에 팀원을 초대하는 절차는 다음과 같음:

**방법 1: GitHub 사용자명으로 초대**

1. **Members 페이지 접근**
   - Organization 페이지 → `Settings` (톱니바퀴 아이콘) → 좌측 `People` 클릭

2. **멤버 초대**
   - 우측 상단 `Invite member` 버튼 클릭

3. **사용자 검색**
   - GitHub 사용자명 입력 (예: `octocat`)
   - 사용자 검색 결과에서 선택

4. **역할 선택**
   - **Member**: 일반 멤버 (레포지토리별 권한 부여 필요)
   - **Owner**: 전체 관리자 (Organization 설정 및 결제 관리 가능)
   - 권장: 초기에는 `Member`로 초대, 필요 시 승급

5. **초대 완료**
   - `Send invitation` 버튼 클릭
   - 초대받은 사용자의 GitHub 알림 및 이메일로 초대장 발송

**방법 2: 이메일 주소로 초대**

1. **Members 페이지 접근** (위와 동일)

2. **이메일 초대**
   - `Invite member` → 이메일 주소 입력
   - GitHub 계정이 없는 경우에도 초대 가능

3. **초대 완료**
   - 이메일로 초대장 발송
   - 초대받은 사람은 GitHub 계정 생성 후 Organization 참여

**초대 수락 및 확인:**
- 초대받은 사람은 GitHub 알림에서 `View invitation` 클릭 → `Join {organization}` 버튼 클릭
- Organization 멤버 목록에서 `Pending` → `Active` 상태로 변경 확인

**멤버 권한 관리:**

1. **레포지토리별 권한 부여**
   - 레포지토리 → Settings → Collaborators and teams → `Add people`
   - 권한 수준 선택:
     - **Read**: 코드 읽기, 이슈 작성
     - **Triage**: Read + 이슈/PR 관리
     - **Write**: Triage + 코드 push
     - **Maintain**: Write + 레포지토리 설정 일부
     - **Admin**: 모든 권한 (레포지토리 삭제 포함)

2. **팀 단위 권한 관리** (권장)
   - Organization → Teams → `New team` 생성
   - 팀에 멤버 추가
   - 레포지토리에 팀 단위로 권한 부여
   - 예: `developers` 팀에 Write 권한, `reviewers` 팀에 Maintain 권한

**멤버 제거:**
- Settings → People → 멤버 우측 톱니바퀴 → `Remove from organization`
- 제거된 멤버는 Organization 레포지토리 접근 불가 (Public은 여전히 읽기 가능)

[Top](#github-organization-생성-가이드)

---

## Organization vs Personal 계정 비교

GitHub Organization과 Personal 계정의 차이를 비교함:

| 기능 | Personal 계정 | Organization |
|------|---------------|--------------|
| **소유권** | 개인 소유 | 팀 공동 소유 |
| **URL 형식** | `github.com/{username}/{repo}` | `github.com/{org-name}/{repo}` |
| **멤버 관리** | 협업자 개별 초대만 가능 | 멤버/팀 단위 체계적 관리 |
| **권한 관리** | 레포지토리별 개별 권한만 | 팀 단위 권한, 역할 기반 관리 |
| **레포지토리 소유** | 개인 계정에 종속 | Organization에 종속 (개인 퇴사 무관) |
| **브랜딩** | 개인 이름 | 회사/팀 이름 |
| **프로필 페이지** | 개인 프로필 | Organization 프로필 (통합 포트폴리오) |
| **Projects** | 개인 프로젝트 보드 | Organization 프로젝트 보드 (팀 공유) |
| **Discussions** | 레포지토리별 | Organization 전체 토론 가능 |
| **Security Advisories** | 레포지토리별 | Organization 수준 보안 관리 |
| **Billing** | 개인 결제 | 조직 통합 결제 |
| **GitHub Actions** | 2,000분/월 (Free) | 2,000분/월 (Free), 팀원 간 공유 |
| **GitHub Pages** | `{username}.github.io` | `{org-name}.github.io` + 고급 기능 (Team+) |
| **Owner 역할** | 본인만 | 여러 명 지정 가능 |
| **멤버 초대** | 협업자만 가능 | 멤버/외부 협력자 구분 관리 |
| **감사 로그** | 없음 | Enterprise 플랜에서 제공 |
| **SAML SSO** | 불가능 | Enterprise 플랜에서 제공 |

**사용 권장:**

| 상황 | 권장 방식 |
|------|----------|
| 개인 포트폴리오 프로젝트 | Personal 계정 |
| 1인 개발 프로젝트 | Personal 계정 |
| 오픈소스 개인 프로젝트 | Personal 계정 |
| 팀 협업 프로젝트 (2명 이상) | Organization |
| 회사 공식 프로젝트 | Organization |
| 플러그인 배포 (회사명 사용) | Organization |
| 장기 유지보수 프로젝트 | Organization (소유권 안정성) |
| 외주 프로젝트 (클라이언트 인계) | Organization (클라이언트 소유로 이전 가능) |

**Organization 생성 시기:**
- 초기 개발: Personal 계정에서 시작
- 팀원 참여 시점: Organization으로 레포지토리 이전 (Transfer repository 기능 사용)
- 회사 공식 프로젝트: 처음부터 Organization 생성

**레포지토리 이전 방법:**
- Personal → Organization: 레포지토리 Settings → Transfer ownership → Organization 이름 입력
- 이전 후에도 Git 이력, 이슈, PR 모두 유지됨
- 이전 URL은 자동 리다이렉트됨 (일정 기간 후 리다이렉트 해제 가능)

[Top](#github-organization-생성-가이드)
