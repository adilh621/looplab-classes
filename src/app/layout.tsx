// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LoopLab Classes",
  description: "Parent portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="text-lg font-semibold">
                LoopLab Classes
              </Link>
              <nav>
                <Link
                  href="/loopy"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-full px-4 py-2 text-sm transition-colors"
                >
                  Play Loopy
                </Link>
              </nav>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
