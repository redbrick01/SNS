# PRD: SNS 웹 서비스

## Context

새로운 SNS(소셜 네트워킹 서비스) 웹 서비스를 처음부터 구축한다. 현재 프로젝트 디렉토리(`/Users/yw0410/Desktop/AI/d_2/sns`)에는 코드가 전혀 없고 `.env`(Supabase URL/Publishable Key), `.mcp.json`(Supabase MCP 연동)만 존재하며, 연결된 Supabase 프로젝트의 `public` 스키마에도 테이블이 없는 완전히 빈 상태다. 즉 이 PRD는 신규 프로젝트의 기획 문서이며, 이후 구현 단계에서 바로 착수할 수 있도록 기능 범위·디자인 방향·기술 구조·데이터 모델까지 구체적으로 정의하는 것이 목적이다.

핵심 요구사항: 인스타그램처럼 가볍게 글을 올리고 소통하는 SNS를, 애플 스타일의 미니멀하고 정제된 비주얼로 구현한다. 백엔드는 Supabase(Auth, Postgres, Storage)를 사용하고, 프론트엔드는 Next.js(React) 기반 웹 앱으로 만든다.

## 목표 (Goals)

- 사용자가 가입하고, 글을 쓰고, 소통(댓글/리액션)하는 최소 기능의 SNS를 빠르게 출시 가능한 형태로 설계
- Supabase 하나로 Auth/DB/Storage/권한(RLS)을 모두 처리해 백엔드 인프라 구축 비용을 최소화
- 애플 + 인스타그램 감성을 결합한 깔끔하고 세련된 UI/UX 제공

## 범위 (Scope)

### 포함 (In Scope)
1. 이메일/비밀번호 기반 회원가입·로그인·로그아웃
2. 게시글 작성/수정/삭제 (텍스트 + 이미지 1장)
3. 내 프로필 페이지 (닉네임, 프로필 사진, 소개글, 내가 쓴 게시글 목록)
4. 댓글 작성/수정/삭제
5. 게시글·댓글에 대한 좋아요/싫어요

### 제외 (Out of Scope, 추후 고려)
- 소셜 로그인(Google/Kakao 등), 비밀번호 재설정 이메일 플로우의 세부 UX
- 팔로우/팔로잉, 다른 사용자 프로필 조회(타인 프로필 열람은 1차 범위에서는 제외 — 아래 "열린 질문" 참고)
- DM, 알림(실시간 알림/푸시), 해시태그·검색, 이미지 다중 업로드, 피드 알고리즘/추천
- 모바일 네이티브 앱 (웹 반응형으로만 대응)

## 사용자 플로우 개요

1. 비로그인 사용자는 로그인/회원가입 화면만 접근 가능 → 로그인 성공 시 피드로 이동
2. 피드(홈)에서 전체 게시글을 최신순으로 확인, 글 작성 버튼으로 새 글 작성
3. 게시글 카드에서 좋아요/싫어요 토글, 댓글 펼쳐보기 및 작성
4. 본인 게시글/댓글에는 수정·삭제 메뉴 노출 (타인 글에는 노출 안 함)
5. 상단 또는 하단 네비게이션에서 "내 프로필"로 이동 → 프로필 정보 수정, 내가 쓴 글 목록 확인

## 기능 요구사항

### 1. 로그인 / 회원가입
- Supabase Auth(email/password)를 사용. 소셜 로그인 없음.
- 회원가입 시 입력: 이메일, 비밀번호, 닉네임 (닉네임은 `profiles` 테이블에 저장)
- 회원가입 성공 시 `profiles` 로우를 자동 생성 (Postgres trigger `on_auth_user_created` 패턴, Supabase 공식 가이드 방식 사용)
- 로그인 실패/중복 이메일 등 기본 에러 메시지 처리
- 로그인 상태는 Supabase의 세션/쿠키 기반으로 유지, 새로고침해도 로그인 유지
- 로그아웃 기능 제공
- 비로그인 사용자가 보호된 페이지(피드, 프로필 등) 접근 시 로그인 페이지로 리다이렉트

### 2. 게시글 작성 / 수정 / 삭제
- 작성: 텍스트(필수, 길이 제한 예: 최대 2,000자) + 이미지 1장(선택, Supabase Storage 업로드)
- 이미지는 업로드 전 클라이언트에서 용량/타입(jpg/png/webp) 검증
- 수정: 작성자 본인만 가능. 텍스트/이미지 교체 가능
- 삭제: 작성자 본인만 가능. 삭제 시 연관된 댓글·좋아요/싫어요·Storage 이미지도 함께 정리(cascade)
- 피드는 최신순 정렬, 무한 스크롤 또는 페이지네이션(구현 단계에서 택1, 권장: 무한 스크롤)

### 3. 내 프로필 페이지
- 표시 정보: 프로필 사진, 닉네임, 소개글(bio), 내가 쓴 게시글 목록(그리드 또는 리스트)
- 수정 가능 항목: 프로필 사진(Storage 업로드), 닉네임, 소개글
- 1차 범위는 "내 프로필"만 대상이며 타인 프로필 열람 기능은 포함하지 않음 (열린 질문 참고)

### 4. 댓글 작성 / 수정 / 삭제
- 게시글 상세/카드 내에서 댓글 작성, 목록은 작성순(오래된 순) 정렬
- 수정/삭제는 작성자 본인만 가능
- 삭제 시 해당 댓글의 좋아요/싫어요도 함께 정리
- 대댓글(답글)은 1차 범위에 포함하지 않음

### 5. 좋아요 / 싫어요
- 적용 대상: 게시글 + 댓글 모두
- 사용자당 게시글/댓글 하나에 좋아요 또는 싫어요 중 하나만 선택 가능 (둘 다 동시 선택 불가, 토글 시 전환)
- 좋아요/싫어요 수 실시간 표시(클라이언트 상태 반영, 필요 시 Supabase Realtime 구독)
- 본인 게시글/댓글에도 좋아요/싫어요 가능 여부는 구현 단계에서 결정(권장: 허용, 단순화)

## 디자인 가이드

**컨셉**: 애플(미니멀, 넉넉한 여백, 절제된 색상, 둥근 모서리, 부드러운 그림자/블러)과 인스타그램(카드형 피드, 원형 프로필 사진, 하트 리액션, 이미지 중심 레이아웃)을 결합.

- **레이아웃**: 중앙 정렬된 단일 컬럼 피드(인스타그램 피드 구조), 데스크톱에서는 최대 너비 제한(예: 600~680px)으로 과도하게 넓어지지 않게
- **색상**: 라이트 테마 기본, 무채색(화이트/그레이) 베이스 + 포인트 컬러 1개(좋아요 등 인터랙션에만 사용). 다크 모드는 선택 사항으로 고려
- **타이포그래피**: San Francisco 계열 시스템 폰트 우선(`-apple-system`), 웹 폴백으로 Inter 사용
- **컴포넌트 스타일**: 카드는 둥근 모서리(예: 16px), 얇은 보더 또는 옅은 그림자, 버튼/인풋은 애플 스타일의 넉넉한 패딩과 부드러운 전환 애니메이션
- **아이콘/리액션**: 좋아요=하트 또는 👍, 싫어요=👎 아이콘, 탭 시 미세한 스케일 애니메이션(인스타그램 더블탭 하트 느낌 참고 가능)
- **구현 방식**: Tailwind CSS 기반으로 디자인 토큰(색상/radius/spacing)을 정의해 일관성 유지. shadcn/ui 같은 헤드리스 컴포넌트 활용 권장(접근성 기본 제공)

## 기술 요구사항 / 아키텍처

- **프론트엔드**: Next.js(App Router) + TypeScript + Tailwind CSS, 웹 플랫폼(반응형, 모바일 브라우저 대응)
- **백엔드/인프라**: Supabase 단일 사용
  - **Auth**: Supabase Auth (email/password)
  - **Database**: Supabase Postgres
  - **Storage**: Supabase Storage (프로필 이미지, 게시글 이미지 버킷 분리 또는 경로 분리)
  - **권한 제어**: Row Level Security(RLS)로 "본인 데이터만 수정/삭제 가능" 강제 — 애플리케이션 레벨 검증과 이중으로 보호
- **클라이언트 연동**: `@supabase/supabase-js` + `@supabase/ssr`(Next.js 서버/클라이언트 세션 동기화)
- **이미지 업로드**: 클라이언트에서 Supabase Storage로 직접 업로드 후 public URL을 DB에 저장
- **MCP 활용**: 이후 구현 단계에서 `mcp__supabase__apply_migration`으로 스키마 적용, `mcp__supabase__generate_typescript_types`로 타입 생성, `mcp__supabase__get_advisors`로 보안/성능 점검

## 데이터 모델 (초안)

```
profiles
  id            uuid PK, references auth.users(id)
  nickname      text, not null, unique
  avatar_url    text, nullable
  bio           text, nullable
  created_at    timestamptz, default now()

posts
  id            uuid PK, default gen_random_uuid()
  author_id     uuid, references profiles(id), not null
  content       text, not null
  image_url     text, nullable
  created_at    timestamptz, default now()
  updated_at    timestamptz, default now()

comments
  id            uuid PK, default gen_random_uuid()
  post_id       uuid, references posts(id) on delete cascade, not null
  author_id     uuid, references profiles(id), not null
  content       text, not null
  created_at    timestamptz, default now()
  updated_at    timestamptz, default now()

reactions
  id            uuid PK, default gen_random_uuid()
  user_id       uuid, references profiles(id), not null
  target_type   text, check in ('post','comment')
  target_id     uuid, not null   -- posts.id 또는 comments.id
  reaction_type text, check in ('like','dislike')
  created_at    timestamptz, default now()
  unique (user_id, target_type, target_id)   -- 사용자당 대상 하나에 1개 반응만
```

- RLS 정책 요약:
  - `profiles`: 누구나 read 가능(공개 프로필 정보), 본인만 update 가능, insert는 트리거로만 생성
  - `posts`/`comments`: 누구나 read 가능, insert는 로그인 사용자 본인 `author_id`로만, update/delete는 본인 글만
  - `reactions`: 누구나 read 가능(집계용), insert/update/delete는 본인 `user_id`만
- 게시글/댓글 삭제 시 연관 `reactions` 레코드도 정리(FK cascade 또는 애플리케이션/트리거에서 처리 — `target_id`는 폴리모픽 참조라 FK cascade가 불가하므로 트리거로 정리 필요)

## 비기능 요구사항

- 반응형 디자인: 모바일 브라우저 우선 고려, 데스크톱에서도 자연스럽게 동작
- 이미지 업로드 용량 제한(예: 5MB 이하) 및 허용 포맷 ��한
- 기본적인 로딩/에러 상태 UI 제공(스켈레톤 또는 스피너, 토스트 에러 메시지)
- 보안: RLS 필수 적용, `mcp__supabase__get_advisors`로 보안 advisor 점검 후 반영

## 마일스톤 (제안)

1. Supabase 스키마/RLS/Storage 버킷 설정, Next.js 프로젝트 초기화 + Supabase 클라이언트 연동
2. 로그인/회원가입 + 보호 라우팅
3. 게시글 CRUD (텍스트+이미지) + 피드 UI
4. 댓글 CRUD
5. 좋아요/싫어요 (게시글+댓글)
6. 내 프로필 페이지(조회/수정)
7. 디자인 폴리싱 (애플+인스타그램 톤 맞추기), 반응형 점검

## 검증 방법

- 각 기능 구현 후 실제 브라우저에서 수동 테스트: 회원가입→로그인→글쓰기→이미지 업로드→댓글→좋아요/싫어요→프로필 수정→로그아웃 전체 플로우 1회 수행
- `mcp__supabase__get_advisors`로 RLS 누락/보안 이슈 점검
- 타인 계정으로 로그인해 "본인 글만 수정/삭제 가능", "싫어요/좋아요 중복 방지" 등 권한 로직 교차 확인

## 열린 질문 (구현 전 추가 확인 필요)

- 타인 프로필 열람/다른 사용자 글 보기는 이번 범위에 없음 — 추후 필요 시 범위 추가
- 비밀번호 재설정(이메일 발송) 플로우 포함 여부는 미정 — 1차 구현에서는 생략 가능
- 본인 게시글/댓글에 좋아요·싫어요 가능 여부는 구현 시 단순하게 "허용"으로 진행 예정
