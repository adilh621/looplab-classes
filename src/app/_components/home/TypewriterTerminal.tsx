"use client";

interface TypewriterTerminalProps {
  showTerminal: boolean;
  phase: "typing" | "running" | "terminal" | "reset";
}

export default function TypewriterTerminal({ showTerminal, phase }: TypewriterTerminalProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-700/50 transition-all duration-300 ease-out pointer-events-none ${
        showTerminal && phase === "terminal"
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      }`}
      style={{ height: "38%", maxHeight: "38%" }}
    >
      <div className="h-full flex flex-col">
        {/* Terminal header */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-600" />
          <span className="text-slate-400 text-xs font-mono">Terminal</span>
        </div>
        
        {/* Terminal content */}
        <div className="flex-1 px-4 py-3 text-xs sm:text-sm font-mono text-slate-200 overflow-hidden">
          {showTerminal && phase === "terminal" && (
            <>
              <div className="text-slate-400">$ node welcome.js</div>
              <div className="text-emerald-400 mt-1">Welcome to LoopLab</div>
              <span className="inline-block w-2 h-4 bg-slate-200 ml-1 animate-blink motion-reduce:animate-none" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

