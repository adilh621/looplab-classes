"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import DeviceMock from "./DeviceMock";
import { SiJavascript, SiPython, SiHtml5, SiScratch } from "react-icons/si";

const floatingIcons = [
  { icon: SiJavascript, position: "top-[18%] left-[5%]", delay: 0, color: "text-yellow-400" },
  { icon: SiPython, position: "top-[12%] right-[8%]", delay: 0.15, color: "text-blue-400" },
  { icon: SiHtml5, position: "bottom-[35%] left-[3%]", delay: 0.3, color: "text-orange-400" },
  { icon: SiScratch, position: "bottom-[25%] right-[6%]", delay: 0.45, color: "text-orange-500" },
];

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let ctx: gsap.Context | null = null;
    
    // Defer animation initialization to allow first paint
    const rafId = requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      if (prefersReducedMotion) {
        // Show elements immediately without animation
        if (contentRef.current) gsap.set(contentRef.current.children, { opacity: 1, y: 0 });
        if (visualRef.current) gsap.set(visualRef.current, { opacity: 1, y: 0, scale: 1 });
        iconsRef.current.forEach((icon) => {
          if (icon) gsap.set(icon, { opacity: 0.8 });
        });
        return;
      }

      ctx = gsap.context(() => {
        // Content animation - only transform and opacity
        if (contentRef.current) {
          const children = contentRef.current.children;
          gsap.set(children, { opacity: 0, y: 40 });
          gsap.to(children, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: "power2.out",
            delay: 0.2,
          });
        }

        // Visual animation - only transform and opacity
        if (visualRef.current) {
          gsap.set(visualRef.current, { opacity: 0, y: 60, scale: 0.96 });
          gsap.to(visualRef.current, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power2.out",
            delay: 0.5,
          });
        }

        // Floating icons - minimal animations, only transform
        iconsRef.current.forEach((icon, index) => {
          if (!icon) return;
          
          gsap.set(icon, { opacity: 0 });
          gsap.to(icon, {
            opacity: 0.8,
            duration: 0.6,
            delay: 0.8 + floatingIcons[index].delay,
            ease: "power2.out",
          });

          // Gentle float - only y transform
          gsap.to(icon, {
            y: "+=6",
            duration: 4 + index,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 1 + floatingIcons[index].delay,
          });
        });
      }, heroRef);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Blue Steel Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-gray-600 to-blue-800" />
      
      {/* Static gradient orbs - no animation for performance */}
      <div className="absolute top-[5%] left-[5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-500/15 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] rounded-full bg-indigo-400/10 blur-[80px]" />

      {/* Floating language icons */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block" aria-hidden="true">
        {floatingIcons.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              ref={(el) => { iconsRef.current[index] = el; }}
              className={`absolute ${item.position} w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center ${item.color} opacity-0 shadow-lg`}
            >
              <Icon className="w-6 h-6" />
            </div>
          );
        })}
      </div>

      {/* Main content - Asymmetric layout */}
      <div className="container-premium relative z-10 pt-32 pb-20">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-16 items-center">
          
          {/* Left: Text content */}
          <div ref={contentRef} className="max-w-lg [&>*]:opacity-0 [&>*]:will-change-[opacity,transform]">
            <p className="text-white/70 text-sm font-medium tracking-wide uppercase mb-4">
              Personalized coding education
            </p>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              Learn to code,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
                one-on-one.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/75 mb-8 leading-relaxed">
              1:1 personalized coding tutoring for students of all ages and experience levels. 
              From first lines of code to advanced projects.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://looplab.adilh.co/"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold rounded-full bg-white text-gray-900 transition-transform duration-200 hover:scale-[1.03]"
              >
                Get in touch
                <svg 
                  className="ml-2 w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold rounded-full text-white border border-white/25 hover:bg-white/10 transition-colors duration-200"
              >
                How it works
              </a>
            </div>

            {/* Quick stats */}
            <div className="flex gap-8 mt-12 pt-8 border-t border-white/10">
              <div>
                <div className="text-2xl font-bold text-white">All ages</div>
                <div className="text-sm text-white/50">Kids to adults</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">1:1</div>
                <div className="text-sm text-white/50">Personal attention</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Flexible</div>
                <div className="text-sm text-white/50">Your schedule</div>
              </div>
            </div>
          </div>

          {/* Right: Visual - Device Mock with VS Code Editor */}
          <div ref={visualRef} className="relative lg:pl-8 w-full opacity-0 will-change-[opacity,transform]">
            <div className="relative w-full max-w-4xl mx-auto lg:mx-0">
              <DeviceMock />
              {/* Glow under device */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-16 bg-blue-400/20 blur-[40px] rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
