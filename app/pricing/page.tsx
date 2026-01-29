import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import Link from 'next/link'
import { Check } from 'lucide-react'

export default function PricingPage() {
  return (
    <main className="min-h-screen antialiased">
      <Navigation />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              Transparent Pricing
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
              Simple, competitive rates for all testing services
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Cannabis Basic */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-quantix-accent/50 transition-all">
              <h3 className="text-2xl font-bold text-white mb-2">Cannabis Basic</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$50</span>
                <span className="text-white/60 ml-2">per sample</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Cannabinoid potency</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Digital COA</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>24-48 hour turnaround</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full bg-white/10 hover:bg-white/20 text-white text-center px-6 py-3 rounded-lg font-medium transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* Cannabis Complete */}
            <div className="bg-white/5 backdrop-blur-sm border-2 border-quantix-accent rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-quantix-accent text-black px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Cannabis Complete</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$120</span>
                <span className="text-white/60 ml-2">per sample</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Full cannabinoid panel</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Terpene profiling</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Heavy metals & pesticides</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Microbial testing</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Priority processing</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full bg-quantix-accent hover:bg-[#0077ed] text-white text-center px-6 py-3 rounded-lg font-medium transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* Peptide Analysis */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-quantix-accent/50 transition-all">
              <h3 className="text-2xl font-bold text-white mb-2">Peptide Analysis</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$75</span>
                <span className="text-white/60 ml-2">per sample</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>HPLC purity verification</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Mass spec analysis</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>Detailed COA report</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-quantix-accent flex-shrink-0 mt-0.5" />
                  <span>48-72 hour turnaround</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full bg-white/10 hover:bg-white/20 text-white text-center px-6 py-3 rounded-lg font-medium transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Volume Discounts */}
          <div className="mt-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Volume Discounts Available</h2>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-quantix-accent mb-2">10+</div>
                <div className="text-white/70">samples</div>
                <div className="text-xl font-semibold text-white mt-2">10% off</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-quantix-accent mb-2">25+</div>
                <div className="text-white/70">samples</div>
                <div className="text-xl font-semibold text-white mt-2">15% off</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-quantix-accent mb-2">50+</div>
                <div className="text-white/70">samples</div>
                <div className="text-xl font-semibold text-white mt-2">20% off</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
