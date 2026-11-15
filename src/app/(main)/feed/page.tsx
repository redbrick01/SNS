import { Suspense } from "react";
import { FeedView } from "@/components/feed/feed-view";
import { getFeedPage } from "@/lib/data/posts";

export default async function FeedPage() {
  const { posts, nextCursor } = await getFeedPage();

  return (
    <Suspense>
      <FeedView initialPosts={posts} initialCursor={nextCursor} />
    </Suspense>
  );
}
