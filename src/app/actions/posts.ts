"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteStorageObjectFromUrl, uploadPostImage } from "@/lib/storage";

export async function createPost(
  formData: FormData
): Promise<{ post: { id: string; content: string; imageUrl: string | null; createdAt: string } | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { post: null, error: "로그인이 필요합니다." };

  const content = (formData.get("content") as string | null)?.trim() ?? "";
  if (!content) return { post: null, error: "내용을 입력해주세요." };
  if (content.length > 2000) return { post: null, error: "내용은 2000자 이하로 작성해주세요." };

  const image = formData.get("image") as File | null;
  let imageUrl: string | null = null;

  try {
    if (image && image.size > 0) {
      imageUrl = await uploadPostImage(supabase, user.id, image);
    }
  } catch (err) {
    return { post: null, error: err instanceof Error ? err.message : "이미지 업로드에 실패했습니다." };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content, image_url: imageUrl })
    .select("id, content, image_url, created_at")
    .single();
  if (error || !data) return { post: null, error: "게시글 작성에 실패했습니다." };

  return {
    post: { id: data.id, content: data.content, imageUrl: data.image_url, createdAt: data.created_at },
    error: null,
  };
}

export async function updatePost(
  postId: string,
  formData: FormData
): Promise<{ post: { content: string; imageUrl: string | null } | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { post: null, error: "로그인이 필요합니다." };

  const content = (formData.get("content") as string | null)?.trim() ?? "";
  if (!content) return { post: null, error: "내용을 입력해주세요." };
  if (content.length > 2000) return { post: null, error: "내용은 2000자 이하로 작성해주세요." };

  const image = formData.get("image") as File | null;
  const removeImage = formData.get("removeImage") === "1";

  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", postId)
    .single();
  if (fetchError || !existing) return { post: null, error: "게시글을 찾을 수 없습니다." };

  let imageUrl = existing.image_url;

  try {
    if (image && image.size > 0) {
      if (existing.image_url) {
        await deleteStorageObjectFromUrl(supabase, "post-images", existing.image_url);
      }
      imageUrl = await uploadPostImage(supabase, user.id, image);
    } else if (removeImage && existing.image_url) {
      await deleteStorageObjectFromUrl(supabase, "post-images", existing.image_url);
      imageUrl = null;
    }
  } catch (err) {
    return { post: null, error: err instanceof Error ? err.message : "이미지 업로드에 실패했습니다." };
  }

  const { error } = await supabase
    .from("posts")
    .update({ content, image_url: imageUrl })
    .eq("id", postId)
    .eq("author_id", user.id);
  if (error) return { post: null, error: "게시글 수정에 실패했습니다." };

  return { post: { content, imageUrl }, error: null };
}

export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: existing } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", postId)
    .single();

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);
  if (error) return { error: "게시글 삭제에 실패했습니다." };

  if (existing?.image_url) {
    await deleteStorageObjectFromUrl(supabase, "post-images", existing.image_url);
  }

  return { error: null };
}
