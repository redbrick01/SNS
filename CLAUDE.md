# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

인스타그램풍의 가벼운 SNS 웹 서비스. 기획 문서는 `PRD.md` 참고 (범위, 데이터 모델, RLS 정책, 디자인 가이드가 정의되어 있음).

현재 상태: **Supabase Auth/Postgres/Storage 연동이 완료**된 상태. 로그인/회원가입/글쓰기(이미지 포함)/댓글/좋아요·싫어요/프로필 수정 모두 Server Actions를 통해 실제로 DB에 persist된다. 비로그인 사용자의 보호 라우팅도 `src/proxy.ts`로 적용되어 있다.

## 명령어

```bash
npm run dev      # 개발 서버 (Turbopack, http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npx tsc --noEmit # 타입 체크 (별도 test/lint 스크립트 없음)
```

테스트 스크립트는 아직 설정되어 있지 않다.

### 알려진 빌드 이슈 (Apple Silicon)

이 머신에서 `npm run build`(Turbopack)가 `lightningcss` 네이티브 바인딩을 x64로 잘못 찾아 `Cannot find module '../lightningcss.darwin-x64.node'` 에러로 실패하는 경우가 있다. 원인은 Rosetta(x86_64)로 실행되는 래퍼(`timeout` 등 `/usr/local/bin` 아래의 x86_64 바이너리)를 통해 `next build`를 호출하면 자식 프로세스의 Node도 x64로 뜨기 때문. `npm run dev`는 영향받지 않는다. 빌드를 직접 실행해야 할 때는 `timeout` 등 x86_64 바이너리로 감싸지 말고 `npx next build`를 그대로 실행할 것.

## 아키텍처

### 스택
- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 — 별도 `tailwind.config` 파일 없이 `src/app/globals.css`에 `@theme`로 디자인 토큰 정의
- shadcn/ui, 프리셋 `radix-nova` (`components.json` 참고) — 컴포넌트는 `src/components/ui/`에 생성됨. base는 `radix-ui` 패키지(단일 패키지로 모든 Radix 프리미티브를 re-export)
- Supabase: Auth(email/password) + Postgres + Storage. `.mcp.json`에 Supabase MCP 서버 연동 설정됨 — 스키마 변경은 `mcp__supabase__apply_migration`, 보안 점검은 `mcp__supabase__get_advisors`, 타입 재생성은 `mcp__supabase__generate_typescript_types`로 `src/types/supabase.ts` 갱신

> **주의**: 이 저장소는 Next.js 16을 쓰며 학습 데이터 기준과 다른 breaking change가 있다(`AGENTS.md` 참고, `next dev`가 자동 생성). 대표적으로 **`middleware.ts`가 `src/proxy.ts` + `export function proxy(...)`로 이름이 바뀌었다** — `middleware`라는 이름으로 복원하지 말 것.

### 라우트 구조 & 보호 라우팅
- `src/app/(auth)/` — `login`, `signup`. 중앙 정렬 카드형 레이아웃, 네비게이션 없음
- `src/app/(main)/` — `feed`, `profile`. 상단 `NavBar` + 최대 너비 640px 중앙 컬럼 레이아웃
- `src/app/page.tsx`는 `/feed`로 리다이렉트
- `src/proxy.ts`가 모든 요청에서 Supabase 세션 쿠키를 갱신하고, 비로그인 상태로 `/feed`·`/profile` 접근 시 `/login`으로, 로그인 상태로 `/login`·`/signup` 접근 시 `/feed`로 리다이렉트 — 라우트 보호는 레이아웃이 아니라 여기서 전역으로 처리됨
- `src/app/(main)/layout.tsx`도 서버에서 `getCurrentProfile()`을 조회해 없으면 `/login`으로 redirect하는 2차 방어선을 둠(미들웨어 통과 후 세션이 끊긴 경우 대비)

### 데이터 흐름
- `src/types/index.ts` — `Profile`/`Post`/`Comment`/`ReactionType`. DB 스키마가 아니라 **UI가 쓰는 shape**이며, `src/lib/data/*`에서 snake_case DB 로우를 이 shape으로 매핑한다
- `src/types/supabase.ts` — `mcp__supabase__generate_typescript_types`로 생성된 DB 스키마 타입(`Database`). 스키마를 바꾸면 이 파일도 재생성할 것
- 조회(읽기)는 서버 컴포넌트에서 `src/lib/data/posts.ts`(`getFeedPage`, `getPostsByAuthor`), `src/lib/data/profile.ts`(`getCurrentProfile`)로 수행 → props로 클라이언트 컴포넌트에 전달
- 변경(쓰기)은 모두 `src/app/actions/*.ts`의 `"use server"` Server Action으로 수행(`auth.ts`/`posts.ts`/`comments.ts`/`reactions.ts`/`profile.ts`/`feed.ts`). 각 액션은 `supabase.auth.getUser()`로 본인 확인 후 `.eq("author_id"/"user_id", user.id)`로 RLS와 이중으로 권한 체크함 — 이 패턴을 새 액션에도 유지할 것
- `src/lib/supabase/server.ts`의 `createClient()`는 Server Component/Action 전용(쿠키 기반, Next 16 비동기 `cookies()` 사용). 클라이언트 전용 Supabase 클라이언트는 없음 — 모든 DB 접근이 서버를 경유함
- `CurrentUserProvider`(`src/components/providers/current-user-provider.tsx`)가 `(main)/layout.tsx`에서 서버 조회한 프로필을 Context로 클라이언트 컴포넌트에 공급. `useCurrentUser()`로 접근(`NavBar`, `ComposePostDialog`, `EditProfileDialog` 등)하며, 프로필 수정 성공 시 `setProfile`로 Context를 갱신해 새로고침 없이 반영

### 피드 페이지네이션
- `getFeedPage(cursor?)`가 `(created_at, id)` 복합 커서로 10개씩 조회(`FEED_PAGE_SIZE`). `cursor`가 없으면 첫 페이지
- `FeedView`가 `IntersectionObserver`로 하단 sentinel을 감지해 `fetchNextFeedPage` 서버 액션(`src/app/actions/feed.ts`)을 호출, 결과를 로컬 state에 append — 전체 리페치 없이 무한 스크롤 구현
- 게시글 생성/수정/삭제는 피드를 다시 불러오지 않고 `FeedView`의 로컬 state(`handleCreated`/`handleUpdated`/`handleDeleted`)를 직접 갱신. 그래서 `createPost`/`updatePost` 액션은 반영에 필요한 필드(`id`/`content`/`imageUrl`/`createdAt`)를 반환값에 포함시켜야 한다

### 리액션(좋아요/싫어요) & 폴리모픽 reactions 테이블
- `reactions` 테이블은 `target_type`('post'|'comment') + `target_id`로 게시글·댓글을 공통 참조하는 폴리모픽 구조라 FK cascade가 불가능 — DB에 `posts_cleanup_reactions`/`comments_cleanup_reactions` AFTER DELETE 트리거로 정리함(PRD "RLS 정책 요약" 참고)
- `toggleReaction({targetType, targetId, reaction})`(`src/app/actions/reactions.ts`)이 좋아요/싫어요 상호배타 토글을 처리: 같은 반응 재클릭 시 삭제, 다른 반응 클릭 시 update, 없으면 insert
- `ReactionButtons`가 optimistic update 후 액션 호출, 실패 시 이전 상태로 롤백 + 토스트 에러. 새 target 타입을 추가해도 이 컴포넌트와 액션 시그니처(`targetType`/`targetId`)를 그대로 재사용할 것

### Storage 업로드
- `src/lib/storage.ts` — `uploadPostImage`/`uploadAvatar`/`deleteStorageObjectFromUrl` + 클라이언트·서버 공통 검증(`assertValidImage`: 5MB 이하, jpg/png/webp)
- 경로 규칙: 게시글 이미지는 `${userId}/${randomUUID}.${ext}`(교체 시 이전 오브젝트 명시적으로 `remove`), 아바타는 `${userId}/avatar.${ext}`(`upsert: true`로 덮어써서 orphan 방지, 캐시 무효화를 위해 URL에 `?v=timestamp` 쿼리 부착)
- Storage RLS 정책(`storage.objects`)이 `(storage.foldername(name))[1] = auth.uid()::text`로 본인 폴더만 쓰기 허용 — 업로드 경로의 첫 세그먼트는 항상 `user.id`여야 함

### 주요 컴포넌트 패턴
- `ReactionButtons`(`src/components/feed/reaction-buttons.tsx`) — 게시글·댓글 공용(size prop으로 구분), 위 "리액션" 섹션 참고
- `PostMenu` — 수정/삭제 드롭다운 + 삭제 확인 `AlertDialog`. `onEdit`/`onDelete` 콜백을 외부에서 주입받는 presentational 컴포넌트이며, 게시글 카드와 댓글 양쪽에서 `deleteLabel`/`deleteDescription`만 다르게 전달해 재사용
- `ComposePostDialog` — 작성/수정 겸용. `editTarget` prop이 있으면 수정 모드로 전환되어 `updatePost`를 호출하고, 없으면 `createPost`를 호출. 이미지 제거는 `removeImage` FormData 플래그로 서버에 전달
- `FeedView` — `?compose=1` 쿼리파라미터로 글쓰기 다이얼로그 자동 오픈(`NavBar`의 글쓰기 버튼이 이 파라미터로 이동). `useEffect` 안에서 `setState`를 직접 호출하면 Next 16 lint 규칙(`react-hooks/set-state-in-effect`)에 걸리므로, **렌더 중 이전 값과 비교해 분기하는 패턴**을 사용 중(`composeParam !== lastComposeParam` 비교) — `ComposePostDialog`/`EditProfileDialog`의 `open` prop 변화에 따른 폼 리셋도 동일 패턴(`lastOpen` state 비교)으로 처리되어 있음. 새 다이얼로그를 추가할 때도 이 패턴을 유지할 것

### shadcn/ui 관련 주의사항
- `radix-ui` 패키지의 `AvatarImage`는 `asChild`를 지원하지 않는 plain `<img>` 래퍼다. `next/image`와 합성하려고 `asChild`를 쓰면 타입 에러 발생 — 아바타는 `<AvatarImage src=... alt=... />`로 직접 쓰고, `next/image`는 게시글 본문 이미지처럼 큰 이미지에만 사용할 것
- 로컬 SVG를 `next/image`로 최적화하려면 `next.config.ts`의 `images.dangerouslyAllowSVG: true`가 필요(이미 설정됨, `public/mock/*.svg`는 아바타 플레이스홀더용으로 남아있음)
- 새 shadcn 컴포넌트 추가 시 `npx shadcn@latest add <component>` 사용 (프리셋이 `radix-nova`라서 구버전 CLI 문법인 `-b neutral` 등은 동작하지 않음, `-b radix -p nova` 형태)

### 환경 변수
- `.env`에 두 세트가 있음: `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`(MCP 서버용)와 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(Next.js 앱의 서버/프록시 클라이언트가 실제로 읽는 값). 앱 코드에서는 반드시 `NEXT_PUBLIC_` 접두사 버전을 사용할 것
