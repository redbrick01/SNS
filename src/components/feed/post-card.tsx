"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ReactionButtons } from "@/components/feed/reaction-buttons";
import { PostMenu } from "@/components/feed/post-menu";
import { CommentSection } from "@/components/feed/comment-section";
import { ComposePostDialog } from "@/components/feed/compose-post-dialog";
import { formatRelativeTime } from "@/lib/format-time";
import { deletePost } from "@/app/actions/posts";
import type { Post } from "@/types";
import { toast } from "sonner";

type PostCardProps = {
  post: Post;
  onDeleted: () => void;
  onUpdated: (next: { content: string; imageUrl: string | null }) => void;
};

export function PostCard({ post, onDeleted, onUpdated }: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function handleDelete() {
    const { error } = await deletePost(post.id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("삭제되었습니다.");
    onDeleted();
  }

  return (
    <article className="rounded-2xl bg-card ring-1 ring-border/70">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <Link
          href={post.isMine ? "/profile" : "#"}
          className="flex items-center gap-2.5"
        >
          <Avatar>
            {post.author.avatarUrl ? (
              <AvatarImage src={post.author.avatarUrl} alt={post.author.nickname} />
            ) : null}
            <AvatarFallback>
              {post.author.nickname.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{post.author.nickname}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </Link>

        {post.isMine && (
          <PostMenu onEdit={() => setEditOpen(true)} onDelete={handleDelete} />
        )}
      </div>

      <div className="px-4 pt-3">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
          {post.content}
        </p>
      </div>

      {post.imageUrl && (
        <div className="mt-3 overflow-hidden">
          <div className="relative aspect-square w-full bg-muted">
            <Image
              src={post.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 640px"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3">
        <ReactionButtons
          targetType="post"
          targetId={post.id}
          initialLikeCount={post.likeCount}
          initialDislikeCount={post.dislikeCount}
          initialReaction={post.myReaction}
        />

        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="size-5" />
          <span>{post.comments.length}</span>
        </button>
      </div>

      {commentsOpen && (
        <>
          <Separator />
          <div className="px-4 py-4">
            <CommentSection postId={post.id} comments={post.comments} />
          </div>
        </>
      )}

      {post.isMine && (
        <ComposePostDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editTarget={{ id: post.id, content: post.content, imageUrl: post.imageUrl }}
          onUpdated={onUpdated}
        />
      )}
    </article>
  );
}
