import type { Metadata } from "next";
import { BookmarksList } from "@/components/reading/bookmarks-list";

export const metadata: Metadata = { title: "Bookmarks — Koran AI" };

export default function BookmarksPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
      <p className="mt-1 text-sm text-black/55 dark:text-white/55">
        The Ayahs you marked, in the order you would read them. Kept in this browser only — there is
        no account and no server holding them.
      </p>

      <BookmarksList />
    </div>
  );
}
