// app/page.tsx
"use client";

import Nav from "./_components/home/Nav";
import Hero from "./_components/home/Hero";
import {
  HowItWorks,
  WhatYouBuild,
  WhatITeach,
  Testimonials,
  Pricing,
  FAQ,
  FinalCTA,
  Footer,
} from "./_components/home/Sections";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-white">
      {/* Navigation */}
      <Nav />

      {/* Hero */}
      <Hero />

      {/* Content sections */}
      <HowItWorks />
      <WhatYouBuild />
      <WhatITeach />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
