import { CompareSection } from './compare-section'
import { FeaturesSection } from './features-section'
import { FinalCtaSection } from './final-cta-section'
import { HeroSection } from './hero-section'
import { TrustSection } from './trust-section'

/** The marketing page. Navigation and footer come from the (public) layout. */
export function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <CompareSection />
      <TrustSection />
      <FinalCtaSection />
    </>
  )
}
