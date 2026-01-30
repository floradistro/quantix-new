'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Download, Share2, Calendar, Building2, Check,
  Maximize2, FlaskConical, Leaf, Droplets, Shield,
  BadgeCheck, Hash, Beaker, X, TestTube, Dna
} from 'lucide-react'
import Logo from '@/app/components/Logo'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend
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
    // Individual cannabinoids
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

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e']

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

  // Parse cannabinoid data
  const getCannabinoidData = () => {
    if (!coa?.metadata) return []

    // Try cannabinoids_detailed first (most complete)
    if (coa.metadata.cannabinoids_detailed?.length) {
      return coa.metadata.cannabinoids_detailed
        .filter(c => c.percent > 0)
        .sort((a, b) => b.percent - a.percent)
    }

    // Try cannabinoids object
    if (coa.metadata.cannabinoids && Object.keys(coa.metadata.cannabinoids).length > 0) {
      return Object.entries(coa.metadata.cannabinoids)
        .filter(([_, value]) => value > 0)
        .map(([name, percent]) => ({ name, percent, mg_per_g: percent * 10, lod: 0, loq: 0, result: String(percent) }))
        .sort((a, b) => b.percent - a.percent)
    }

    return []
  }

  // Parse terpene data
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

  // Prepare chart data
  const pieData = cannabinoidData.slice(0, 6).map((c, i) => ({
    name: c.name,
    value: c.percent,
    color: COLORS[i % COLORS.length]
  }))

  const barData = cannabinoidData.map(c => ({
    name: c.name,
    percent: c.percent
  }))

  // Test panels
  const testPanels = coa?.metadata?.test_panels || {}
  const activeTests = Object.entries(testPanels).filter(([_, active]) => active).map(([name]) => name)

  // Totals
  const thcTotal = coa?.metadata?.thc_total ?? 0
  const cbdTotal = coa?.metadata?.cbd_total ?? 0
  const cannabinoidsTotal = coa?.metadata?.cannabinoids_total ?? 0
  const terpenesTotal = coa?.metadata?.terpenes_total ?? 0

  const hasData = cannabinoidData.length > 0 || terpeneData.length > 0 || thcTotal > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
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

  const productName = coa.metadata?.sample_name || coa.metadata?.product_name || coa.products?.name || coa.document_name

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/10 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" showText={false} href="/" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-white truncate">{productName}</h1>
              <p className="text-xs text-white/50 truncate">{coa.stores?.store_name || coa.metadata?.client_name}</p>
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
        <div className={`grid grid-cols-1 ${hasData ? 'lg:grid-cols-2' : ''} gap-4`}>

          {/* Left Column - Data & Charts */}
          {hasData && (
            <div className="space-y-4">
              {/* Potency Summary */}
              <div className="glass-effect rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical className="w-4 h-4 text-[#0071e3]" />
                  <h2 className="text-sm font-semibold text-white">Potency Analysis</h2>
                  {coa.metadata?.status && (
                    <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                      coa.metadata.status.toLowerCase() === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {coa.metadata.status}
                    </span>
                  )}
                </div>

                {/* Totals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {thcTotal > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Total THC</p>
                      <p className="text-xl font-bold text-emerald-400">{thcTotal.toFixed(2)}%</p>
                    </div>
                  )}
                  {cbdTotal > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Total CBD</p>
                      <p className="text-xl font-bold text-blue-400">{cbdTotal.toFixed(2)}%</p>
                    </div>
                  )}
                  {cannabinoidsTotal > 0 && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Cannabinoids</p>
                      <p className="text-xl font-bold text-purple-400">{cannabinoidsTotal.toFixed(2)}%</p>
                    </div>
                  )}
                  {terpenesTotal > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">Terpenes</p>
                      <p className="text-xl font-bold text-orange-400">{terpenesTotal.toFixed(2)}%</p>
                    </div>
                  )}
                </div>

                {/* Pie Chart */}
                {pieData.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          labelStyle={{ color: 'white' }}
                          formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px' }}
                          formatter={(value) => <span className="text-white/70">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Cannabinoid Breakdown */}
              {cannabinoidData.length > 0 && (
                <div className="glass-effect rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Dna className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">Cannabinoid Breakdown</h2>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: 60, right: 20 }}>
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} width={55} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Potency']}
                        />
                        <Bar dataKey="percent" fill="#10b981" radius={[0, 4, 4, 0]} animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-white/50 font-medium">Compound</th>
                          <th className="text-right py-2 text-white/50 font-medium">%</th>
                          <th className="text-right py-2 text-white/50 font-medium">mg/g</th>
                          <th className="text-right py-2 text-white/50 font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cannabinoidData.map((c, i) => (
                          <tr key={c.name} className="border-b border-white/5">
                            <td className="py-2 text-white">{c.name}</td>
                            <td className="py-2 text-right text-white font-mono">{c.percent.toFixed(2)}</td>
                            <td className="py-2 text-right text-white/60 font-mono">{c.mg_per_g.toFixed(1)}</td>
                            <td className="py-2 text-right text-white/60">{c.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Terpenes */}
              {terpeneData.length > 0 && (
                <div className="glass-effect rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplets className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">Terpene Profile</h2>
                  </div>
                  <div className="space-y-2">
                    {terpeneData.slice(0, 8).map((t: any, i: number) => (
                      <div key={t.name} className="flex items-center gap-3">
                        <span className="text-xs text-white/70 w-24 truncate">{t.name}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((t.percent / (terpeneData[0]?.percent || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-white font-mono w-14 text-right">{t.percent.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Panels */}
              {activeTests.length > 0 && (
                <div className="glass-effect rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">Test Panels</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTests.map(test => (
                      <div key={test} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column - Details & PDF */}
          <div className="space-y-4">
            {/* Certificate Details */}
            <div className="glass-effect rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#0071e3]" />
                <h2 className="text-sm font-semibold text-white">Certificate Details</h2>
              </div>
              <div className="space-y-0 text-sm">
                <InfoRow icon={Leaf} label="Product" value={productName} />
                <InfoRow icon={TestTube} label="Type" value={coa.metadata?.sample_type || coa.metadata?.test_type || '-'} />
                {coa.metadata?.strain && <InfoRow icon={Dna} label="Strain" value={coa.metadata.strain} />}
                <InfoRow icon={Building2} label="Client" value={coa.metadata?.client_name || coa.stores?.store_name || '-'} />
                <InfoRow icon={Calendar} label="Tested" value={formatDate(coa.metadata?.date_tested || coa.metadata?.test_date)} />
                <InfoRow icon={Calendar} label="Reported" value={formatDate(coa.metadata?.date_reported || coa.metadata?.issue_date || coa.created_at)} />
                {coa.metadata?.sample_id && <InfoRow icon={Hash} label="Sample ID" value={coa.metadata.sample_id} />}
                {coa.metadata?.batch_number && <InfoRow icon={Beaker} label="Batch" value={coa.metadata.batch_number} />}
                {coa.metadata?.client_license && <InfoRow icon={BadgeCheck} label="License" value={coa.metadata.client_license} />}
                {coa.metadata?.lab_name && <InfoRow icon={FlaskConical} label="Laboratory" value={coa.metadata.lab_name} />}
                {coa.metadata?.moisture !== undefined && coa.metadata.moisture > 0 && (
                  <InfoRow icon={Droplets} label="Moisture" value={`${coa.metadata.moisture.toFixed(2)}%`} />
                )}
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
              <div className={`bg-gray-100 ${hasData ? 'h-[50vh]' : 'h-[70vh]'}`}>
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <Icon className="w-4 h-4 text-white/40 flex-shrink-0" />
      <span className="text-xs text-white/50 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-white truncate">{value}</span>
    </div>
  )
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}
