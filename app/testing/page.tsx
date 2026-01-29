import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import Link from 'next/link'
import { FlaskConical, Microscope, FileCheck } from 'lucide-react'

export default function TestingPage() {
  return (
    <main className="min-h-screen antialiased">
      <Navigation />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              Testing Services
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
              Comprehensive testing solutions for cannabis and peptides with fast turnaround times
            </p>
          </div>

          {/* Testing Types */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Cannabis Testing */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <FlaskConical className="w-8 h-8 text-quantix-accent" />
                <h2 className="text-2xl font-bold text-white">Cannabis Testing</h2>
              </div>
              <ul className="space-y-3 text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Cannabinoid potency analysis (THC, CBD, CBN, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Terpene profiling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Heavy metals screening</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Pesticide detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Microbial contamination testing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Moisture content analysis</span>
                </li>
              </ul>
            </div>

            {/* Peptide Testing */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <Microscope className="w-8 h-8 text-quantix-accent" />
                <h2 className="text-2xl font-bold text-white">Peptide Analysis</h2>
              </div>
              <ul className="space-y-3 text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>HPLC purity verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Mass spectrometry identification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Peptide content quantification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Identity confirmation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Impurity detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quantix-accent mt-1">•</span>
                  <span>Stability testing</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Process */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-16">
            <div className="flex items-center gap-4 mb-6">
              <FileCheck className="w-8 h-8 text-quantix-accent" />
              <h2 className="text-2xl font-bold text-white">Our Process</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <div className="text-quantix-accent font-bold text-lg mb-2">1. Submit Sample</div>
                <p className="text-white/70 text-sm">
                  Send your sample to our lab or drop it off at our facility
                </p>
              </div>
              <div>
                <div className="text-quantix-accent font-bold text-lg mb-2">2. Testing</div>
                <p className="text-white/70 text-sm">
                  Our certified technicians perform comprehensive analysis
                </p>
              </div>
              <div>
                <div className="text-quantix-accent font-bold text-lg mb-2">3. Results</div>
                <p className="text-white/70 text-sm">
                  Receive detailed COA within 24-48 hours via email and portal
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/contact"
              className="inline-block bg-[#0071e3] hover:bg-[#0077ed] text-white px-8 py-4 rounded-lg font-medium transition-all duration-200 text-lg"
            >
              Get Started with Testing
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
