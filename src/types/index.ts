export type ReactionType = "like" | "dislike" | null;

export type Profile = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type Comment = {
  id: string;
  postId: string;
  author: Profile;
  content: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  myReaction: ReactionType;
  isMine: boolean;
};

export type Post = {
  id: string;
  author: Profile;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  myReaction: ReactionType;
  isMine: boolean;
  comments: Comment[];
};
