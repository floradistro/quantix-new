'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Download, Share2, Calendar, Building2, ArrowLeft, Copy, Check, BarChart3, Table } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Logo from '@/app/components/Logo'

interface COAData {
  id: string
  document_name: string
  file_url: string
  created_at: string
  store_id: string
  thumbnail_url?: string
  metadata?: {
    sample_id?: string
    test_type?: string
    status?: string
  }
  stores?: {
    store_name: string
    slug: string
  }
  products?: {
    name?: string
    primary_category?: {
      name: string
      icon: string
    }
  }
}

export default function COAPreviewPage() {
  const params = useParams()
  const coaId = params.id as string
  const [coa, setCoa] = useState<COAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual')

  useEffect(() => {
    loadCOA()
  }, [coaId])

  const loadCOA = async () => {
    try {
      const { data, error } = await supabase
        .from('store_documents')
        .select(`
          id,
          document_name,
          file_url,
          created_at,
          store_id,
          metadata,
          thumbnail_url,
          stores!inner(
            store_name,
            slug
          ),
          products(
            name,
            categories!products_primary_category_id_fkey(
              name,
              icon
            )
          )
        `)
        .eq('id', coaId)
        .eq('is_active', true)
        .single()

      if (error) throw error

      setCoa(data as any)
    } catch (err: any) {
      console.error('Error loading COA:', err)
      setError('Certificate not found')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: coa?.document_name || 'Certificate of Analysis',
          text: `View this Certificate of Analysis from ${coa?.stores?.store_name || 'Quantix Analytics'}`,
          url: shareUrl
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !coa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <FileText className="w-16 h-16 text-white/20 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Certificate Not Found</h1>
          <p className="text-white/60">
            This certificate may have been removed or the link is incorrect.
          </p>
          <Link href="/" className="inline-block bg-[#0071e3] hover:bg-[#0077ed] text-white px-6 py-3 rounded-lg font-medium transition-all duration-200">
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/10 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size="sm" showText={true} />
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>
              <a
                href={coa.file_url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] rounded-lg text-white text-sm font-medium transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[350px_1fr] gap-8">
          {/* Sidebar - Details */}
          <div className="space-y-6">
            {/* Document Info Card */}
            <div className="glass-effect rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-[#0071e3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white mb-1 break-words">
                    {coa.document_name || 'Certificate of Analysis'}
                  </h1>
                  {coa.metadata?.sample_id && (
                    <p className="text-sm text-white/60">
                      Sample ID: {coa.metadata.sample_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">
                    {new Date(coa.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {coa.stores && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-white/40" />
                    <span className="text-white/60">{coa.stores.store_name}</span>
                  </div>
                )}

                {(coa.products as any)?.categories && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-4 h-4 text-white/40">📦</div>
                    <span className="text-white/60">
                      {(coa.products as any).categories.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Share Card */}
            <div className="glass-effect rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Share This Certificate</h2>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 pr-10"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  Anyone with this link can view this certificate
                </p>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="glass-effect rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#0071e3]">
                <div className="w-2 h-2 rounded-full bg-[#0071e3]"></div>
                <span className="text-sm font-medium">Verified Certificate</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                This is an authentic certificate issued by {coa.stores?.store_name || 'Quantix Analytics'}.
                The document is hosted securely and verified.
              </p>
            </div>
          </div>

          {/* PDF Viewer - Full Page Scrollable */}
          <div className="space-y-6">
            {/* PDF Container */}
            <div className="glass-effect rounded-2xl overflow-hidden">
              <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Certificate Document</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const iframe = document.querySelector('iframe') as HTMLIFrameElement
                      if (iframe) iframe.requestFullscreen()
                    }}
                    className="text-xs text-white/60 hover:text-white transition-colors px-2 py-1"
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
              <div className="bg-gray-50">
                <iframe
                  src={`${coa.file_url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-[800px] lg:h-[1000px]"
                  title={coa.document_name}
                  style={{ border: 'none' }}
                />
              </div>
            </div>

            {/* Parsed Data Visualization */}
            {coa.metadata && Object.keys(coa.metadata).length > 0 && (
              <div className="glass-effect rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0071e3]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Test Results</h2>
                      <p className="text-sm text-white/60">Parsed certificate data</p>
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'visual'
                          ? 'bg-[#0071e3] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Visual</span>
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'table'
                          ? 'bg-[#0071e3] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>
                </div>

                {viewMode === 'visual' ? (
                  <div className="space-y-8">
                    {/* Main Results Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(coa.metadata).map(([key, value]) => {
                        if (!value || key === 'raw_text' || key === 'status') return null

                        const displayKey = key
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')

                        // Check if it's a numeric value for visual bar
                        const numericValue = typeof value === 'number' ? value : parseFloat(String(value))
                        const isNumeric = !isNaN(numericValue)
                        const percentage = isNumeric ? Math.min(numericValue, 100) : 0

                        // Determine color based on value ranges (cannabinoid/peptide specific)
                        const getColor = () => {
                          if (!isNumeric) return 'from-gray-500 to-gray-600'
                          if (numericValue >= 90) return 'from-green-500 to-emerald-600'
                          if (numericValue >= 70) return 'from-blue-500 to-cyan-600'
                          if (numericValue >= 50) return 'from-yellow-500 to-orange-600'
                          return 'from-orange-500 to-red-600'
                        }

                        const getRingColor = () => {
                          if (!isNumeric) return 'ring-gray-500/20'
                          if (numericValue >= 90) return 'ring-green-500/20'
                          if (numericValue >= 70) return 'ring-blue-500/20'
                          if (numericValue >= 50) return 'ring-yellow-500/20'
                          return 'ring-orange-500/20'
                        }

                        return (
                          <div
                            key={key}
                            className={`relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300 group overflow-hidden ${getRingColor()} ring-2`}
                          >
                            {/* Background Glow Effect */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#0071e3]/20 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Content */}
                            <div className="relative z-10">
                              <div className="text-xs text-white/50 mb-3 uppercase tracking-wider font-semibold">
                                {displayKey}
                              </div>

                              {isNumeric ? (
                                <>
                                  {/* Circular Progress for Numeric Values */}
                                  <div className="flex items-center gap-6 mb-4">
                                    <div className="relative w-24 h-24">
                                      <svg className="transform -rotate-90 w-24 h-24">
                                        <circle
                                          cx="48"
                                          cy="48"
                                          r="40"
                                          stroke="currentColor"
                                          strokeWidth="8"
                                          fill="none"
                                          className="text-white/10"
                                        />
                                        <circle
                                          cx="48"
                                          cy="48"
                                          r="40"
                                          stroke="url(#gradient)"
                                          strokeWidth="8"
                                          fill="none"
                                          strokeLinecap="round"
                                          strokeDasharray={`${2 * Math.PI * 40}`}
                                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                                          className="transition-all duration-1000 ease-out"
                                        />
                                        <defs>
                                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" className={`${getColor().split(' ')[0].replace('from-', '')}`} stopOpacity="1" />
                                            <stop offset="100%" className={`${getColor().split(' ')[1].replace('to-', '')}`} stopOpacity="1" />
                                          </linearGradient>
                                        </defs>
                                      </svg>
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-white">{numericValue.toFixed(1)}</span>
                                      </div>
                                    </div>

                                    <div className="flex-1">
                                      <div className="text-4xl font-black text-white mb-1">
                                        {numericValue.toFixed(2)}
                                        <span className="text-lg text-white/60 ml-1">%</span>
                                      </div>
                                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quality Badge */}
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      numericValue >= 90 ? 'bg-green-500' :
                                      numericValue >= 70 ? 'bg-blue-500' :
                                      numericValue >= 50 ? 'bg-yellow-500' :
                                      'bg-orange-500'
                                    } shadow-lg`} />
                                    <span className="text-xs font-semibold text-white/70">
                                      {numericValue >= 90 ? 'Excellent' :
                                       numericValue >= 70 ? 'Good' :
                                       numericValue >= 50 ? 'Fair' :
                                       'Low'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-2xl font-bold text-white py-4">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Summary Stats Bar */}
                    {Object.values(coa.metadata).some(v => !isNaN(parseFloat(String(v)))) && (
                      <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Test Summary</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {(() => {
                            const numericValues = Object.entries(coa.metadata)
                              .filter(([k, v]) => k !== 'status' && !isNaN(parseFloat(String(v))))
                              .map(([k, v]) => parseFloat(String(v)))

                            const total = numericValues.length
                            const avg = total > 0 ? numericValues.reduce((a, b) => a + b, 0) / total : 0
                            const max = total > 0 ? Math.max(...numericValues) : 0
                            const min = total > 0 ? Math.min(...numericValues) : 0

                            return (
                              <>
                                <div className="text-center">
                                  <div className="text-3xl font-black text-white mb-1">{total}</div>
                                  <div className="text-xs text-white/60 uppercase tracking-wide">Tests</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-3xl font-black text-white mb-1">{avg.toFixed(1)}%</div>
                                  <div className="text-xs text-white/60 uppercase tracking-wide">Average</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-3xl font-black text-green-400 mb-1">{max.toFixed(1)}%</div>
                                  <div className="text-xs text-white/60 uppercase tracking-wide">Highest</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-3xl font-black text-orange-400 mb-1">{min.toFixed(1)}%</div>
                                  <div className="text-xs text-white/60 uppercase tracking-wide">Lowest</div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-xs font-semibold text-white/60 uppercase tracking-wide py-3 px-4">
                            Property
                          </th>
                          <th className="text-left text-xs font-semibold text-white/60 uppercase tracking-wide py-3 px-4">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(coa.metadata).map(([key, value], index) => {
                          if (!value || key === 'raw_text' || key === 'status') return null

                          const displayKey = key
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')

                          return (
                            <tr
                              key={key}
                              className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                                index % 2 === 0 ? 'bg-white/[0.02]' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-sm font-medium text-white/80">
                                {displayKey}
                              </td>
                              <td className="py-3 px-4 text-sm text-white font-semibold">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {coa.metadata.status && (
                  <div className={`mt-4 p-4 rounded-lg border-2 ${
                    coa.metadata.status === 'pass' || coa.metadata.status === 'passed'
                      ? 'bg-green-500/10 border-green-500/30'
                      : coa.metadata.status === 'fail' || coa.metadata.status === 'failed'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        coa.metadata.status === 'pass' || coa.metadata.status === 'passed'
                          ? 'bg-green-500'
                          : coa.metadata.status === 'fail' || coa.metadata.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`} />
                      <span className={`font-semibold uppercase tracking-wide ${
                        coa.metadata.status === 'pass' || coa.metadata.status === 'passed'
                          ? 'text-green-400'
                          : coa.metadata.status === 'fail' || coa.metadata.status === 'failed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}>
                        Status: {String(coa.metadata.status)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" showText={true} />
            </div>
            <p className="text-sm text-white/50">
              © 2026 Quantix Analytics. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
