"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/feed/post-card";
import { ComposePostDialog } from "@/components/feed/compose-post-dialog";
import { fetchNextFeedPage } from "@/app/actions/feed";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import type { FeedCursor } from "@/lib/data/posts";
import type { Post } from "@/types";

type FeedViewProps = {
  initialPosts: Post[];
  initialCursor: FeedCursor | null;
};

export function FeedView({ initialPosts, initialCursor }: FeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const composeParam = searchParams.get("compose") === "1";
  const { profile } = useCurrentUser();

  const [composeOpen, setComposeOpen] = useState(composeParam);
  const [lastComposeParam, setLastComposeParam] = useState(composeParam);

  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (composeParam !== lastComposeParam) {
    setLastComposeParam(composeParam);
    if (composeParam) setComposeOpen(true);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const { posts: nextPosts, nextCursor } = await fetchNextFeedPage(cursor);
    setPosts((prev) => [...prev, ...nextPosts]);
    setCursor(nextCursor);
    setLoadingMore(false);
  }, [cursor, loadingMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  function handleComposeChange(open: boolean) {
    setComposeOpen(open);
    if (!open) router.replace("/feed");
  }

  function handleCreated(post: { id: string; content: string; imageUrl: string | null; createdAt: string }) {
    const newPost: Post = {
      id: post.id,
      author: profile,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      likeCount: 0,
      dislikeCount: 0,
      myReaction: null,
      isMine: true,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function handleUpdated(postId: string, next: { content: string; imageUrl: string | null }) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, content: next.content, imageUrl: next.imageUrl } : p))
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold">피드</h1>
        <Button
          size="sm"
          className="gap-1.5 rounded-full"
          onClick={() => setComposeOpen(true)}
        >
          <PlusSquare className="size-4" />
          글쓰기
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={() => handleDeleted(post.id)}
              onUpdated={(next) => handleUpdated(post.id, next)}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      <ComposePostDialog
        open={composeOpen}
        onOpenChange={handleComposeChange}
        onCreated={handleCreated}
      />
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-foreground">아직 올라온 글이 없어요</p>
      <p className="text-sm text-muted-foreground">첫 번째 글을 남겨보세요.</p>
    </div>
  );
}
