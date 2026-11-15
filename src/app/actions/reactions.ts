"use server";

import { createClient } from "@/lib/supabase/server";

type ToggleReactionInput = {
  targetType: "post" | "comment";
  targetId: string;
  reaction: "like" | "dislike";
};

export async function toggleReaction({
  targetType,
  targetId,
  reaction,
}: ToggleReactionInput): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: existing } = await supabase
    .from("reactions")
    .select("id, reaction_type")
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing?.reaction_type === reaction) {
    const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
    if (error) return { error: "처리에 실패했습니다." };
    return { error: null };
  }

  if (existing) {
    const { error } = await supabase
      .from("reactions")
      .update({ reaction_type: reaction })
      .eq("id", existing.id);
    if (error) return { error: "처리에 실패했습니다." };
    return { error: null };
  }

  const { error } = await supabase.from("reactions").insert({
    user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reaction_type: reaction,
  });
  if (error) return { error: "처리에 실패했습니다." };

  return { error: null };
}
