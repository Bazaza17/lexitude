import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuditAI — Enterprise AI Readiness",
  description:
    "Automated compliance audits that cross-reference your code, your policies, and the regulations you're claiming to meet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black dark:bg-black dark:text-white">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <span className="inline-block h-2 w-2 bg-black dark:bg-white" />
              AuditAI
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/history"
                className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
              >
                History
              </Link>
              <Link
                href="/new"
                className="inline-flex items-center bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Start audit
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          AuditAI · Enterprise AI Readiness · Built for the eMerge AI Hackathon
        </footer>
      </body>
    </html>
  );
}
