"use client";

import { BoardTransition } from "./board-transition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BoardTransition />
    </>
  );
}
