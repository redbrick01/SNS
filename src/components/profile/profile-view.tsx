"use client";

import { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import type { Post } from "@/types";

type ProfileViewProps = {
  posts: Post[];
};

export function ProfileView({ posts }: ProfileViewProps) {
  const { profile } = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar size="lg" className="size-24 ring-1 ring-border">
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />
          ) : null}
          <AvatarFallback className="text-2xl">
            {profile.nickname.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
          <h1 className="font-heading text-xl font-semibold">{profile.nickname}</h1>
          {profile.bio && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">게시글 {posts.length}개</p>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setEditOpen(true)}
        >
          프로필 수정
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          내가 쓴 게시글
        </h2>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              아직 작성한 게시글이 없어요
            </p>
            <p className="text-sm text-muted-foreground">
              피드에서 첫 게시글을 올려보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {posts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-3">
                    <p className="line-clamp-4 text-center text-xs text-muted-foreground">
                      {post.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} />
    </div>
  );
}
