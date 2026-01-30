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

      <div className="max-w-6xl mx-auto px-0 sm:px-6 py-4 sm:py-10">
        <div className={`grid grid-cols-1 ${hasData ? 'lg:grid-cols-2' : ''} gap-3 sm:gap-6`}>

          {/* Left Column - Data & Charts */}
          {hasData && (
            <div className="space-y-3 sm:space-y-6">
              {/* Potency Summary Card - Hero Section */}
              <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Potency</h2>
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

                {/* Hero Cannabinoid Stats - Show top compounds dynamically */}
                {topCannabinoids.length > 0 && (
                  <div className="mb-6">
                    {/* Primary cannabinoid - Large display */}
                    <div className="text-center mb-6">
                      <p className="text-sm text-white/50 mb-1">{topCannabinoids[0].name}</p>
                      <p className="text-5xl sm:text-6xl font-semibold text-white tracking-tight tabular-nums">
                        {topCannabinoids[0].percent.toFixed(1)}
                        <span className="text-2xl sm:text-3xl text-white/60">%</span>
                      </p>
                    </div>

                    {/* Secondary cannabinoids */}
                    {topCannabinoids.length > 1 && (
                      <div className={`grid ${topCannabinoids.length > 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 pt-5 border-t border-white/[0.08]`}>
                        {topCannabinoids.slice(1).map((c) => (
                          <div key={c.name} className="text-center">
                            <p className="text-xs text-white/40 mb-0.5">{c.name}</p>
                            <p className="text-2xl sm:text-3xl font-medium text-white/90 tabular-nums">
                              {c.percent.toFixed(1)}
                              <span className="text-base text-white/40">%</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Summary row - computed from actual data */}
                {(cannabinoidData.length > 0 || terpeneData.length > 0) && (
                  <div className="flex items-center justify-around py-4 border-t border-white/[0.08]">
                    {cannabinoidData.length > 0 && (
                      <div className="text-center">
                        <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wide">Cannabinoids</p>
                        <p className="text-lg sm:text-xl font-medium text-white/80 tabular-nums">
                          {cannabinoidData.reduce((sum, c) => sum + c.percent, 0).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {terpeneData.length > 0 && (
                      <div className="text-center">
                        <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wide">Terpenes</p>
                        <p className="text-lg sm:text-xl font-medium text-white/80 tabular-nums">
                          {terpeneData.reduce((sum: number, t: any) => sum + t.percent, 0).toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pie Chart */}
                {pieData.length > 0 && (
                  <div className="h-52 sm:h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius="45%"
                          outerRadius="75%"
                          paddingAngle={3}
                          dataKey="value"
                          animationBegin={0}
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
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                          itemStyle={{ color: 'white', fontSize: '13px' }}
                          formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Legend below chart */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 -mt-4">
                      {pieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[11px] sm:text-xs text-white/60">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Cannabinoid Breakdown */}
              {cannabinoidData.length > 0 && (
                <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-5">Cannabinoids</h2>

                  <div className="h-52 sm:h-64 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                        <XAxis
                          type="number"
                          domain={[0, 'auto']}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                          width={70}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(0,0,0,0.85)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                          formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar
                          dataKey="percent"
                          fill="url(#barGradient)"
                          radius={[0, 6, 6, 0]}
                          animationDuration={1000}
                        />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Data table */}
                  <div className="mt-6 -mx-1 overflow-x-auto">
                    <table className="w-full min-w-[320px]">
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className="text-left py-3 px-2 text-[11px] sm:text-xs text-white/40 font-medium uppercase tracking-wider">Compound</th>
                          <th className="text-right py-3 px-2 text-[11px] sm:text-xs text-white/40 font-medium uppercase tracking-wider">Percent</th>
                          <th className="text-right py-3 px-2 text-[11px] sm:text-xs text-white/40 font-medium uppercase tracking-wider">mg/g</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cannabinoidData.map((c) => (
                          <tr key={c.name} className="border-b border-white/[0.04] last:border-0">
                            <td className="py-3.5 px-2 text-[13px] sm:text-sm text-white font-medium">{c.name}</td>
                            <td className="py-3.5 px-2 text-right text-[13px] sm:text-sm text-white tabular-nums">{c.percent.toFixed(2)}%</td>
                            <td className="py-3.5 px-2 text-right text-[13px] sm:text-sm text-white/50 tabular-nums">{c.mg_per_g.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Terpenes */}
              {terpeneData.length > 0 && (
                <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-5">Terpenes</h2>
                  <div className="space-y-4">
                    {terpeneData.slice(0, 8).map((t: any) => (
                      <div key={t.name}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] sm:text-sm text-white/80">{t.name}</span>
                          <span className="text-[13px] sm:text-sm text-white font-medium tabular-nums">{t.percent.toFixed(2)}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((t.percent / (terpeneData[0]?.percent || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Test Panels */}
              {activeTests.length > 0 && (
                <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Testing Panels</h2>
                  <div className="flex flex-wrap gap-2.5">
                    {activeTests.map(test => (
                      <div
                        key={test}
                        className="flex items-center gap-2 min-h-[40px] px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                      >
                        <BadgeCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-[13px] sm:text-sm text-emerald-400 font-medium">
                          {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Right Column - Details & PDF */}
          <div className="space-y-3 sm:space-y-6">
            {/* Certificate Details */}
            <section className="glass-effect rounded-none sm:rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Details</h2>
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
                {coa.metadata?.moisture !== undefined && coa.metadata.moisture > 0 && (
                  <DetailRow label="Moisture" value={`${coa.metadata.moisture.toFixed(2)}%`} />
                )}
              </div>
            </section>

            {/* PDF Viewer - Full width, scrollable for multi-page */}
            <section className="glass-effect rounded-none sm:rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
                <h2 className="text-base sm:text-lg font-semibold text-white">Document</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => coa.file_url && window.open(coa.file_url, '_blank')}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/[0.08] active:bg-white/[0.12] rounded-full text-white/60 hover:text-white transition-colors sm:hidden"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-full text-white/60 hover:text-white transition-colors"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile: Render all PDF pages inline with PDF.js */}
              <div className="sm:hidden">
                <PDFViewer url={coa.file_url} className="max-h-[80vh] overflow-y-auto" />
              </div>

              {/* Desktop: Full PDF embed with native viewer */}
              <div className="hidden sm:block relative w-full bg-neutral-200" style={{ height: '70vh', minHeight: '500px' }}>
                <iframe
                  src={`/api/pdf-proxy?url=${encodeURIComponent(coa.file_url)}#toolbar=1&navpanes=1&scrollbar=1&view=FitW`}
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
