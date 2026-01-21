"use client";

import React, { memo, useMemo } from "react";
import { useTypewriter } from "./useTypewriter";

interface TypewriterCodeProps {
  code?: string;
  onPhaseChange?: (phase: "typing" | "running" | "terminal" | "reset") => void;
  onTerminalChange?: (show: boolean) => void;
}

// Full code snippet to type (default)
const defaultCode = `// app/welcome.js

function main() {
  console.log("Welcome to LoopLab");
}

main();`;

// Simple syntax highlighter
function highlightCode(line: string): React.ReactElement {
  // Keywords
  const keywords = /\b(function|const|let|var|return|console|log|main)\b/g;
  // Strings (including JSX attribute values)
  const strings = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
  // Comments
  const comments = /\/\/.*$/g;
  
  const result: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  const matches: Array<{ index: number; length: number; type: string; text: string }> = [];
  
  // Collect all matches
  let match;
  while ((match = keywords.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: "keyword", text: match[0] });
  }
  while ((match = strings.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: "string", text: match[0] });
  }
  while ((match = comments.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: "comment", text: match[0] });
  }
  
  // Sort by index
  matches.sort((a, b) => a.index - b.index);
  
  // Build highlighted line
  matches.forEach((m) => {
    if (m.index > lastIndex) {
      result.push(line.slice(lastIndex, m.index));
    }
    if (m.type === "keyword") {
      result.push(<span key={`kw-${m.index}`} className="text-violet-400">{m.text}</span>);
    } else if (m.type === "string") {
      result.push(<span key={`str-${m.index}`} className="text-emerald-400">{m.text}</span>);
    } else if (m.type === "comment") {
      result.push(<span key={`cmt-${m.index}`} className="text-slate-500">{m.text}</span>);
    }
    lastIndex = m.index + m.length;
  });
  
  if (lastIndex < line.length) {
    result.push(line.slice(lastIndex));
  }
  
  return <>{result.length > 0 ? result : line}</>;
}

const TypewriterCode = memo(function TypewriterCode({ code = defaultCode, onPhaseChange, onTerminalChange }: TypewriterCodeProps) {
  const { displayedText, phase, showTerminal } = useTypewriter({
    text: code,
    speed: 30,
    pauseAfterTyping: 800,
    terminalDuration: 1500,
    loop: true,
  });

  // Notify parent of phase and terminal changes
  React.useEffect(() => {
    if (onPhaseChange) onPhaseChange(phase);
  }, [phase, onPhaseChange]);

  React.useEffect(() => {
    if (onTerminalChange) onTerminalChange(showTerminal);
  }, [showTerminal, onTerminalChange]);

  const lines = useMemo(() => displayedText.split("\n"), [displayedText]);
  
  // Get indentation for a line
  const getIndent = (line: string) => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  return (
    <div className="flex-1 pt-3 px-5 text-xs sm:text-sm leading-relaxed font-mono overflow-hidden">
      {lines.map((line, i) => {
        const indent = getIndent(line);
        const isComment = line.trim().startsWith("//");
        
        return (
          <div key={i} className="py-0.5" style={{ paddingLeft: `${indent * 0.75}rem` }}>
            {isComment ? (
              <span className="text-slate-500">{line}</span>
            ) : (
              highlightCode(line)
            )}
          </div>
        );
      })}
      {/* Blinking cursor - always show when text is displayed */}
      {displayedText.length > 0 && phase !== "terminal" && (
        <span className="inline-block w-0.5 h-4 bg-slate-200 ml-1 animate-blink motion-reduce:animate-none" />
      )}
      
      {/* Running indicator */}
      {phase === "running" && (
        <div className="mt-2 text-xs text-slate-400 font-mono">
          $ node welcome.js
        </div>
      )}
    </div>
  );
});

export default TypewriterCode;
