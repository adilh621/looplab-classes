"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Session check
  useEffect(() => {
    const backend = getApiBase();
    if (!backend) return;

    fetch(`${backend}/session/me`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return { authenticated: false };
      })
      .then((data: Me) => {
        setMe(data);
      })
      .catch(() => {
        setMe({ authenticated: false });
      });
  }, []);

  // Logout handler
  async function handleLogout() {
    const backend = getApiBase();
    if (!backend) return;

    try {
      await fetch(`${backend}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setMe({ authenticated: false });
    } catch (err) {
      console.error("Logout failed:", err);
      // Still set to unauthenticated on error
      setMe({ authenticated: false });
    }
  }

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      if (navRef.current) gsap.set(navRef.current, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(navRef.current, { opacity: 0, y: -10 });
      gsap.to(navRef.current, { 
        opacity: 1, 
        y: 0, 
        duration: 0.6, 
        ease: "power2.out",
        delay: 0.1 
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  const isAuthenticated = me?.authenticated === true;

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-white/95 shadow-sm border-b border-gray-200/50"
          : "bg-transparent"
      }`}
    >
      <div className="container-premium">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand */}
          <Link
            href="/"
            className={`font-bold text-lg sm:text-xl tracking-tight transition-colors duration-300 ${
              scrolled ? "text-gray-900" : "text-white"
            }`}
          >
            LoopLab<span className="text-blue-500"> Classes</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-3 sm:gap-5">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={`font-medium text-sm transition-colors duration-200 ${
                    scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className={`font-medium text-sm transition-colors duration-200 ${
                    scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
                  }`}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`font-medium text-sm transition-colors duration-200 ${
                  scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
                }`}
              >
                Log in
              </Link>
            )}
            
            {/* Get an invite - always visible */}
            <a
              href="https://looplab.adilh.co/"
              className={`font-medium text-sm transition-colors duration-200 ${
                scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
              }`}
            >
              Get an invite
            </a>
            
            <Link
              href="/loopy"
              className={`font-semibold rounded-full px-4 sm:px-5 py-2 text-sm transition-colors duration-200 ${
                scrolled
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-white text-gray-900 hover:bg-white/90"
              }`}
            >
              Play Loopy
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
