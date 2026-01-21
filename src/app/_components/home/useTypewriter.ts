"use client";

import { useEffect, useState, useRef } from "react";

type Phase = "typing" | "running" | "terminal" | "reset";

interface TypewriterOptions {
  text: string;
  speed?: number; // milliseconds per character
  pauseAfterTyping?: number; // pause after typing finishes (before "running")
  terminalDuration?: number; // how long to show terminal
  loop?: boolean;
}

export function useTypewriter({ 
  text, 
  speed = 30, 
  pauseAfterTyping = 800,
  terminalDuration = 1500,
  loop = true 
}: TypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [showTerminal, setShowTerminal] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    // Defer typewriter start to allow first paint
    const rafId = requestAnimationFrame(() => {
      prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      // If reduced motion, show full text immediately
      if (prefersReducedMotion.current) {
        setDisplayedText(text);
        setPhase("typing");
        return;
      }

      const clearAllTimeouts = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      const type = () => {
        if (indexRef.current < text.length) {
          setDisplayedText(text.slice(0, indexRef.current + 1));
          indexRef.current += 1;
          timeoutRef.current = setTimeout(type, speed);
        } else {
          // Finished typing, move to "running" phase
          setPhase("running");
          timeoutRef.current = setTimeout(() => {
            // Show terminal
            setPhase("terminal");
            setShowTerminal(true);
            
            // After terminal duration, reset
            timeoutRef.current = setTimeout(() => {
              setShowTerminal(false);
              setPhase("reset");
              
              // Clear and restart
              timeoutRef.current = setTimeout(() => {
                if (loop) {
                  indexRef.current = 0;
                  setDisplayedText("");
                  setPhase("typing");
                  type();
                }
              }, 300); // Brief pause before restart
            }, terminalDuration);
          }, pauseAfterTyping);
        }
      };

      // Start typing with small delay to ensure paint
      timeoutRef.current = setTimeout(type, 100);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [text, speed, pauseAfterTyping, terminalDuration, loop]);

  return { displayedText, phase, showTerminal, isTyping: phase === "typing" };
}

