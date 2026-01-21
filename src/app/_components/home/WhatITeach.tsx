"use client";

import { useEffect, useRef } from "react";
import { useScrollReveal } from "./Sections";
import {
  SiScratch,
  SiHtml5,
  SiCss3,
  SiJavascript,
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiPython,
  SiPostgresql,
  SiGit,
  SiGithub,
} from "react-icons/si";

const technologies = [
  { name: "Scratch", icon: SiScratch, color: "text-orange-500" },
  { name: "HTML", icon: SiHtml5, color: "text-orange-600" },
  { name: "CSS", icon: SiCss3, color: "text-blue-500" },
  { name: "JavaScript", icon: SiJavascript, color: "text-yellow-500" },
  { name: "TypeScript", icon: SiTypescript, color: "text-blue-600" },
  { name: "React", icon: SiReact, color: "text-cyan-500" },
  { name: "Next.js", icon: SiNextdotjs, color: "text-gray-900" },
  { name: "Python", icon: SiPython, color: "text-blue-500" },
  { name: "SQL", icon: SiPostgresql, color: "text-blue-700" },
  { name: "Git", icon: SiGit, color: "text-orange-600" },
  { name: "GitHub", icon: SiGithub, color: "text-gray-900" },
];

export function WhatITeach() {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 bg-white">
      <div className="container-premium">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 reveal-item">
          <p className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-3">
            Technologies
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            What I teach
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A practical stack — from first programs to real projects.
          </p>
        </div>

        {/* Marquee container with fade edges */}
        <div className="relative overflow-hidden">
          {/* Fade overlay - left */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          {/* Fade overlay - right */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          {/* Marquee track - 200% width for seamless loop */}
          <div className="marquee-track flex gap-6" style={{ width: "200%" }}>
            {/* First set of items */}
            {technologies.map((tech, i) => {
              const Icon = tech.icon;
              return (
                <div
                  key={`first-${i}`}
                  className="flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <Icon className={`w-6 h-6 ${tech.color}`} />
                  <span className="text-gray-900 font-medium text-sm whitespace-nowrap">
                    {tech.name}
                  </span>
                </div>
              );
            })}
            {/* Duplicate set for seamless loop */}
            {technologies.map((tech, i) => {
              const Icon = tech.icon;
              return (
                <div
                  key={`second-${i}`}
                  className="flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <Icon className={`w-6 h-6 ${tech.color}`} />
                  <span className="text-gray-900 font-medium text-sm whitespace-nowrap">
                    {tech.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

