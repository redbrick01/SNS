"use server";

import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/types";

export async function createComment(
  postId: string,
  content: string
): Promise<{ comment: Comment | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { comment: null, error: "로그인이 필요합니다." };

  const trimmed = content.trim();
  if (!trimmed) return { comment: null, error: "댓글을 입력해주세요." };
  if (trimmed.length > 2000) return { comment: null, error: "댓글은 2000자 이하로 작성해주세요." };

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, content: trimmed })
    .select(
      "id, post_id, author_id, content, created_at, author:profiles!comments_author_id_fkey(id, nickname, avatar_url, bio)"
    )
    .single();
  if (error || !data) return { comment: null, error: "댓글 작성에 실패했습니다." };

  const author = data.author as unknown as {
    id: string;
    nickname: string;
    avatar_url: string | null;
    bio: string | null;
  };

  return {
    comment: {
      id: data.id,
      postId: data.post_id,
      author: {
        id: author.id,
        nickname: author.nickname,
        avatarUrl: author.avatar_url,
        bio: author.bio,
      },
      content: data.content,
      createdAt: data.created_at,
      likeCount: 0,
      dislikeCount: 0,
      myReaction: null,
      isMine: true,
    },
    error: null,
  };
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const trimmed = content.trim();
  if (!trimmed) return { error: "댓글을 입력해주세요." };
  if (trimmed.length > 2000) return { error: "댓글은 2000자 이하로 작성해주세요." };

  const { error } = await supabase
    .from("comments")
    .update({ content: trimmed })
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) return { error: "댓글 수정에 실패했습니다." };

  return { error: null };
}

export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) return { error: "댓글 삭제에 실패했습니다." };

  return { error: null };
}
