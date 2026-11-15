import { createClient } from "@/lib/supabase/server";
import type { Comment, Post, Profile, ReactionType } from "@/types";

export const FEED_PAGE_SIZE = 10;

export type FeedCursor = { createdAt: string; id: string };

type ProfileRow = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
};

type ReactionRow = {
  target_id: string;
  reaction_type: string;
  user_id: string;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
  };
}

function aggregateReactions(rows: ReactionRow[], currentUserId: string | null) {
  const map = new Map<string, { likeCount: number; dislikeCount: number; myReaction: ReactionType }>();
  for (const row of rows) {
    const entry = map.get(row.target_id) ?? { likeCount: 0, dislikeCount: 0, myReaction: null as ReactionType };
    if (row.reaction_type === "like") entry.likeCount += 1;
    if (row.reaction_type === "dislike") entry.dislikeCount += 1;
    if (currentUserId && row.user_id === currentUserId) {
      entry.myReaction = row.reaction_type as ReactionType;
    }
    map.set(row.target_id, entry);
  }
  return map;
}

export async function getFeedPage(
  cursor?: FeedCursor
): Promise<{ posts: Post[]; nextCursor: FeedCursor | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("posts")
    .select(
      "id, author_id, content, image_url, created_at, author:profiles!posts_author_id_fkey(id, nickname, avatar_url, bio)"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data: postRows, error } = await query;
  if (error) throw error;
  if (!postRows || postRows.length === 0) return { posts: [], nextCursor: null };

  const postIds = postRows.map((p) => p.id);

  const { data: commentRows, error: commentsError } = await supabase
    .from("comments")
    .select(
      "id, post_id, author_id, content, created_at, author:profiles!comments_author_id_fkey(id, nickname, avatar_url, bio)"
    )
    .in("post_id", postIds)
    .order("created_at", { ascending: true });
  if (commentsError) throw commentsError;

  const commentIds = (commentRows ?? []).map((c) => c.id);

  const [{ data: postReactions, error: postReactionsError }, commentReactionsResult] = await Promise.all([
    supabase
      .from("reactions")
      .select("target_id, reaction_type, user_id")
      .eq("target_type", "post")
      .in("target_id", postIds),
    commentIds.length > 0
      ? supabase
          .from("reactions")
          .select("target_id, reaction_type, user_id")
          .eq("target_type", "comment")
          .in("target_id", commentIds)
      : Promise.resolve({ data: [] as ReactionRow[], error: null }),
  ]);
  if (postReactionsError) throw postReactionsError;
  const { data: commentReactions, error: commentReactionsError } = commentReactionsResult;
  if (commentReactionsError) throw commentReactionsError;

  const postReactionMap = aggregateReactions(postReactions ?? [], user?.id ?? null);
  const commentReactionMap = aggregateReactions(commentReactions ?? [], user?.id ?? null);

  const commentsByPostId = new Map<string, Comment[]>();
  for (const row of commentRows ?? []) {
    const reaction = commentReactionMap.get(row.id);
    const comment: Comment = {
      id: row.id,
      postId: row.post_id,
      author: toProfile(row.author as unknown as ProfileRow),
      content: row.content,
      createdAt: row.created_at,
      likeCount: reaction?.likeCount ?? 0,
      dislikeCount: reaction?.dislikeCount ?? 0,
      myReaction: reaction?.myReaction ?? null,
      isMine: row.author_id === user?.id,
    };
    const list = commentsByPostId.get(row.post_id) ?? [];
    list.push(comment);
    commentsByPostId.set(row.post_id, list);
  }

  const posts: Post[] = postRows.map((row) => {
    const reaction = postReactionMap.get(row.id);
    return {
      id: row.id,
      author: toProfile(row.author as unknown as ProfileRow),
      content: row.content,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      likeCount: reaction?.likeCount ?? 0,
      dislikeCount: reaction?.dislikeCount ?? 0,
      myReaction: reaction?.myReaction ?? null,
      isMine: row.author_id === user?.id,
      comments: commentsByPostId.get(row.id) ?? [],
    };
  });

  const last = postRows[postRows.length - 1];
  const nextCursor =
    postRows.length === FEED_PAGE_SIZE ? { createdAt: last.created_at, id: last.id } : null;

  return { posts, nextCursor };
}

export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postRows, error } = await supabase
    .from("posts")
    .select(
      "id, author_id, content, image_url, created_at, author:profiles!posts_author_id_fkey(id, nickname, avatar_url, bio)"
    )
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (postRows ?? []).map((row) => ({
    id: row.id,
    author: toProfile(row.author as unknown as ProfileRow),
    content: row.content,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    likeCount: 0,
    dislikeCount: 0,
    myReaction: null,
    isMine: row.author_id === user?.id,
    comments: [],
  }));
}
