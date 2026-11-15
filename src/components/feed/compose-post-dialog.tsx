"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { createPost, updatePost } from "@/app/actions/posts";
import { toast } from "sonner";

const MAX_CONTENT_LENGTH = 2000;
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ComposePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (post: { id: string; content: string; imageUrl: string | null; createdAt: string }) => void;
  editTarget?: { id: string; content: string; imageUrl: string | null } | null;
  onUpdated?: (next: { content: string; imageUrl: string | null }) => void;
};

export function ComposePostDialog({
  open,
  onOpenChange,
  onCreated,
  editTarget,
  onUpdated,
}: ComposePostDialogProps) {
  const { profile } = useCurrentUser();
  const [content, setContent] = useState(editTarget?.content ?? "");
  const [preview, setPreview] = useState<string | null>(editTarget?.imageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setContent(editTarget?.content ?? "");
      setPreview(editTarget?.imageUrl ?? null);
      setImageFile(null);
      setImageRemoved(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("jpg, png, webp 형식의 이미지만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`이미지는 ${MAX_IMAGE_SIZE_MB}MB 이하만 가능해요.`);
      return;
    }

    setImageFile(file);
    setImageRemoved(false);
    setPreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setPreview(null);
    setImageRemoved(true);
  }

  function handleClose(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("content", content);
    if (imageFile) formData.set("image", imageFile);
    if (imageRemoved) formData.set("removeImage", "1");

    if (editTarget) {
      const { post, error } = await updatePost(editTarget.id, formData);
      setSubmitting(false);
      if (error || !post) {
        toast.error(error ?? "게시글 수정에 실패했습니다.");
        return;
      }
      toast.success("게시글을 수정했습니다.");
      onUpdated?.(post);
      handleClose(false);
      return;
    }

    const { post, error } = await createPost(formData);
    setSubmitting(false);
    if (error || !post) {
      toast.error(error ?? "게시글 작성에 실패했습니다.");
      return;
    }
    toast.success("게시글을 올렸습니다.");
    onCreated?.(post);
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTarget ? "게시글 수정" : "새 게시글"}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />
            ) : null}
            <AvatarFallback>
              {profile.nickname.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{profile.nickname}</span>
        </div>

        <Textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
          placeholder="무슨 일이 있었나요?"
          className="min-h-32 resize-none rounded-xl"
        />
        <p className="text-right text-xs text-muted-foreground">
          {content.length} / {MAX_CONTENT_LENGTH}
        </p>

        {preview ? (
          <div className="relative overflow-hidden rounded-xl">
            <div className="relative aspect-square w-full bg-muted">
              <Image src={preview} alt="" fill className="object-cover" />
            </div>
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute right-2 top-2 rounded-full"
              onClick={handleRemoveImage}
              aria-label="이미지 제거"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <ImagePlus className="size-4" />
            이미지 추가
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <DialogFooter>
          <Button
            className="w-full rounded-full"
            disabled={!content.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "처리 중…" : editTarget ? "수정하기" : "게시하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
