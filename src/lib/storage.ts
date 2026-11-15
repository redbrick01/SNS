import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = Object.keys(EXT_BY_MIME);

export function assertValidImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("jpg, png, webp 형식의 이미지만 업로드할 수 있어요.");
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`이미지는 ${MAX_IMAGE_SIZE_MB}MB 이하만 가능해요.`);
  }
}

export async function uploadPostImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
) {
  assertValidImage(file);
  const ext = EXT_BY_MIME[file.type];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("post-images").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
) {
  assertValidImage(file);
  const ext = EXT_BY_MIME[file.type];
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteStorageObjectFromUrl(
  supabase: SupabaseClient<Database>,
  bucket: "avatars" | "post-images",
  publicUrl: string
) {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length).split("?")[0];
  await supabase.storage.from(bucket).remove([path]);
}
