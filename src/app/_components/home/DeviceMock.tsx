"use client";

import { useState, memo } from "react";
import TypewriterCode from "./TypewriterCode";
import LineNumbers from "./LineNumbers";
import TypewriterTerminal from "./TypewriterTerminal";

const fullCode = `// app/welcome.js

function main() {
  console.log("Welcome to LoopLab");
}

main();`;

const DeviceMock = memo(function DeviceMock() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [phase, setPhase] = useState<"typing" | "running" | "terminal" | "reset">("typing");
  return (
    <div className="group relative animate-float-subtle motion-reduce:animate-none w-full">
      {/* Main device container */}
      <div className="relative w-full">
        {/* Screen frame with realistic styling */}
        <div className="relative bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400 rounded-t-2xl p-2 sm:p-2.5 shadow-2xl border border-gray-400/30">
          {/* Top bezel with camera */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-gray-800 z-10" />
          
          {/* Screen bezel inner shadow - fixed aspect ratio prevents layout shift */}
          <div className="bg-gray-900 rounded-lg overflow-hidden aspect-[16/10] shadow-inner will-change-auto">
            {/* VS Code Editor */}
            <div className="h-full flex flex-col bg-slate-900 text-slate-100 font-mono">
              {/* Top bar - Window controls + title */}
              <div className="flex items-center justify-between h-8 bg-slate-800 border-b border-slate-700/50 px-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-slate-400 text-xs font-sans">
                  LoopLab — Visual Studio Code
                </div>
                <div className="w-12" /> {/* Spacer */}
              </div>

              {/* Tab bar */}
              <div className="flex items-end h-9 bg-slate-800 border-b border-slate-700/50">
                <div className="px-4 py-2 bg-slate-900 border-t border-l border-r border-slate-700/50 rounded-t text-slate-200 text-xs">
                  welcome.js
                </div>
                <div className="px-4 py-2 text-slate-500 text-xs hover:text-slate-300 transition-colors">
                  package.json
                </div>
              </div>

              {/* Editor content area */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className={`flex-1 flex overflow-hidden transition-all duration-300 ${showTerminal && phase === "terminal" ? "flex-[0.7]" : "flex-1"}`}>
                  {/* Left sidebar (minimal) */}
                  <div className="w-14 bg-slate-950 border-r border-slate-800 flex flex-col items-center pt-3 gap-4">
                    <div className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Code editor */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Line numbers - dynamic based on code */}
                    <LineNumbers code={fullCode} />
                    
                    {/* Typewriter code content */}
                    <TypewriterCode code={fullCode} onPhaseChange={setPhase} onTerminalChange={setShowTerminal} />
                  </div>
                </div>

                {/* Terminal panel */}
                <TypewriterTerminal showTerminal={showTerminal} phase={phase} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom deck/base */}
        <div className="bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 h-4 rounded-b-xl mx-8 shadow-lg" />
        <div className="bg-gradient-to-b from-gray-400 to-gray-500 h-1.5 rounded-b-lg mx-24" />
      </div>

      {/* Subtle drop shadow */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-black/20 blur-2xl rounded-full -z-10" />

      {/* Subtle screen glare overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-t-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent" />

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float-subtle {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
        .animate-float-subtle {
          animation: float-subtle 6s ease-in-out infinite;
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-subtle,
          .animate-blink {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
});

export default DeviceMock;

