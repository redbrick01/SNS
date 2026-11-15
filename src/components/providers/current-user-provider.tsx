"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Profile } from "@/types";

const CurrentUserContext = createContext<{
  profile: Profile;
  setProfile: (profile: Profile) => void;
} | null>(null);

export function CurrentUserProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(profile);

  return (
    <CurrentUserContext.Provider value={{ profile: current, setProfile: setCurrent }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}
