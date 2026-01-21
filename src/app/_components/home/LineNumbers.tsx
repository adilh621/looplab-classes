"use client";

import { memo, useMemo } from "react";

interface LineNumbersProps {
  code: string;
}

const LineNumbers = memo(function LineNumbers({ code }: LineNumbersProps) {
  const maxLines = useMemo(() => {
    const lineCount = code.split("\n").length;
    return Math.max(lineCount, 35); // Show at least 35 lines for larger window
  }, [code]);

  const lineNumbers = useMemo(() => 
    Array.from({ length: maxLines }, (_, i) => i + 1),
    [maxLines]
  );

  return (
    <div className="w-12 bg-slate-950 text-slate-500 text-xs sm:text-sm pt-3 px-3 text-right select-none font-mono">
      {lineNumbers.map((num) => (
        <div key={num} className="py-0.5">{num}</div>
      ))}
    </div>
  );
});

export default LineNumbers;

