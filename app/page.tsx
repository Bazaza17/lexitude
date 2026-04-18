import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Features } from "@/components/site/Features";
import { Workflow } from "@/components/site/Workflow";
import { CTA } from "@/components/site/CTA";
import { Footer } from "@/components/site/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main id="product">
        <Hero />
        <Features />
        <Workflow />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
