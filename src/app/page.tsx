import {
  SmoothScroll,
  Navbar,
  HeroSection,
  MarqueeStrip,
  AgentsSection,
  WorkflowSection,
  FeaturesSection,
  FaqSection,
  CtaSection,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        <HeroSection />
        <MarqueeStrip />
        <AgentsSection />
        <WorkflowSection />
        <FeaturesSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
