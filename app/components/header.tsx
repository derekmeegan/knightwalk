"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-subtle bg-surface/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">
            KNIGHTWALKER
          </span>
        </Link>
      </div>
    </header>
  );
}
