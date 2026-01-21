"use client";

import Link from "next/link";

interface GlassLayoutProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

export function GlassLayout({ children, maxWidth = "5xl" }: GlassLayoutProps) {
  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-full",
  }[maxWidth];

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Blue Steel Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-gray-600 to-blue-800" />

      {/* Navigation Header */}
      <header className="relative z-20 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-xl text-white tracking-tight"
          >
            LoopLab<span className="text-blue-500"> Classes</span>
          </Link>
        </div>
      </header>

      {/* Content Container */}
      <div className="relative z-10 flex-1 px-6 py-8">
        <div className={`w-full ${maxWidthClass} mx-auto`}>
          {children}
        </div>
      </div>
    </main>
  );
}

// Shared glass card style (NO blur)
export const glassCard = "bg-white/10 border border-white/15 rounded-3xl p-6 md:p-8 lg:p-10 shadow-lg";

// Shared button styles
export const buttonPrimary = "px-5 py-2.5 rounded-full font-semibold text-white bg-white text-gray-900 hover:scale-[1.02] transition-transform duration-200";
export const buttonSecondary = "px-5 py-2.5 rounded-full font-medium text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors duration-200";

// Shared input style
export const inputStyle = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200";

