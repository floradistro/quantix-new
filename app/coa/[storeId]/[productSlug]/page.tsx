'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Download, Share2, Calendar, Building2, Check,
  Maximize2, FlaskConical, Leaf, Droplets, Shield,
  BadgeCheck, Hash, Beaker, X, TestTube, Dna, ChevronRight
} from 'lucide-react'
import Logo from '@/app/components/Logo'
import PDFViewer from '@/app/components/PDFViewer'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip
} from 'recharts'

interface CannabinoidDetail {
  name: string
  percent: number
  mg_per_g: number
  lod: number
  loq: number
  result: string
}

interface COAData {
  id: string
  document_name: string
  file_url: string
  created_at: string
  store_id: string
  thumbnail_url?: string
  metadata?: {
    sample_id?: string
    sample_name?: string
    sample_type?: string
    sample_size?: string
    strain?: string
    batch_number?: string
    test_date?: string
    issue_date?: string
    date_collected?: string
    date_received?: string
    date_tested?: string
    date_reported?: string
    lab_name?: string
    lab_contact?: string
    lab_website?: string
    lab_director?: string
    director_title?: string
    logo_url?: string
    signature_url?: string
    test_type?: string
    status?: string
    client_name?: string
    client_address?: string
    client_license?: string
    product_name?: string
    thc_total?: number
    cbd_total?: number
    terpenes_total?: number
    cannabinoids_total?: number
    moisture?: number
    cannabinoids?: Record<string, number>
    cannabinoids_detailed?: CannabinoidDetail[]
    terpenes?: Record<string, number>
    terpenes_detailed?: any[]
    test_panels?: Record<string, boolean>
    safety_tests?: Record<string, string>
    thca?: number
    d9_thc?: number
    d8_thc?: number
    thcp?: number
    thcv?: number
    cbd?: number
    cbda?: number
    cbg?: number
    cbga?: number
    cbn?: number
    cbc?: number
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

const COLORS = ['#34d399', '#60a5fa', '#a78bfa', '#fb923c', '#f472b6', '#22d3ee', '#a3e635', '#fb7185']

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

  const getCannabinoidData = () => {
    if (!coa?.metadata) return []
    if (coa.metadata.cannabinoids_detailed?.length) {
      return coa.metadata.cannabinoids_detailed
        .filter(c => c.percent > 0)
        .sort((a, b) => b.percent - a.percent)
    }
    if (coa.metadata.cannabinoids && Object.keys(coa.metadata.cannabinoids).length > 0) {
      return Object.entries(coa.metadata.cannabinoids)
        .filter(([_, value]) => value > 0)
        .map(([name, percent]) => ({ name, percent, mg_per_g: percent * 10, lod: 0, loq: 0, result: String(percent) }))
        .sort((a, b) => b.percent - a.percent)
    }
    return []
  }

  const getTerpeneData = () => {
    if (!coa?.metadata) return []
    if (coa.metadata.terpenes_detailed?.length) {
      return coa.metadata.terpenes_detailed
        .filter((t: any) => t.percent > 0)
        .sort((a: any, b: any) => b.percent - a.percent)
    }
    if (coa.metadata.terpenes && Object.keys(coa.metadata.terpenes).length > 0) {
      return Object.entries(coa.metadata.terpenes)
        .filter(([_, value]) => value > 0)
        .map(([name, percent]) => ({ name, percent }))
        .sort((a, b) => b.percent - a.percent)
    }
    return []
  }

  const cannabinoidData = getCannabinoidData()
  const terpeneData = getTerpeneData()

  const pieData = cannabinoidData.slice(0, 5).map((c, i) => ({
    name: c.name,
    value: c.percent,
    color: COLORS[i % COLORS.length]
  }))

  const barData = cannabinoidData.map(c => ({
    name: c.name,
    percent: c.percent
  }))

  const testPanels = coa?.metadata?.test_panels || {}
  const activeTests = Object.entries(testPanels).filter(([_, active]) => active).map(([name]) => name)

  // Get top 3 cannabinoids for hero display - all from real parsed data
  const topCannabinoids = cannabinoidData.slice(0, 3)

  const hasData = cannabinoidData.length > 0 || terpeneData.length > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-[#0071e3] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !coa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
            <FileText className="w-10 h-10 text-white/20" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Certificate Not Found</h1>
            <p className="text-white/50 text-base">The certificate you're looking for doesn't exist or may have been moved.</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#0071e3] font-medium text-base hover:underline">
            Return Home <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const productName = coa.metadata?.sample_name || coa.metadata?.product_name || coa.products?.name || coa.document_name

  return (
    <main className="min-h-screen bg-background">
      {/* Header - Apple style sticky nav */}
      <header className="border-b border-white/10 bg-surface/80 backdrop-blur-2xl backdrop-saturate-150 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Logo size="sm" showText={false} href="/" />
              <div className="min-w-0">
                <h1 className="text-[15px] sm:text-base font-semibold text-white truncate leading-tight">{productName}</h1>
                <p className="text-[13px] text-white/50 truncate leading-tight">{coa.stores?.store_name || coa.metadata?.client_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.12] active:bg-white/[0.16] rounded-full text-white transition-all duration-200"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => coa.file_url && window.open(coa.file_url, '_blank')}
                className="min-h-[44px] flex items-center gap-2.5 px-5 bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#006edb] rounded-full text-white text-[15px] font-medium transition-all duration-200"
              >
                <Download className="w-[18px] h-[18px]" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Desktop: Hero section with key stats */}
        {hasData && topCannabinoids.length > 0 && (
          <div className="hidden lg:block mb-8">
            <div className="glass-effect rounded-2xl p-8">
              <div className="flex items-center justify-between">
                {/* Left: Product info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {coa.metadata?.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        coa.metadata.status.toLowerCase() === 'pass'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}>
                        {coa.metadata.status}
                      </span>
                    )}
                    <span className="text-sm text-white/40">{coa.metadata?.sample_type || coa.metadata?.test_type}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-1">{productName}</h2>
                  <p className="text-white/50">{coa.metadata?.lab_name} · {formatDate(coa.metadata?.date_reported || coa.metadata?.issue_date || coa.created_at)}</p>
                </div>

                {/* Right: Key cannabinoid stats */}
                <div className="flex items-center gap-10">
                  {topCannabinoids.slice(0, 3).map((c, i) => (
                    <div key={c.name} className={`text-center ${i === 0 ? 'scale-110' : ''}`}>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{c.name}</p>
                      <p className={`font-semibold text-white tabular-nums ${i === 0 ? 'text-5xl' : 'text-3xl text-white/80'}`}>
                        {c.percent.toFixed(1)}
                        <span className={`${i === 0 ? 'text-2xl' : 'text-lg'} text-white/40`}>%</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

          {/* Left sidebar - Details & Charts (desktop) */}
          <div className={`${hasData ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-3 sm:space-y-4 order-2 lg:order-1`}>

            {/* Mobile only: Potency hero */}
            {hasData && topCannabinoids.length > 0 && (
              <section className="lg:hidden glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Potency</h2>
                  {coa.metadata?.status && (
                    <span className={`px-3 py-1.5 rounded-full text-[13px] font-medium ${
                      coa.metadata.status.toLowerCase() === 'pass'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {coa.metadata.status}
                    </span>
                  )}
                </div>
                <div className="text-center mb-4">
                  <p className="text-sm text-white/50 mb-1">{topCannabinoids[0].name}</p>
                  <p className="text-5xl font-semibold text-white tabular-nums">
                    {topCannabinoids[0].percent.toFixed(1)}
                    <span className="text-2xl text-white/60">%</span>
                  </p>
                </div>
                {topCannabinoids.length > 1 && (
                  <div className={`grid ${topCannabinoids.length > 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 pt-4 border-t border-white/[0.08]`}>
                    {topCannabinoids.slice(1).map((c) => (
                      <div key={c.name} className="text-center">
                        <p className="text-xs text-white/40 mb-0.5">{c.name}</p>
                        <p className="text-2xl font-medium text-white/90 tabular-nums">
                          {c.percent.toFixed(1)}
                          <span className="text-base text-white/40">%</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Certificate Details */}
            <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
              <div className="space-y-0">
                <DetailRow label="Product" value={productName} />
                <DetailRow label="Type" value={coa.metadata?.sample_type || coa.metadata?.test_type} />
                {coa.metadata?.strain && <DetailRow label="Strain" value={coa.metadata.strain} />}
                <DetailRow label="Client" value={coa.metadata?.client_name || coa.stores?.store_name} />
                <DetailRow label="Tested" value={formatDate(coa.metadata?.date_tested || coa.metadata?.test_date)} />
                <DetailRow label="Reported" value={formatDate(coa.metadata?.date_reported || coa.metadata?.issue_date || coa.created_at)} />
                {coa.metadata?.sample_id && <DetailRow label="Sample ID" value={coa.metadata.sample_id} />}
                {coa.metadata?.batch_number && <DetailRow label="Batch" value={coa.metadata.batch_number} />}
                {coa.metadata?.client_license && <DetailRow label="License" value={coa.metadata.client_license} />}
                {coa.metadata?.lab_name && <DetailRow label="Laboratory" value={coa.metadata.lab_name} />}
              </div>
            </section>

            {/* Cannabinoid Breakdown - Compact for sidebar */}
            {hasData && cannabinoidData.length > 0 && (
              <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Cannabinoids</h2>

                {/* Pie Chart - smaller on desktop sidebar */}
                {pieData.length > 0 && (
                  <div className="h-44 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius="40%"
                          outerRadius="70%"
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={800}
                          stroke="transparent"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(0,0,0,0.85)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                          }}
                          formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Compact data list */}
                <div className="space-y-2">
                  {cannabinoidData.map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[cannabinoidData.indexOf(c) % COLORS.length] }}
                        />
                        <span className="text-sm text-white/80">{c.name}</span>
                      </div>
                      <span className="text-sm text-white font-medium tabular-nums">{c.percent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Terpenes */}
            {hasData && terpeneData.length > 0 && (
              <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Terpenes</h2>
                <div className="space-y-3">
                  {terpeneData.slice(0, 6).map((t: any) => (
                    <div key={t.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-white/80">{t.name}</span>
                        <span className="text-sm text-white font-medium tabular-nums">{t.percent.toFixed(2)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full"
                          style={{ width: `${Math.min((t.percent / (terpeneData[0]?.percent || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Test Panels */}
            {hasData && activeTests.length > 0 && (
              <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Testing</h2>
                <div className="flex flex-wrap gap-2">
                  {activeTests.map(test => (
                    <div
                      key={test}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-emerald-400 font-medium">
                        {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: PDF Document (main focus on desktop) */}
          <div className={`${hasData ? 'lg:col-span-8' : 'lg:col-span-12'} order-1 lg:order-2`}>

            {/* Mobile: PDF pages rendered seamlessly */}
            <div className="sm:hidden">
              <PDFViewer url={coa.file_url} />
            </div>

            {/* Desktop: Large PDF viewer */}
            <section className="hidden sm:block glass-effect rounded-2xl overflow-hidden sticky top-20">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h2 className="text-base font-medium text-white">Certificate of Analysis</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => coa.file_url && window.open(coa.file_url, '_blank')}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/[0.08] rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/[0.08] rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <Maximize2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
              <div className="relative w-full bg-neutral-100" style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}>
                <iframe
                  src={`/api/pdf-proxy?url=${encodeURIComponent(coa.file_url)}#toolbar=0&navpanes=0&scrollbar=1&view=FitW`}
                  className="absolute inset-0 w-full h-full"
                  title="Certificate PDF"
                  style={{ border: 'none' }}
                  allow="fullscreen"
                />
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 sm:mt-12 text-center px-4">
          <p className="text-xs text-white/30">
            Certificate issued by {coa.metadata?.lab_name || 'accredited laboratory'} · Verified by Quantix Analytics
          </p>
        </footer>
      </div>

      {/* Fullscreen PDF Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/25 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <iframe
            src={`/api/pdf-proxy?url=${encodeURIComponent(coa.file_url)}`}
            className="w-full h-full"
            title="Certificate PDF"
            style={{ border: 'none' }}
          />
        </div>
      )}
    </main>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-0">
      <span className="text-[13px] sm:text-sm text-white/50">{label}</span>
      <span className="text-[13px] sm:text-sm text-white font-medium text-right ml-4 truncate max-w-[60%]">{value}</span>
    </div>
  )
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}
