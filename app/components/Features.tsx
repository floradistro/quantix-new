'use client'

const features = [
  {
    title: '24-48 Hour Results',
    description: 'Standard turnaround in 1-2 days with rush options available'
  },
  {
    title: 'Transparent Pricing',
    description: 'Cannabis testing from $150, Peptide analysis from $200'
  },
  {
    title: 'State Compliant',
    description: 'Full regulatory compliance for cannabis in all legal states'
  },
  {
    title: 'Digital COAs',
    description: 'Instant access to Certificates of Analysis with QR codes'
  },
  {
    title: 'Advanced Equipment',
    description: 'HPLC, LC-MS/MS, and GC-MS instrumentation'
  },
  {
    title: 'Expert Support',
    description: 'Real people ready to help with questions about results'
  },
]

export default function Features() {
  return (
    <section className="relative py-16 sm:py-24 md:py-32 lg:py-40 px-4 sm:px-6 lg:px-12 bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-quantix-accent rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Section Header */}
        <div className="text-center space-y-4 sm:space-y-6 mb-12 sm:mb-16 md:mb-24">
          <div className="inline-block">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 mb-3 sm:mb-4">
              Why Choose Quantix
            </h2>
            <div className="h-1 w-24 sm:w-32 bg-gradient-to-r from-transparent via-quantix-accent to-transparent mx-auto"></div>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto px-4">
            Fast, accurate, and affordable testing you can trust
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-effect p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl text-center space-y-3 sm:space-y-4 group hover:bg-white/[0.08] transition-all duration-300 depth-1"
            >
              <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-transparent via-quantix-accent to-transparent mx-auto group-hover:scale-x-150 transition-transform duration-300"></div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
