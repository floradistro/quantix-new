'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Download, Share2, Calendar, Building2, ArrowLeft, Copy, Check, BarChart3, Table, Maximize2 } from 'lucide-react'
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
    test_results?: any
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

export default function COAPreviewPage() {
  const params = useParams()
  const storeId = params.storeId as string
  const productSlug = params.productSlug as string

  const [coa, setCoa] = useState<COAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    loadCOA()
  }, [storeId, productSlug])

  const loadCOA = async () => {
    try {
      // Fetch COA via API route (uses service role key to bypass RLS)
      const response = await fetch(`/api/coa/${storeId}/${productSlug}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Certificate not found')
        } else {
          throw new Error('Failed to load certificate')
        }
        return
      }

      const { data } = await response.json()
      setCoa(data)

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
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (coa?.file_url) {
      window.open(coa.file_url, '_blank')
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Parse test results from metadata
  const testResults = coa?.metadata?.test_results || {}
  const testResultsArray = Object.entries(testResults).map(([key, value]) => ({
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: value,
    numericValue: typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0)
  })).filter(item => !isNaN(item.numericValue) && item.numericValue > 0)

  // Calculate summary stats
  const avgValue = testResultsArray.length > 0
    ? testResultsArray.reduce((sum, item) => sum + item.numericValue, 0) / testResultsArray.length
    : 0
  const maxValue = testResultsArray.length > 0
    ? Math.max(...testResultsArray.map(item => item.numericValue))
    : 0
  const minValue = testResultsArray.length > 0
    ? Math.min(...testResultsArray.map(item => item.numericValue))
    : 0

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
        <div className="text-center space-y-6 max-w-md">
          <FileText className="w-16 h-16 text-white/20 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
            <p className="text-white/60">The certificate you're looking for doesn't exist or has been removed.</p>
          </div>
          <Link href="/" className="btn-primary inline-block">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10 bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" showText={false} href="/" />
            <div>
              <h1 className="text-lg font-semibold text-white">Certificate of Analysis</h1>
              <p className="text-xs text-white/60">{coa.stores?.store_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors text-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] rounded-lg text-white transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Metadata */}
          <div className="lg:col-span-1 space-y-6">
            {/* Document Info */}
            <div className="glass-effect rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0071e3]" />
                Document Info
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/50 mb-1">Product Name</p>
                  <p className="text-sm text-white font-medium">{coa.products?.name || coa.document_name}</p>
                </div>

                <div>
                  <p className="text-xs text-white/50 mb-1">Store</p>
                  <p className="text-sm text-white">{coa.stores?.store_name}</p>
                </div>

                <div>
                  <p className="text-xs text-white/50 mb-1">Date Issued</p>
                  <p className="text-sm text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0071e3]" />
                    {new Date(coa.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {coa.metadata?.sample_id && (
                  <div>
                    <p className="text-xs text-white/50 mb-1">Sample ID</p>
                    <p className="text-sm text-white font-mono">{coa.metadata.sample_id}</p>
                  </div>
                )}

                {coa.metadata?.test_type && (
                  <div>
                    <p className="text-xs text-white/50 mb-1">Test Type</p>
                    <p className="text-sm text-white">{coa.metadata.test_type}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Test Results Summary - Only show if we have results */}
            {testResultsArray.length > 0 && (
              <div className="glass-effect rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#0071e3]" />
                    Test Summary
                  </h2>

                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        viewMode === 'visual' ? 'bg-[#0071e3] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        viewMode === 'table' ? 'bg-[#0071e3] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50 mb-1">Tests</p>
                    <p className="text-lg font-bold text-white">{testResultsArray.length}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50 mb-1">Average</p>
                    <p className="text-lg font-bold text-[#0071e3]">{avgValue.toFixed(1)}%</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50 mb-1">Highest</p>
                    <p className="text-lg font-bold text-green-400">{maxValue.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content - PDF Viewer */}
          <div className="lg:col-span-2 space-y-6">
            {/* PDF Viewer */}
            <div className={`glass-effect rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
              <div className="bg-surface/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Certificate Document</h2>
                <button
                  onClick={toggleFullscreen}
                  className="text-white/60 hover:text-white transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <div className={`bg-gray-100 ${isFullscreen ? 'h-[calc(100%-48px)]' : 'h-[600px] lg:h-[800px]'}`}>
                <iframe
                  src={`${coa.file_url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full"
                  title="Certificate of Analysis PDF"
                />
              </div>
            </div>

            {/* Test Results Visualization - Only show if we have results */}
            {testResultsArray.length > 0 && viewMode === 'visual' && (
              <div className="glass-effect rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">Test Results</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {testResultsArray.map((test, index) => {
                    const percentage = test.numericValue
                    const circumference = 2 * Math.PI * 40
                    const strokeDashoffset = circumference - (percentage / 100) * circumference

                    const getColor = () => {
                      if (percentage >= 90) return 'from-green-500 to-emerald-600'
                      if (percentage >= 70) return 'from-blue-500 to-cyan-600'
                      if (percentage >= 50) return 'from-yellow-500 to-orange-600'
                      return 'from-orange-500 to-red-600'
                    }

                    const getQuality = () => {
                      if (percentage >= 90) return { label: 'Excellent', color: 'text-green-400' }
                      if (percentage >= 70) return { label: 'Good', color: 'text-blue-400' }
                      if (percentage >= 50) return { label: 'Fair', color: 'text-yellow-400' }
                      return { label: 'Low', color: 'text-orange-400' }
                    }

                    const quality = getQuality()

                    return (
                      <div key={index} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 group">
                        <div className="flex flex-col items-center space-y-3">
                          {/* Circular Progress */}
                          <div className="relative w-24 h-24">
                            <svg className="transform -rotate-90 w-24 h-24">
                              <defs>
                                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" className={`bg-gradient-to-br ${getColor()}`} style={{ stopColor: percentage >= 90 ? '#10b981' : percentage >= 70 ? '#3b82f6' : percentage >= 50 ? '#eab308' : '#f97316' }} />
                                  <stop offset="100%" className={`bg-gradient-to-br ${getColor()}`} style={{ stopColor: percentage >= 90 ? '#059669' : percentage >= 70 ? '#2563eb' : percentage >= 50 ? '#ca8a04' : '#ea580c' }} />
                                </linearGradient>
                              </defs>
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="6"
                                fill="none"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke={`url(#gradient-${index})`}
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl font-bold text-white group-hover:scale-110 transition-transform">
                                {percentage.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Label */}
                          <div className="text-center">
                            <h3 className="text-sm font-medium text-white mb-1">{test.name}</h3>
                            <span className={`text-xs font-semibold ${quality.color}`}>{quality.label}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Table View */}
            {testResultsArray.length > 0 && viewMode === 'table' && (
              <div className="glass-effect rounded-xl p-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-semibold text-white/60 pb-3">Test</th>
                      <th className="text-right text-xs font-semibold text-white/60 pb-3">Result</th>
                      <th className="text-right text-xs font-semibold text-white/60 pb-3">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResultsArray.map((test, index) => {
                      const quality = test.numericValue >= 90 ? 'Excellent' : test.numericValue >= 70 ? 'Good' : test.numericValue >= 50 ? 'Fair' : 'Low'
                      const qualityColor = test.numericValue >= 90 ? 'text-green-400' : test.numericValue >= 70 ? 'text-blue-400' : test.numericValue >= 50 ? 'text-yellow-400' : 'text-orange-400'

                      return (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 text-sm text-white">{test.name}</td>
                          <td className="py-3 text-sm text-white text-right font-mono">{test.numericValue.toFixed(2)}%</td>
                          <td className={`py-3 text-sm text-right font-semibold ${qualityColor}`}>{quality}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
