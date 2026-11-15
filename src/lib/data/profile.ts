import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, bio")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;

  return {
    id: data.id,
    nickname: data.nickname,
    avatarUrl: data.avatar_url,
    bio: data.bio,
  };
}
