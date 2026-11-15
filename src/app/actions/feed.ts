"use server";

import { getFeedPage, type FeedCursor } from "@/lib/data/posts";

export async function fetchNextFeedPage(cursor: FeedCursor) {
  return getFeedPage(cursor);
}
