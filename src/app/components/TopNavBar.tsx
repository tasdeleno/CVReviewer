import Link from "next/link";
import { LockClosedIcon } from "@heroicons/react/24/solid";

export const TopNavBar = () => (
  <header
    aria-label="Site başlığı"
    className="flex h-[var(--top-nav-bar-height)] items-center justify-between px-4 lg:px-12"
  >
    <Link
      href="/"
      className="text-lg font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      CVReviewer
    </Link>
    <p className="flex items-center gap-1.5 text-sm text-muted">
      <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sm:hidden">Cihazında çalışır</span>
      <span className="hidden sm:inline">
        Tarayıcında çalışır · CV ve ilan cihazından çıkmaz
      </span>
    </p>
  </header>
);
