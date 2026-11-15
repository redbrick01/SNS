"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { signOut } from "@/app/actions/auth";
import { toast } from "sonner";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useCurrentUser();

  async function handleLogout() {
    await signOut();
    toast.success("로그아웃되었습니다.");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[640px] items-center justify-between px-4">
        <Link
          href="/feed"
          className="font-heading text-xl font-semibold tracking-tight"
        >
          Moments
        </Link>

        <nav className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="새 글 작성"
            data-active={pathname === "/feed"}
            asChild
          >
            <Link href="/feed?compose=1">
              <PlusSquare className="size-5" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="로그아웃"
            onClick={handleLogout}
          >
            <LogOut className="size-5" />
          </Button>

          <Link
            href="/profile"
            aria-label="내 프로필"
            className="ml-1 rounded-full transition-transform active:scale-95"
          >
            <Avatar size="sm" className="ring-1 ring-border">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />
              ) : null}
              <AvatarFallback>
                {profile.nickname.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </nav>
      </div>
    </header>
  );
}
