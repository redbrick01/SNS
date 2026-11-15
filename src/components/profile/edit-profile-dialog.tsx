"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { updateProfile } from "@/app/actions/profile";
import type { Profile } from "@/types";
import { toast } from "sonner";

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
};

export function EditProfileDialog({ open, onOpenChange, profile }: EditProfileDialogProps) {
  const { setProfile } = useCurrentUser();
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setNickname(profile.nickname);
      setBio(profile.bio ?? "");
      setAvatarPreview(profile.avatarUrl);
      setAvatarFile(null);
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

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!nickname.trim()) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("nickname", nickname.trim());
    formData.set("bio", bio.trim());
    if (avatarFile) formData.set("avatar", avatarFile);

    const { profile: updated, error } = await updateProfile(formData);
    setSubmitting(false);

    if (error || !updated) {
      toast.error(error ?? "프로필 수정에 실패했습니다.");
      return;
    }

    setProfile(updated);
    toast.success("프로필을 수정했습니다.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 수정</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative"
            aria-label="프로필 사진 변경"
          >
            <Avatar size="lg" className="size-20">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={nickname} />
              ) : null}
              <AvatarFallback className="text-xl">
                {nickname.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              <Camera className="size-5" />
            </span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">소개글</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            className="min-h-20 resize-none rounded-xl"
            placeholder="나를 소개해보세요"
          />
        </div>

        <DialogFooter>
          <Button className="w-full rounded-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
