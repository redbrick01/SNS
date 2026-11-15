"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadAvatar } from "@/lib/storage";
import type { Profile } from "@/types";

export async function updateProfile(
  formData: FormData
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: "로그인이 필요합니다." };

  const nickname = (formData.get("nickname") as string | null)?.trim() ?? "";
  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  if (!nickname) return { profile: null, error: "닉네임을 입력해주세요." };
  if (nickname.length > 20) return { profile: null, error: "닉네임은 20자 이하로 입력해주세요." };
  if (bio.length > 160) return { profile: null, error: "소개글은 160자 이하로 입력해주세요." };

  const { data: existingNickname } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .neq("id", user.id)
    .maybeSingle();
  if (existingNickname) return { profile: null, error: "이미 사용 중인 닉네임입니다." };

  const avatar = formData.get("avatar") as File | null;
  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  let avatarUrl = current?.avatar_url ?? null;

  try {
    if (avatar && avatar.size > 0) {
      avatarUrl = await uploadAvatar(supabase, user.id, avatar);
    }
  } catch (err) {
    return { profile: null, error: err instanceof Error ? err.message : "이미지 업로드에 실패했습니다." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ nickname, bio: bio || null, avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("id, nickname, avatar_url, bio")
    .single();
  if (error || !data) return { profile: null, error: "프로필 수정에 실패했습니다." };

  return {
    profile: {
      id: data.id,
      nickname: data.nickname,
      avatarUrl: data.avatar_url,
      bio: data.bio,
    },
    error: null,
  };
}
