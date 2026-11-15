import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { getCurrentProfile } from "@/lib/data/profile";
import { getPostsByAuthor } from "@/lib/data/posts";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const myPosts = await getPostsByAuthor(profile.id);
  return <ProfileView posts={myPosts} />;
}
