import { Closing } from "@/components/closing";
import { Faq } from "@/components/faq";
import { Features } from "@/components/features";
import { GuideProvider } from "@/components/guide-os";
import { Hero } from "@/components/hero";
import { Install } from "@/components/install";
import { SiteNav } from "@/components/site-nav";

export default function Page() {
  return (
    <GuideProvider>
      <SiteNav />
      <main>
        <Hero />
        <Install />
        <Features />
        <Faq />
      </main>
      <Closing />
    </GuideProvider>
  );
}
