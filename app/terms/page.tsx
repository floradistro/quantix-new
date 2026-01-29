import Navigation from '../components/Navigation'
import Footer from '../components/Footer'

export default function TermsPage() {
  return (
    <main className="min-h-screen antialiased">
      <Navigation />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">Terms of Service</h1>
          <p className="text-white/60 mb-12">Last updated: January 2026</p>

          <div className="space-y-8 text-white/70">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Quantix Analytics services, you agree to be bound by these Terms
                of Service and all applicable laws and regulations. If you do not agree with any of
                these terms, you are prohibited from using our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Services</h2>
              <p className="mb-4">
                Quantix Analytics provides laboratory testing services for cannabis and peptides,
                including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Cannabinoid potency analysis</li>
                <li>Terpene profiling</li>
                <li>Contaminant screening</li>
                <li>Peptide purity verification</li>
                <li>Certificate of Analysis (COA) generation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Sample Submission</h2>
              <p className="mb-4">
                When submitting samples for testing:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You warrant that you have legal authority to submit the samples</li>
                <li>Samples must be properly labeled and packaged</li>
                <li>You are responsible for compliance with all applicable regulations</li>
                <li>We reserve the right to refuse any sample</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Testing Results</h2>
              <p className="mb-4">
                Our testing results:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Are specific to the submitted sample only</li>
                <li>Do not constitute product approval or endorsement</li>
                <li>Are provided as-is without warranty</li>
                <li>Should not be the sole basis for compliance decisions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Payment Terms</h2>
              <p>
                Payment is due upon sample submission unless other arrangements have been made.
                We accept credit cards, ACH transfers, and approved net-30 terms for qualified
                commercial clients.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Confidentiality</h2>
              <p>
                We maintain strict confidentiality of all client information and test results.
                Results will only be shared with authorized personnel and as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
              <p>
                Quantix Analytics shall not be liable for any indirect, incidental, special, or
                consequential damages arising from the use of our services. Our total liability
                shall not exceed the amount paid for the specific test in question.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Dispute Resolution</h2>
              <p>
                Any disputes arising from these terms shall be resolved through binding arbitration
                in accordance with the rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of our services
                after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:support@quantixanalytics.com" className="text-quantix-accent hover:underline">
                  support@quantixanalytics.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
