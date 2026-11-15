"use server";

import { createClient } from "@/lib/supabase/server";

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  return { error: null };
}

export async function signUp(
  email: string,
  password: string,
  nickname: string
): Promise<{ error: string | null; needsEmailConfirmation: boolean }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();
  if (existing) {
    return { error: "이미 사용 중인 닉네임입니다.", needsEmailConfirmation: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });

  if (error) {
    return { error: "회원가입에 실패했습니다. 다시 시도해주세요.", needsEmailConfirmation: false };
  }
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "이미 가입된 이메일입니다.", needsEmailConfirmation: false };
  }

  return { error: null, needsEmailConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
