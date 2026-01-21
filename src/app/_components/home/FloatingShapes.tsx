"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface GlowBlob {
  id: number;
  size: number;
  x: number;
  y: number;
  color: string;
  blur: number;
  opacity: number;
}

// Subtle glow blobs that complement the Blue Steel gradient
const glowBlobs: GlowBlob[] = [
  { id: 1, size: 400, x: 15, y: 20, color: "#3b82f6", blur: 120, opacity: 0.15 },
  { id: 2, size: 300, x: 75, y: 30, color: "#6366f1", blur: 100, opacity: 0.12 },
  { id: 3, size: 250, x: 25, y: 70, color: "#22d3ee", blur: 90, opacity: 0.1 },
  { id: 4, size: 350, x: 80, y: 75, color: "#8b5cf6", blur: 110, opacity: 0.1 },
  { id: 5, size: 200, x: 50, y: 50, color: "#60a5fa", blur: 80, opacity: 0.08 },
];

export default function FloatingShapes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      blobsRef.current.forEach((blob, index) => {
        if (!blob) return;

        // Random movement parameters for organic feel
        const xRange = 40 + Math.random() * 30;
        const yRange = 30 + Math.random() * 25;
        const duration = 12 + Math.random() * 6;
        const delay = index * 0.8;

        // Continuous floating animation
        gsap.to(blob, {
          x: `+=${xRange}`,
          y: `+=${yRange}`,
          duration: duration,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: delay,
        });

        // Subtle opacity pulse
        gsap.to(blob, {
          opacity: glowBlobs[index].opacity * 1.3,
          duration: duration * 0.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: delay + 1,
        });

        // Very subtle scale pulse
        gsap.to(blob, {
          scale: 1.08,
          duration: duration * 1.1,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: delay + 2,
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {glowBlobs.map((blob, index) => (
        <div
          key={blob.id}
          ref={(el) => { blobsRef.current[index] = el; }}
          className="absolute rounded-full will-change-transform"
          style={{
            width: blob.size,
            height: blob.size,
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            backgroundColor: blob.color,
            filter: `blur(${blob.blur}px)`,
            opacity: blob.opacity,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
