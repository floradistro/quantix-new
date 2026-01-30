'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Download, Share2, Calendar, Building2, ArrowLeft, Copy, Check,
  BarChart3, Table, Maximize2, FlaskConical, Leaf, Droplets, Shield,
  BadgeCheck, Clock, Hash, Beaker, TrendingUp, Sparkles, Activity,
  ChevronDown, ChevronUp, X
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

// Animated number counter component
function AnimatedNumber({ value, suffix = '', decimals = 1, duration = 1500 }: {
  value: number; suffix?: string; decimals?: number; duration?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const animationFrame = useRef<number>()

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(value * easeOutQuart)

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      }
    }

    animationFrame.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    }
  }, [value, duration])

  return <>{displayValue.toFixed(decimals)}{suffix}</>
}

// Animated circular progress chart
function CircularChart({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 8,
  color,
  label,
  sublabel,
  delay = 0
}: {
  value: number
  maxValue?: number
  size?: number
  strokeWidth?: number
  color: string
  label: string
  sublabel?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min((value / maxValue) * 100, 100)
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const colorMap: Record<string, { stroke: string; bg: string; text: string }> = {
    green: { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: 'text-emerald-400' },
    blue: { stroke: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', text: 'text-blue-400' },
    purple: { stroke: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: 'text-purple-400' },
    orange: { stroke: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', text: 'text-orange-400' },
    pink: { stroke: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', text: 'text-pink-400' },
    cyan: { stroke: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', text: 'text-cyan-400' },
  }

  const colors = colorMap[color] || colorMap.blue

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={isVisible ? strokeDashoffset : circumference}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${colors.stroke}50)` }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {isVisible ? <AnimatedNumber value={value} suffix="%" decimals={1} /> : '0%'}
          </span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-white">{label}</p>
        {sublabel && <p className="text-xs text-white/50">{sublabel}</p>}
      </div>
    </div>
  )
}

// Horizontal bar chart for compounds
function BarChart({
  data,
  maxValue,
  color,
  delay = 0
}: {
  data: { name: string; value: number }[]
  maxValue: number
  color: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const colorMap: Record<string, string> = {
    green: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-violet-600',
    orange: 'from-orange-500 to-amber-600',
    pink: 'from-pink-500 to-rose-600',
  }

  const gradientClass = colorMap[color] || colorMap.blue

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100
        return (
          <div
            key={item.name}
            className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white/80">{item.name}</span>
              <span className="text-sm font-mono text-white">{item.value.toFixed(2)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-1000 ease-out`}
                style={{
                  width: isVisible ? `${percentage}%` : '0%',
                  transitionDelay: `${index * 100 + 200}ms`
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Animated stat card
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'blue',
  delay = 0
}: {
  icon: any
  label: string
  value: string | number
  sublabel?: string
  color?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    green: { bg: 'from-emerald-500/20 to-green-600/10', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
    blue: { bg: 'from-blue-500/20 to-cyan-600/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
    purple: { bg: 'from-purple-500/20 to-violet-600/10', border: 'border-purple-500/30', icon: 'text-purple-400' },
    orange: { bg: 'from-orange-500/20 to-amber-600/10', border: 'border-orange-500/30', icon: 'text-orange-400' },
    pink: { bg: 'from-pink-500/20 to-rose-600/10', border: 'border-pink-500/30', icon: 'text-pink-400' },
    cyan: { bg: 'from-cyan-500/20 to-teal-600/10', border: 'border-cyan-500/30', icon: 'text-cyan-400' },
  }

  const colors = colorMap[color] || colorMap.blue

  return (
    <div
      className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/5 ${colors.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/50 mb-0.5">{label}</p>
          <p className="text-base font-semibold text-white truncate">{value}</p>
          {sublabel && <p className="text-xs text-white/40 mt-0.5">{sublabel}</p>}
        </div>
      </div>
    </div>
  )
}

// Section container with animation
function Section({
  title,
  icon: Icon,
  children,
  className = '',
  delay = 0,
  collapsible = false,
  defaultOpen = true
}: {
  title: string
  icon: any
  children: React.ReactNode
  className?: string
  delay?: number
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isOpen, setIsOpen] = useState(defaultOpen)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`glass-effect rounded-2xl overflow-hidden transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      <div
        className={`flex items-center justify-between px-6 py-4 border-b border-white/10 ${collapsible ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0071e3]/20">
            <Icon className="w-5 h-5 text-[#0071e3]" />
          </div>
          {title}
        </h2>
        {collapsible && (
          <button className="text-white/60 hover:text-white transition-colors">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Safety test badge
function SafetyBadge({ name, status }: { name: string; status: string }) {
  const isPassing = status.toLowerCase() === 'pass' || status.toLowerCase() === 'passed' || status.toLowerCase() === 'nd' || status.toLowerCase() === 'not detected'

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      isPassing
        ? 'bg-emerald-500/10 border-emerald-500/30'
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      {isPassing ? (
        <BadgeCheck className="w-4 h-4 text-emerald-400" />
      ) : (
        <X className="w-4 h-4 text-red-400" />
      )}
      <span className="text-sm text-white">{name}</span>
      <span className={`text-xs font-medium ml-auto ${isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
        {status}
      </span>
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
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPdf, setShowPdf] = useState(false)

  useEffect(() => {
    loadCOA()
  }, [storeId, productSlug])

  const loadCOA = async () => {
    try {
      const apiUrl = `/api/coa/${storeId}/${productSlug}`
      const response = await fetch(apiUrl, { cache: 'no-store' })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Certificate not found')
        } else {
          throw new Error('Failed to load certificate')
        }
        return
      }

      const result = await response.json()
      if (result.data) {
        setCoa(result.data)
      } else {
        setError('Certificate not found')
      }

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

  // Parse test results
  const testResults = coa?.metadata?.test_results || {}
  const cannabinoids = coa?.metadata?.cannabinoids || {}
  const terpenes = coa?.metadata?.terpenes || {}
  const safetyTests = coa?.metadata?.safety_tests || {}

  // Convert test results to array
  const testResultsArray = Object.entries(testResults)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0)
    }))
    .filter(item => !isNaN(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value)

  // Convert cannabinoids to sorted array
  const cannabinoidsArray = Object.entries(cannabinoids)
    .map(([name, value]) => ({ name, value: value as number }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  // Convert terpenes to sorted array
  const terpenesArray = Object.entries(terpenes)
    .map(([name, value]) => ({ name, value: value as number }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  // Safety tests array
  const safetyTestsArray = Object.entries(safetyTests)
    .map(([name, status]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), status: status as string }))

  const maxCannabinoid = cannabinoidsArray.length > 0 ? Math.max(...cannabinoidsArray.map(c => c.value)) : 30
  const maxTerpene = terpenesArray.length > 0 ? Math.max(...terpenesArray.map(t => t.value)) : 5

  // Calculate totals
  const thcTotal = coa?.metadata?.thc_total ?? 0
  const cbdTotal = coa?.metadata?.cbd_total ?? 0
  const terpenesTotal = coa?.metadata?.terpenes_total ?? 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-[#0071e3]/30 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <p className="text-white/60 animate-pulse">Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !coa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center">
            <FileText className="w-10 h-10 text-white/20" />
          </div>
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
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#0071e3]/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <div className="border-b border-white/10 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" showText={false} href="/" />
            <div>
              <h1 className="text-lg font-semibold text-white">{coa.products?.name || coa.document_name}</h1>
              <p className="text-xs text-white/60 flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                {coa.stores?.store_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all hover:scale-105 text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] rounded-xl text-white transition-all hover:scale-105 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Hero Section - Main Cannabinoid Overview */}
        {(thcTotal > 0 || cbdTotal > 0 || terpenesTotal > 0) && (
          <div className="mb-8">
            <Section title="Cannabinoid Profile" icon={FlaskConical} delay={0}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {thcTotal > 0 && (
                  <CircularChart
                    value={thcTotal}
                    maxValue={35}
                    size={140}
                    color="green"
                    label="Total THC"
                    sublabel="Δ9-THC + THCa"
                    delay={100}
                  />
                )}
                {cbdTotal > 0 && (
                  <CircularChart
                    value={cbdTotal}
                    maxValue={35}
                    size={140}
                    color="blue"
                    label="Total CBD"
                    sublabel="CBD + CBDa"
                    delay={200}
                  />
                )}
                {terpenesTotal > 0 && (
                  <CircularChart
                    value={terpenesTotal}
                    maxValue={10}
                    size={140}
                    color="purple"
                    label="Total Terpenes"
                    sublabel="Aromatic compounds"
                    delay={300}
                  />
                )}
                {(thcTotal > 0 || cbdTotal > 0) && (
                  <CircularChart
                    value={thcTotal + cbdTotal}
                    maxValue={50}
                    size={140}
                    color="cyan"
                    label="Total Cannabinoids"
                    sublabel="Combined potency"
                    delay={400}
                  />
                )}
              </div>
            </Section>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Document Info Cards */}
            <Section title="Certificate Details" icon={FileText} delay={100}>
              <div className="grid grid-cols-1 gap-3">
                <StatCard
                  icon={Leaf}
                  label="Product Name"
                  value={coa.products?.name || coa.document_name}
                  color="green"
                  delay={150}
                />
                <StatCard
                  icon={Building2}
                  label="Licensed Retailer"
                  value={coa.stores?.store_name || 'Unknown'}
                  color="blue"
                  delay={200}
                />
                <StatCard
                  icon={Calendar}
                  label="Date Issued"
                  value={new Date(coa.metadata?.issue_date || coa.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  color="purple"
                  delay={250}
                />
                {coa.metadata?.sample_id && (
                  <StatCard
                    icon={Hash}
                    label="Sample ID"
                    value={coa.metadata.sample_id}
                    color="orange"
                    delay={300}
                  />
                )}
                {coa.metadata?.batch_number && (
                  <StatCard
                    icon={Beaker}
                    label="Batch Number"
                    value={coa.metadata.batch_number}
                    color="pink"
                    delay={350}
                  />
                )}
                {coa.metadata?.lab_name && (
                  <StatCard
                    icon={FlaskConical}
                    label="Testing Laboratory"
                    value={coa.metadata.lab_name}
                    color="cyan"
                    delay={400}
                  />
                )}
              </div>
            </Section>

            {/* Safety Tests */}
            {safetyTestsArray.length > 0 && (
              <Section title="Safety Testing" icon={Shield} delay={200} collapsible defaultOpen={true}>
                <div className="grid grid-cols-1 gap-2">
                  {safetyTestsArray.map((test, index) => (
                    <SafetyBadge key={test.name} name={test.name} status={test.status} />
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Right Column - Charts & Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cannabinoid Breakdown */}
            {cannabinoidsArray.length > 0 && (
              <Section title="Cannabinoid Breakdown" icon={Activity} delay={150}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <BarChart
                      data={cannabinoidsArray.slice(0, 6)}
                      maxValue={maxCannabinoid * 1.2}
                      color="green"
                      delay={200}
                    />
                  </div>
                  {cannabinoidsArray.length > 6 && (
                    <div>
                      <BarChart
                        data={cannabinoidsArray.slice(6, 12)}
                        maxValue={maxCannabinoid * 1.2}
                        color="blue"
                        delay={400}
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Terpene Profile */}
            {terpenesArray.length > 0 && (
              <Section title="Terpene Profile" icon={Droplets} delay={250}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <BarChart
                      data={terpenesArray.slice(0, 6)}
                      maxValue={maxTerpene * 1.2}
                      color="purple"
                      delay={300}
                    />
                  </div>
                  {terpenesArray.length > 6 && (
                    <div>
                      <BarChart
                        data={terpenesArray.slice(6, 12)}
                        maxValue={maxTerpene * 1.2}
                        color="pink"
                        delay={500}
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Test Results (if no structured data) */}
            {testResultsArray.length > 0 && cannabinoidsArray.length === 0 && (
              <Section title="Test Results" icon={TrendingUp} delay={200}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        viewMode === 'visual' ? 'bg-[#0071e3] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        viewMode === 'table' ? 'bg-[#0071e3] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {viewMode === 'visual' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {testResultsArray.slice(0, 12).map((test, index) => (
                      <CircularChart
                        key={test.name}
                        value={test.value}
                        maxValue={100}
                        size={100}
                        color={index % 6 === 0 ? 'green' : index % 6 === 1 ? 'blue' : index % 6 === 2 ? 'purple' : index % 6 === 3 ? 'orange' : index % 6 === 4 ? 'pink' : 'cyan'}
                        label={test.name}
                        delay={index * 50 + 100}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-xs font-semibold text-white/60 pb-3 pr-4">Compound</th>
                          <th className="text-right text-xs font-semibold text-white/60 pb-3 pr-4">Result</th>
                          <th className="text-left text-xs font-semibold text-white/60 pb-3">Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResultsArray.map((test, index) => {
                          const level = test.value >= 90 ? 'High' : test.value >= 50 ? 'Medium' : 'Low'
                          const levelColor = test.value >= 90 ? 'text-emerald-400' : test.value >= 50 ? 'text-blue-400' : 'text-orange-400'
                          return (
                            <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 text-sm text-white pr-4">{test.name}</td>
                              <td className="py-3 text-sm text-white text-right font-mono pr-4">{test.value.toFixed(2)}%</td>
                              <td className={`py-3 text-sm font-semibold ${levelColor}`}>{level}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {/* PDF Document */}
            <Section title="Certificate Document" icon={FileText} delay={300} collapsible defaultOpen={true}>
              <div className="relative">
                <div className={`bg-gray-100 rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : 'h-[70vh]'}`}>
                  {isFullscreen && (
                    <button
                      onClick={() => setIsFullscreen(false)}
                      className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <iframe
                    src={`/api/pdf-proxy?url=${encodeURIComponent(coa.file_url)}`}
                    className="w-full h-full"
                    title="Certificate of Analysis PDF"
                    loading="eager"
                    style={{ border: 'none', display: 'block' }}
                    allow="fullscreen"
                  />
                </div>
                {!isFullscreen && (
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-white/40">
            This Certificate of Analysis was issued by {coa.metadata?.lab_name || 'an accredited laboratory'}
          </p>
          <p className="text-xs text-white/30 mt-2">
            Verified and distributed by Quantix Analytics
          </p>
        </div>
      </div>
    </main>
  )
}
