import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ForgetBookmarks } from "@/components/reading/forget-bookmarks";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { TabsProvider } from "@/components/tabs/tabs-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koran AI",
  description: "Read the Quran in Arabic, with translation, tafsir, and grounded AI answers.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Koran AI", statusBarStyle: "default" },
  // The manifest names these too; a browser reads them from here before it has read the manifest,
  // and iOS only ever reads the apple one.
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1a17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col antialiased">
        <RegisterServiceWorker />
        <ForgetBookmarks />

        <header className="bg-parchment/85 dark:bg-night/85 sticky top-0 z-10 border-b border-black/10 backdrop-blur dark:border-white/10">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Koran AI
            </Link>
            <Link href="/" className="text-sm text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white">
              Surahs
            </Link>
          </nav>
        </header>

        {/* Tabs live above the routes so a reader's open Tabs survive moving between Surahs. */}
        <TabsProvider>
          {/* Each route owns its own width: the Surah page widens when Tabs are open. */}
          <main className="w-full flex-1 px-4 py-8">{children}</main>
        </TabsProvider>

        <footer className="mt-12 border-t border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-3xl space-y-1 px-4 py-6 text-xs leading-relaxed text-black/55 dark:text-white/55">
            <p>
              Arabic Quran text from the{" "}
              <a href="https://tanzil.net" className="underline underline-offset-2 hover:text-black dark:hover:text-white">
                Tanzil Project
              </a>
              , used verbatim under its terms of use. Copyright &copy; 2007&ndash;2025 Tanzil Project.
            </p>
            <p>Koran AI is open source under the MIT license. No account, no tracking, no server.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
