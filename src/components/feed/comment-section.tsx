"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReactionButtons } from "@/components/feed/reaction-buttons";
import { PostMenu } from "@/components/feed/post-menu";
import { formatRelativeTime } from "@/lib/format-time";
import { createComment, deleteComment, updateComment } from "@/app/actions/comments";
import type { Comment } from "@/types";
import { toast } from "sonner";

type CommentSectionProps = {
  postId: string;
  comments: Comment[];
};

export function CommentSection({ postId, comments }: CommentSectionProps) {
  const [draft, setDraft] = useState("");
  const [localComments, setLocalComments] = useState(comments);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  async function handleSubmit() {
    const content = draft.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    const { comment, error } = await createComment(postId, content);
    setSubmitting(false);

    if (error || !comment) {
      toast.error(error ?? "댓글 작성에 실패했습니다.");
      return;
    }

    setLocalComments((prev) => [...prev, comment]);
    setDraft("");
    toast.success("댓글을 남겼습니다.");
  }

  async function handleDelete(commentId: string) {
    const { error } = await deleteComment(commentId);
    if (error) {
      toast.error(error);
      return;
    }
    setLocalComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("삭제되었습니다.");
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditDraft(comment.content);
  }

  async function handleSaveEdit(commentId: string) {
    const content = editDraft.trim();
    if (!content) return;

    const { error } = await updateComment(commentId, content);
    if (error) {
      toast.error(error);
      return;
    }
    setLocalComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content } : c))
    );
    setEditingId(null);
    toast.success("댓글을 수정했습니다.");
  }

  return (
    <div className="flex flex-col gap-4">
      {localComments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {localComments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <Avatar size="sm">
                {comment.author.avatarUrl ? (
                  <AvatarImage
                    src={comment.author.avatarUrl}
                    alt={comment.author.nickname}
                  />
                ) : null}
                <AvatarFallback>
                  {comment.author.nickname.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {comment.author.nickname}
                    </span>
                    {comment.isMine && (
                      <PostMenu
                        deleteLabel="댓글을 삭제할까요?"
                        onEdit={() => startEdit(comment)}
                        onDelete={() => handleDelete(comment.id)}
                      />
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-1 flex flex-col gap-2">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="min-h-9 resize-none rounded-xl bg-background"
                        rows={1}
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full"
                          disabled={!editDraft.trim()}
                          onClick={() => handleSaveEdit(comment.id)}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-snug text-foreground/90">
                      {comment.content}
                    </p>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 px-1">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                  <ReactionButtons
                    targetType="comment"
                    targetId={comment.id}
                    size="sm"
                    initialLikeCount={comment.likeCount}
                    initialDislikeCount={comment.dislikeCount}
                    initialReaction={comment.myReaction}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="댓글을 남겨보세요"
          className="min-h-9 resize-none rounded-2xl"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="sm"
          className="rounded-full"
          disabled={!draft.trim() || submitting}
          onClick={handleSubmit}
        >
          게시
        </Button>
      </div>
    </div>
  );
}
