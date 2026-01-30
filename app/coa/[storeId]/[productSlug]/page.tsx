'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Download, Share2, Calendar, Building2, Check,
  Maximize2, FlaskConical, Leaf, Droplets, Shield,
  BadgeCheck, Hash, Beaker, X
} from 'lucide-react'
import Logo from '@/app/components/Logo'

interface COAData {
  id: string
  document_name: string
  file_url: string
  created_at: string
  completed_date?: string
  store_id: string
  thumbnail_url?: string
  metadata?: {
    sample_id?: string
    batch_number?: string
    test_date?: string
    issue_date?: string
    lab_name?: string
    test_type?: string
    status?: string
    test_results?: any
    thc_total?: number
    cbd_total?: number
    terpenes_total?: number
    cannabinoids?: Record<string, number>
    terpenes?: Record<string, number>
    safety_tests?: Record<string, string>
  }
  stores?: {
    store_name: string
    slug: string
  }
  products?: {
    name?: string
    slug?: string
  }
}

// Animated number counter
function AnimatedValue({ value, suffix = '%', decimals = 2 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 1200
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [value])

  return <>{display.toFixed(decimals)}{suffix}</>
}

// Compact potency card with large value
function PotencyCard({ label, value, color, delay = 0 }: {
  label: string; value: number; color: string; delay?: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const colors: Record<string, string> = {
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/40 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/40 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/40 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/40 text-orange-400',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/40 text-cyan-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/40 text-pink-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3 text-center transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color].split(' ').pop()}`}>
        {visible ? <AnimatedValue value={value} /> : '0.00%'}
      </p>
    </div>
  )
}

// Horizontal bar with inline label
function CompoundBar({ name, value, maxValue, color, delay = 0 }: {
  name: string; value: number; maxValue: number; color: string; delay?: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const pct = Math.min((value / maxValue) * 100, 100)
  const gradients: Record<string, string> = {
    green: 'from-emerald-500 to-green-400',
    purple: 'from-purple-500 to-violet-400',
    blue: 'from-blue-500 to-cyan-400',
    orange: 'from-orange-500 to-amber-400',
  }

  return (
    <div className={`transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/70 truncate">{name}</span>
        <span className="text-white font-mono ml-2">{value.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradients[color] || gradients.green} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: visible ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  )
}

// Info row component
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <Icon className="w-4 h-4 text-white/40 flex-shrink-0" />
      <span className="text-xs text-white/50 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-white truncate">{value}</span>
    </div>
  )
}

// Safety badge
function SafetyBadge({ name, status }: { name: string; status: string }) {
  const pass = ['pass', 'passed', 'nd', 'not detected'].includes(status.toLowerCase())
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${pass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
      {pass ? <BadgeCheck className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      <span className="truncate">{name}</span>
    </div>
  )
}

export default function COAPreviewPage() {
  const params = useParams()
  const storeId = params.storeId as string
  const productSlug = params.productSlug as string

  const [coa, setCoa] = useState<COAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    loadCOA()
  }, [storeId, productSlug])

  const loadCOA = async () => {
    try {
      const response = await fetch(`/api/coa/${storeId}/${productSlug}`, { cache: 'no-store' })
      if (!response.ok) {
        setError('Certificate not found')
        return
      }
      const result = await response.json()
      if (result.data) {
        setCoa(result.data)
        // Track QR scan
        trackScan(result.data.id, result.data.metadata?.sample_id)
      }
      else setError('Certificate not found')
    } catch {
      setError('Certificate not found')
    } finally {
      setLoading(false)
    }
  }

  const trackScan = async (documentId: string, sampleId: string | undefined) => {
    if (!sampleId) return
    try {
      await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code: sampleId,
          store_id: storeId,
          document_id: documentId,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      })
    } catch (err) {
      // Silent fail - don't disrupt user experience
      console.debug('Scan tracking failed:', err)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: coa?.document_name, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Parse data
  const testResults = coa?.metadata?.test_results || {}
  const cannabinoids = coa?.metadata?.cannabinoids || {}
  const terpenes = coa?.metadata?.terpenes || {}
  const safetyTests = coa?.metadata?.safety_tests || {}

  // Totals from metadata
  const thcTotal = coa?.metadata?.thc_total ?? 0
  const cbdTotal = coa?.metadata?.cbd_total ?? 0
  const terpenesTotal = coa?.metadata?.terpenes_total ?? 0

  // Build cannabinoid array from structured cannabinoids first
  let cannabinoidsArray = Object.entries(cannabinoids)
    .map(([name, value]) => ({ name, value: value as number }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  // If no structured cannabinoids, try test_results
  if (cannabinoidsArray.length === 0 && Object.keys(testResults).length > 0) {
    cannabinoidsArray = Object.entries(testResults)
      .map(([key, val]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: typeof val === 'number' ? val : parseFloat(val as string) || 0
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  // If still no cannabinoids but we have totals, create display cards from totals
  if (cannabinoidsArray.length === 0 && (thcTotal > 0 || cbdTotal > 0)) {
    if (thcTotal > 0) cannabinoidsArray.push({ name: 'Total THC', value: thcTotal })
    if (cbdTotal > 0) cannabinoidsArray.push({ name: 'Total CBD', value: cbdTotal })
    if (terpenesTotal > 0) cannabinoidsArray.push({ name: 'Terpenes', value: terpenesTotal })
  }

  const terpenesArray = Object.entries(terpenes)
    .map(([name, value]) => ({ name, value: value as number }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  const safetyArray = Object.entries(safetyTests)
    .map(([name, status]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), status: status as string }))

  // Check if we have a status to show as safety
  const hasStatus = coa?.metadata?.status && !safetyArray.length
  if (hasStatus && coa?.metadata?.status) {
    safetyArray.push({ name: 'Overall Status', status: coa.metadata.status })
  }

  // Get top cannabinoids for hero display
  const topCannabinoids = cannabinoidsArray.slice(0, 4)
  const remainingCannabinoids = cannabinoidsArray.slice(4)
  const maxCannabinoid = cannabinoidsArray[0]?.value || 30
  const maxTerpene = terpenesArray[0]?.value || 5

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !coa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <FileText className="w-12 h-12 text-white/20 mx-auto" />
          <h1 className="text-xl font-bold text-white">Certificate Not Found</h1>
          <Link href="/" className="text-[#0071e3] text-sm hover:underline">Return Home</Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/10 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" showText={false} href="/" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-white truncate">{coa.products?.name || coa.document_name}</h1>
              <p className="text-xs text-white/50 truncate">{coa.stores?.store_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button onClick={() => coa.file_url && window.open(coa.file_url, '_blank')} className="flex items-center gap-2 px-3 py-2 bg-[#0071e3] hover:bg-[#0077ed] rounded-lg text-white text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Determine if we have test data for left column */}
        {(() => {
          const hasTestData = topCannabinoids.length > 0 || terpenesArray.length > 0 || safetyArray.length > 0 || thcTotal > 0 || cbdTotal > 0

          return (
            <div className={`grid grid-cols-1 ${hasTestData ? 'lg:grid-cols-2' : ''} gap-4`}>
              {/* Left Column - Only show if we have test data */}
              {hasTestData && (
                <div className="space-y-4">
                  {/* Potency Hero - Top Cannabinoids */}
                  {topCannabinoids.length > 0 && (
                    <div className="glass-effect rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FlaskConical className="w-4 h-4 text-[#0071e3]" />
                        <h2 className="text-sm font-semibold text-white">Potency Analysis</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {topCannabinoids.map((c, i) => (
                          <PotencyCard
                            key={c.name}
                            label={c.name}
                            value={c.value}
                            color={i === 0 ? 'green' : i === 1 ? 'blue' : i === 2 ? 'purple' : 'orange'}
                            delay={i * 80}
                          />
                        ))}
                      </div>
                      {/* Totals row */}
                      {(thcTotal > 0 || cbdTotal > 0) && (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                          {thcTotal > 0 && (
                            <div className="text-center">
                              <p className="text-[10px] text-white/40 uppercase">Total THC</p>
                              <p className="text-lg font-bold text-emerald-400">{thcTotal.toFixed(2)}%</p>
                            </div>
                          )}
                          {cbdTotal > 0 && (
                            <div className="text-center">
                              <p className="text-[10px] text-white/40 uppercase">Total CBD</p>
                              <p className="text-lg font-bold text-blue-400">{cbdTotal.toFixed(2)}%</p>
                            </div>
                          )}
                          {terpenesTotal > 0 && (
                            <div className="text-center">
                              <p className="text-[10px] text-white/40 uppercase">Terpenes</p>
                              <p className="text-lg font-bold text-purple-400">{terpenesTotal.toFixed(2)}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Cannabinoids */}
                  {remainingCannabinoids.length > 0 && (
                    <div className="glass-effect rounded-xl p-4">
                      <h3 className="text-xs font-medium text-white/60 mb-3">Additional Cannabinoids</h3>
                      <div className="space-y-2.5">
                        {remainingCannabinoids.slice(0, 8).map((c, i) => (
                          <CompoundBar key={c.name} name={c.name} value={c.value} maxValue={maxCannabinoid} color="green" delay={i * 60} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Terpene Profile */}
                  {terpenesArray.length > 0 && (
                    <div className="glass-effect rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Droplets className="w-4 h-4 text-purple-400" />
                        <h2 className="text-sm font-semibold text-white">Terpene Profile</h2>
                      </div>
                      <div className="space-y-2.5">
                        {terpenesArray.slice(0, 8).map((t, i) => (
                          <CompoundBar key={t.name} name={t.name} value={t.value} maxValue={maxTerpene * 1.2} color="purple" delay={i * 60} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Tests */}
                  {safetyArray.length > 0 && (
                    <div className="glass-effect rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-sm font-semibold text-white">Safety Screening</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {safetyArray.map(t => (
                          <SafetyBadge key={t.name} name={t.name} status={t.status} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Right Column (or only column if no test data) */}
              <div className="space-y-4">
                {/* Certificate Details */}
                <div className="glass-effect rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#0071e3]" />
                    <h2 className="text-sm font-semibold text-white">Certificate Details</h2>
                  </div>
                  <div className="space-y-0">
                    <InfoRow icon={Leaf} label="Product" value={coa.products?.name || coa.document_name} />
                    <InfoRow icon={Building2} label="Retailer" value={coa.stores?.store_name || 'Unknown'} />
                    <InfoRow icon={Calendar} label="Issued" value={new Date(coa.metadata?.issue_date || coa.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                    {coa.metadata?.sample_id && <InfoRow icon={Hash} label="Sample ID" value={coa.metadata.sample_id} />}
                    {coa.metadata?.batch_number && <InfoRow icon={Beaker} label="Batch" value={coa.metadata.batch_number} />}
                    {coa.metadata?.lab_name && <InfoRow icon={FlaskConical} label="Laboratory" value={coa.metadata.lab_name} />}
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="glass-effect rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                    <span className="text-sm font-medium text-white">Certificate Document</span>
                    <button onClick={() => setIsFullscreen(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`bg-gray-100 ${hasTestData ? 'h-[60vh]' : 'h-[75vh]'}`}>
                    <iframe
                      src={`/api/pdf-proxy?url=${encodeURIComponent(coa.file_url)}`}
                      className="w-full h-full"
                      title="Certificate PDF"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-8">
          Certificate issued by {coa.metadata?.lab_name || 'accredited laboratory'} · Verified by Quantix Analytics
        </p>
      </div>

      {/* Fullscreen PDF Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <iframe
            src={`/api/pdf-proxy?url=${encodeURIComponent(coa.file_url)}`}
            className="w-full h-full max-w-5xl rounded-xl"
            title="Certificate PDF"
            style={{ border: 'none' }}
          />
        </div>
      )}
    </main>
  )
}
