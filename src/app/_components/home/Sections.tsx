"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin once
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Optimized scroll reveal - only animates transform and opacity
export function useScrollReveal(
  ref: React.RefObject<HTMLElement | null>,
  options?: { stagger?: number; y?: number }
) {
  useEffect(() => {
    if (!ref.current) return;
    
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = ref.current.querySelectorAll(".reveal-item");
    
    if (targets.length === 0) return;

    if (prefersReducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(targets, { opacity: 0, y: options?.y ?? 30 });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: options?.stagger ?? 0.1,
            ease: "power2.out",
          });
        },
      });
    });

    return () => ctx.revert();
  }, [ref, options?.stagger, options?.y]);
}

/* ============ HOW IT WORKS ============ */
const steps = [
  {
    number: "01",
    title: "Reach out & discuss goals",
    description: "Send a message to chat about what you want to learn—whether it's building games, preparing for exams, or exploring creative coding.",
  },
  {
    number: "02",
    title: "Schedule flexible sessions",
    description: "Book sessions that fit your schedule. Weekly, bi-weekly, or as-needed—whatever works best for you.",
  },
  {
    number: "03",
    title: "Learn by building real projects",
    description: "Every session focuses on hands-on coding. You'll create games, websites, apps, and more—projects you're genuinely proud of.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef, { stagger: 0.15 });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-40 bg-white"
    >
      <div className="container-premium">
        {/* Asymmetric header */}
        <div className="max-w-2xl mb-16 md:mb-24 reveal-item">
          <p className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-3">
            The process
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            How tutoring works
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Simple, flexible, and focused on what you want to learn.
          </p>
        </div>

        {/* Steps - varied layout */}
        <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`reveal-item ${i === 1 ? "md:translate-y-8" : ""}`}
            >
              <div className="relative p-8 md:p-10 rounded-2xl bg-gray-50 h-full">
                <span className="text-7xl font-bold text-gray-100 absolute top-4 right-6 select-none">
                  {step.number}
                </span>
                <div className="relative">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ WHAT YOU'LL BUILD ============ */
const projects = [
  {
    title: "Games",
    description: "Snake, platformers, RPGs—learn by building games you can actually play and share.",
    emoji: "🎮",
  },
  {
    title: "Websites",
    description: "Personal portfolios, blogs, interactive pages—create your corner of the internet.",
    emoji: "🌐",
  },
  {
    title: "Apps",
    description: "Mobile apps, desktop tools, automation scripts—build software that solves real problems.",
    emoji: "📱",
  },
  {
    title: "Creative Code",
    description: "Generative art, animations, visualizations—where programming meets creativity.",
    emoji: "🎨",
  },
];

export function WhatYouBuild() {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef, { stagger: 0.08 });

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 bg-gray-50">
      <div className="container-premium">
        {/* Header - right aligned for variety */}
        <div className="max-w-2xl ml-auto text-right mb-16 md:mb-24 reveal-item">
          <p className="text-emerald-600 font-medium text-sm tracking-wide uppercase mb-3">
            Project-based
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            What you&apos;ll build
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Every session produces something tangible. No lectures—just building.
          </p>
        </div>

        {/* Even grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <div
              key={i}
              className="reveal-item group"
            >
              <div className="h-full p-8 md:p-10 rounded-2xl bg-white border border-gray-100 transition-colors duration-200 hover:border-gray-200 flex flex-col">
                <span className="text-4xl mb-5 block transition-transform duration-300 group-hover:scale-110">{project.emoji}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{project.title}</h3>
                <p className="text-gray-600 leading-relaxed flex-grow">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ WHAT I TEACH ============ */
export { WhatITeach } from "./WhatITeach";

/* ============ TESTIMONIALS ============ */
const testimonials = [
  {
    quote: "My son went from zero experience to building his own games. He's so proud of what he creates and actually looks forward to his sessions.",
    author: "Sarah M.",
    role: "Parent",
  },
  {
    quote: "The teaching style is perfect—patient, clear, and adapts to exactly what I need. I've learned more in a few months than I did in a year of trying on my own.",
    author: "Alex T.",
    role: "College student",
  },
  {
    quote: "LoopLab helped me prepare for AP Computer Science. I got a 5 on the exam and now I'm studying CS in college.",
    author: "Maya K.",
    role: "High school student",
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef, { stagger: 0.12 });

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-40 relative overflow-hidden"
    >
      {/* Blue Steel gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-gray-600 to-blue-800" />
      
      <div className="container-premium relative z-10">
        <div className="text-center mb-16 md:mb-20 reveal-item">
          <p className="text-white/60 font-medium text-sm tracking-wide uppercase mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5">
            What students say
          </h2>
        </div>

        {/* Testimonials - staggered layout */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className={`reveal-item ${i === 1 ? "md:-translate-y-4" : ""}`}
            >
              <div className="h-full p-8 rounded-2xl bg-white/5 border border-white/10">
                <svg className="w-8 h-8 text-white/20 mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-white/85 text-lg mb-8 leading-relaxed">
                  {testimonial.quote}
                </p>
                <div>
                  <p className="text-white font-semibold">{testimonial.author}</p>
                  <p className="text-white/40 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ PRICING ============ */
export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef, { stagger: 0.1 });

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 bg-white">
      <div className="container-premium">
        <div className="max-w-2xl mx-auto text-center mb-16 md:mb-20 reveal-item">
          <p className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            Simple pricing
          </h2>
          <p className="text-lg text-gray-600">
            No contracts, no hidden fees. Pay for what you need.
          </p>
        </div>

        {/* Two pricing cards - asymmetric sizing */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Single Session */}
          <div className="reveal-item">
            <div className="h-full p-8 md:p-10 rounded-2xl bg-gray-50 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Single Session</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">$50</span>
                <span className="text-gray-500">per session</span>
              </div>
              <p className="text-gray-600 mb-8">
                Typically around 1 hour. Session length may vary based on the material and your pace.
              </p>
              <ul className="space-y-3 mb-8">
                {["Personalized curriculum", "Real project work", "Flexible scheduling", "All skill levels"].map((item, j) => (
                  <li key={j} className="flex items-center gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://looplab.adilh.co/"
                className="block w-full py-3.5 px-6 text-center rounded-full font-semibold bg-gray-900 text-white transition-transform duration-200 hover:scale-[1.02]"
              >
                Get started
              </a>
            </div>
          </div>

          {/* Monthly Package */}
          <div className="reveal-item">
            <div className="h-full p-8 md:p-10 rounded-2xl bg-gradient-to-br from-gray-800 to-blue-900 text-white">
              <h3 className="text-xl font-bold mb-2">Monthly Package</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$180</span>
                <span className="text-white/60">for 4 sessions</span>
              </div>
              <p className="text-white/70 mb-8">
                Best for consistent learning. Sessions must be used within one calendar month.
              </p>
              <ul className="space-y-3 mb-8">
                {["Everything in single session", "Save $20 total", "Weekly momentum", "Priority scheduling"].map((item, j) => (
                  <li key={j} className="flex items-center gap-3 text-white/85">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://looplab.adilh.co/"
                className="block w-full py-3.5 px-6 text-center rounded-full font-semibold bg-white text-gray-900 transition-transform duration-200 hover:scale-[1.02]"
              >
                Get started
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="reveal-item text-center text-sm text-gray-500 mt-10 max-w-xl mx-auto">
          Sessions are typically 1 hour but may vary. Monthly package sessions expire at the end of the calendar month. 
          Reschedule with 24 hours notice.
        </p>
      </div>
    </section>
  );
}

/* ============ FAQ ============ */
const faqs = [
  {
    question: "Who is this for?",
    answer: "Students of all ages and levels—kids learning Scratch, high schoolers preparing for AP CS, college students tackling coursework, or adults learning to code for the first time. I tailor every session to your goals and pace.",
  },
  {
    question: "Do I need any prior experience?",
    answer: "Not at all. Complete beginners are welcome, as are experienced programmers looking to level up. We'll start wherever you are and build from there.",
  },
  {
    question: "What languages and topics do you teach?",
    answer: "Python, JavaScript, Java, HTML/CSS, Scratch, and more. I also cover data structures, algorithms, web development, game development, and AP Computer Science prep. We'll pick based on your goals.",
  },
  {
    question: "How do sessions work?",
    answer: "Sessions happen over video call (Zoom or Google Meet). We code together in real-time—I can see your screen, help you debug, and guide you through exercises. Every session is hands-on.",
  },
  {
    question: "Can I reschedule?",
    answer: "Yes, just give 24 hours notice. Life happens—flexibility is built in.",
  },
];

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useScrollReveal(sectionRef, { stagger: 0.06 });

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 bg-gray-50">
      <div className="container-premium">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Header */}
          <div className="reveal-item lg:sticky lg:top-32 lg:self-start">
            <p className="text-gray-500 font-medium text-sm tracking-wide uppercase mb-3">
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5">
              Common questions
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Still have questions? Feel free to reach out directly.
            </p>
            <a
              href="https://looplab.adilh.co/"
              className="inline-flex items-center text-blue-600 font-medium hover:underline"
            >
              Get in touch
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Right: Questions */}
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="reveal-item rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <span 
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      openIndex === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openIndex === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <p className="px-5 pb-5 text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */
export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 lg:py-40 relative overflow-hidden"
    >
      {/* Blue Steel gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-500 via-gray-700 to-blue-900" />
      
      <div className="container-premium relative z-10">
        <div className="max-w-2xl reveal-item">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Ready to start learning?
          </h2>
          <p className="text-xl text-white/70 mb-10">
            Send a message to discuss your goals and schedule your first session.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://looplab.adilh.co/"
              className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold rounded-full bg-white text-gray-900 transition-transform duration-200 hover:scale-[1.03]"
            >
              Get in touch
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
export function Footer() {
  return (
    <footer className="bg-gray-900 py-12 px-4">
      <div className="container-premium">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white font-bold text-xl">
            LoopLab<span className="text-blue-400"> Classes</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 LoopLab Classes</p>
        </div>
      </div>
    </footer>
  );
}
