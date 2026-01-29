'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Download, Calendar, Search, Filter, LogOut, Share2, CheckCircle2, Circle, X } from 'lucide-react'
import { supabase, QUANTIX_STORE_ID } from '@/lib/supabase'
import Logo from '@/app/components/Logo'

// PDF Preview Component with lazy iframe loading
function PDFPreview({ pdfUrl, title }: { pdfUrl: string; title: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      {
        rootMargin: '300px', // Start loading even earlier for better UX
        threshold: 0.01
      }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Loading placeholder */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}>
        <FileText className={`w-12 h-12 text-gray-300 ${isVisible && !isLoaded ? 'animate-pulse' : ''}`} />
      </div>
      {isVisible && (
        <iframe
          src={`/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitV`}
          className="w-full h-full absolute inset-0"
          title={`PDF preview: ${title}`}
          loading="lazy"
          style={{
            filter: 'brightness(0.95)',
            pointerEvents: 'none',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out'
          }}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  )
}

interface COA {
  id: string
  document_name: string
  file_url: string
  created_at: string
  store_id: string
  thumbnail_url?: string
  product_id?: string
  product?: {
    id: string
    name: string
    slug: string
    primary_category_id?: string
    primary_category?: {
      id: string
      name: string
      slug: string
      icon: string
    }
  }
  metadata?: {
    sample_id?: string
    test_type?: string
    status?: string
  }
}

interface Store {
  id: string
  store_name: string
  slug: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [coas, setCoas] = useState<COA[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedCOAs, setSelectedCOAs] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const ITEMS_PER_PAGE = 50

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadStoresAndCOAs()
    }
  }, [user])

  useEffect(() => {
    if (user && selectedStore && selectedStore !== 'all') {
      setPage(1)
      loadCOAsForStore(selectedStore, 1)
    }
  }, [selectedStore, user])

  // Auto-select first category if only one exists and no category selected
  useEffect(() => {
    if (coas.length > 0 && !selectedCategory) {
      // Compute categories
      const categoryMap = new Map<string, any>()
      coas.forEach(coa => {
        const category = (coa.product as any)?.primary_category
        if (category) {
          const existing = categoryMap.get(category.id) || { ...category, count: 0 }
          existing.count++
          categoryMap.set(category.id, existing)
        }
      })

      const computedCategories = Array.from(categoryMap.values())

      // If no categories found, auto-select 'all'
      if (computedCategories.length === 0) {
        console.log('🚀 Auto-selecting "all" category')
        setSelectedCategory('all')
      }
      // If only one category, auto-select it
      else if (computedCategories.length === 1) {
        console.log('🚀 Auto-selecting single category:', computedCategories[0].id)
        setSelectedCategory(computedCategories[0].id)
      }
    }
  }, [coas, selectedCategory])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    console.log('🔐 Session check:', { hasSession: !!session, user: session?.user })

    if (!session) {
      router.push('/login')
      return
    }

    console.log('👤 User email:', session.user.email)
    console.log('🆔 User ID:', session.user.id)

    setUser(session.user)
    setLoading(false)
  }

  const loadStoresAndCOAs = async () => {
    try {
      console.log('🔍 Starting loadStoresAndCOAs')
      console.log('📧 User object:', user)
      console.log('🆔 User ID:', user?.id)

      if (!user || !user.id) {
        console.error('❌ No user or user.id found')
        return
      }

      // Get user's platform user record
      const { data: platformUser, error: userError } = await supabase
        .from('platform_users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      console.log('📦 Platform user response:', { platformUser, userError })

      if (userError) {
        console.error('❌ Platform user error:', userError)
        throw userError
      }

      if (!platformUser) {
        console.error('❌ No platform user found')
        return
      }

      console.log('✅ Platform user:', platformUser)

      // Get all stores the user owns or has access to
      const { data: userStores, error: storesError } = await supabase
        .from('stores')
        .select('id, store_name, slug')
        .eq('owner_user_id', platformUser.id)

      console.log('🏪 Stores response:', { userStores, storesError })

      if (storesError) {
        console.error('❌ Stores error:', storesError)
        throw storesError
      }

      console.log('🏪 User stores found:', userStores?.length || 0)
      console.log('🏪 Stores data:', userStores)

      setStores(userStores || [])
      console.log('✅ Stores state updated with', userStores?.length || 0, 'stores')

      // Set first store as default if available
      if (userStores && userStores.length > 0) {
        setSelectedStore(userStores[0].id)
      }
    } catch (err) {
      console.error('❌ Error loading data:', err)
    }
  }

  const loadCOAsForStore = async (storeId: string, pageNum: number = 1) => {
    try {
      console.log('🔍 Loading COAs for store:', storeId, 'page:', pageNum)
      setIsLoadingMore(true)

      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      // Query with product information for SEO-friendly URLs
      const { data: storeCoas, error: coasError, count } = await supabase
        .from('store_documents')
        .select(`
          id,
          document_name,
          file_url,
          created_at,
          store_id,
          metadata,
          document_type,
          thumbnail_url,
          product_id,
          products(id, name, slug, primary_category_id)
        `, { count: 'exact' })
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to)

      console.log('📊 Query result:', { data: storeCoas, error: coasError, count })
      console.log('📊 First COA:', storeCoas?.[0])

      if (coasError) {
        console.error('❌ Error loading COAs:', coasError)
        setIsLoadingMore(false)
        return
      }

      console.log('📄 Loaded', storeCoas?.length || 0, 'COAs for store (total:', count, ')')

      if (pageNum === 1) {
        setCoas((storeCoas as any) || [])
      } else {
        setCoas(prev => [...prev, ...((storeCoas as any) || [])])
      }

      setHasMore((count || 0) > pageNum * ITEMS_PER_PAGE)
      setIsLoadingMore(false)
    } catch (err) {
      console.error('❌ Error loading COAs:', err)
      setIsLoadingMore(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Multi-select handlers
  const handleLongPressStart = (coaId: string) => {
    const timer = setTimeout(() => {
      setIsSelectionMode(true)
      setSelectedCOAs(new Set([coaId]))
    }, 500) // 500ms hold to activate
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleCOAClick = (e: React.MouseEvent, coaId: string) => {
    if (isSelectionMode) {
      e.preventDefault()
      toggleCOASelection(coaId)
    }
  }

  const toggleCOASelection = (coaId: string) => {
    setSelectedCOAs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(coaId)) {
        newSet.delete(coaId)
      } else {
        newSet.add(coaId)
      }
      if (newSet.size === 0) {
        setIsSelectionMode(false)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedCOAs(new Set(filteredCOAs.map(coa => coa.id)))
  }

  const deselectAll = () => {
    setSelectedCOAs(new Set())
    setIsSelectionMode(false)
  }

  // Helper function to generate SEO-friendly COA URL
  const getCoaUrl = (coa: COA): string => {
    const product = coa.product as any
    let productSlug: string

    if (product?.slug) {
      // Use the product's slug if available
      productSlug = product.slug
    } else if (product?.name) {
      // Generate slug from product name
      productSlug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    } else if (coa.document_name) {
      // Fallback to document name
      productSlug = coa.document_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    } else {
      // Last resort: use document ID
      productSlug = coa.id
    }

    return `${window.location.origin}/coa/${coa.store_id}/${productSlug}`
  }

  const handleShare = async () => {
    const selectedCOAData = filteredCOAs.filter(coa => selectedCOAs.has(coa.id))
    const shareURLs = selectedCOAData.map(coa => getCoaUrl(coa))

    if (navigator.share && selectedCOAData.length === 1) {
      try {
        await navigator.share({
          title: selectedCOAData[0].document_name || 'Certificate of Analysis',
          text: `View this certificate from ${stores.find(s => s.id === selectedStore)?.store_name || 'Quantix Analytics'}`,
          url: shareURLs[0]
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      const shareContent = selectedCOAData.length === 1
        ? shareURLs[0]
        : shareURLs.map((url, i) => `${i + 1}. ${selectedCOAData[i].document_name}\n   ${url}`).join('\n\n')
      navigator.clipboard.writeText(shareContent)
      alert(`${selectedCOAData.length === 1 ? 'Link' : 'Links'} copied to clipboard!`)
    }
  }

  const handleExport = () => {
    const selectedCOAData = filteredCOAs
      .filter(coa => selectedCOAs.has(coa.id))
      .map(coa => ({
        name: coa.document_name,
        shareUrl: getCoaUrl(coa),
        pdfUrl: coa.file_url,
        date: new Date(coa.created_at).toLocaleDateString(),
        category: (coa.product as any)?.primary_category?.name || 'Unknown',
        productName: (coa.product as any)?.name || coa.document_name
      }))

    const csvContent = [
      'Name,Product,Share URL,PDF URL,Date,Category',
      ...selectedCOAData.map(item =>
        `"${item.name}","${item.productName}","${item.shareUrl}","${item.pdfUrl}","${item.date}","${item.category}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quantix-coas-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Get categories from actual database categories (not guessed from names)
  const categoryMap = new Map<string, {id: string, name: string, slug: string, icon: string, count: number}>()

  coas.forEach(coa => {
    const category = (coa.product as any)?.primary_category
    if (category && (selectedStore === 'all' || coa.store_id === selectedStore)) {
      const existing = categoryMap.get(category.id) || { ...category, count: 0 }
      existing.count++
      categoryMap.set(category.id, existing)
    }
  })

  console.log('📊 Category map:', categoryMap)
  console.log('📊 Total COAs:', coas.length)

  // If no categories, create a default "All Documents" category
  let categories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count)

  if (categories.length === 0 && coas.length > 0) {
    categories = [{
      id: 'all',
      name: 'All Documents',
      slug: 'all',
      icon: '📄',
      count: coas.length
    }]
    console.log('⚠️ No categories found, using default "All Documents"')
  }

  const filteredCOAs = coas.filter(coa => {
    const category = (coa.product as any)?.primary_category
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || category?.id === selectedCategory

    const matchesSearch = coa.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coa.metadata?.sample_id?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterType === 'all' || coa.metadata?.test_type === filterType

    // No need to filter by store since we're only loading one store's COAs
    return matchesCategory && matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header - Compact & Sleek */}
      <div className="bg-background border-b border-white/10">
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size="sm" showText={false} href="/" />
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-white leading-none">Dashboard</h1>
              <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Store Selector */}
            {stores.length > 0 && (
              <select
                value={selectedStore}
                onChange={(e) => {
                  const newStoreId = e.target.value
                  setSelectedStore(newStoreId)
                  setSelectedCategory(null) // Reset category when store changes
                  setPage(1) // Reset pagination
                  if (newStoreId !== 'all') {
                    loadCOAsForStore(newStoreId, 1)
                  }
                }}
                className="bg-white/5 border border-white/10 rounded-lg pl-2.5 pr-7 py-1.5 text-xs sm:text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#0071e3]/50 transition-colors"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.store_name}
                  </option>
                ))}
              </select>
            )}

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="text-white/60 hover:text-white transition-colors p-1.5 sm:p-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Selection or Filters */}
      {!selectedCategory ? (
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-center mb-6">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">Select Product Category</h2>
          <div className="max-w-2xl mx-auto space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="group w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#0071e3]/50 rounded-lg p-3 sm:p-4 transition-all duration-200 hover:translate-x-1 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] group-hover:scale-125 transition-transform"></div>
                  <h3 className="text-white font-medium text-sm sm:text-base group-hover:text-[#0071e3] transition-colors">
                    {category.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-white/60 text-xs sm:text-sm">
                    {category.count} {category.count === 1 ? 'certificate' : 'certificates'}
                  </span>
                  <span className="text-white/40 group-hover:text-[#0071e3] transition-colors text-sm">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Selection Mode Toolbar */}
          {isSelectionMode && (
            <div className="bg-[#0071e3] border-b border-[#0071e3] sticky top-0 z-20">
              <div className="px-3 sm:px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={deselectAll}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-white font-medium text-xs sm:text-sm">
                    {selectedCOAs.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-white hover:text-white/80 transition-colors px-2 py-1 rounded-lg border border-white/20"
                  >
                    All
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-white hover:bg-white/10 transition-colors px-2 py-1 rounded-lg"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Share</span>
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1 text-white hover:bg-white/10 transition-colors px-2 py-1 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Export</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters - Compact & Sticky */}
          <div className="bg-surface/50 border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl" style={{ top: isSelectionMode ? '48px' : '0' }}>
            <div className="px-3 sm:px-6 py-2.5 flex flex-wrap sm:flex-nowrap gap-2 items-center">
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setIsSelectionMode(false)
                  setSelectedCOAs(new Set())
                }}
                className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs sm:text-sm"
              >
                <span>←</span>
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* Category Title */}
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  {categories.find(c => c.id === selectedCategory)?.name || 'Products'}
                </h2>
                <span className="text-[10px] sm:text-xs text-white/50">
                  {filteredCOAs.length}
                </span>
              </div>

              <div className="hidden sm:block flex-1" />

              {/* Search */}
              <div className="relative flex-1 sm:flex-none sm:w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#0071e3]/50 transition-colors"
                />
              </div>

              {/* Test Type Filter */}
              <div className="relative">
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg pl-7 pr-8 py-1.5 text-xs sm:text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#0071e3]/50 transition-colors"
                >
                  <option value="all">All Tests</option>
                  <option value="cannabis">Cannabis</option>
                  <option value="peptide">Peptide</option>
                  <option value="potency">Potency</option>
                  <option value="safety">Safety</option>
                </select>
              </div>
            </div>
          </div>

          {/* COA Grid */}
          <div className="px-3 sm:px-6 py-4 sm:py-6">

            {filteredCOAs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm || filterType !== 'all' ? 'No results found' : 'No COAs yet'}
            </h3>
            <p className="text-white/60">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Your certificates will appear here once testing is complete'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3">
              {filteredCOAs.map((coa) => {
                const isSelected = selectedCOAs.has(coa.id)
                const cardContent = (
                  <>
                    {/* Selection Checkbox Overlay */}
                    {isSelectionMode && (
                      <div className="absolute top-1.5 right-1.5 z-10">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-[#0071e3] fill-[#0071e3] bg-white rounded-full" />
                        ) : (
                          <Circle className="w-5 h-5 text-white bg-black/30 rounded-full" />
                        )}
                      </div>
                    )}

                    {/* Preview Card */}
                    <div className={`aspect-[8.5/11] bg-white rounded-lg shadow-lg overflow-hidden mb-1.5 transition-all duration-200 relative ${
                      isSelected ? 'ring-2 ring-[#0071e3] scale-[0.96]' : 'group-hover:shadow-xl group-hover:scale-[1.01]'
                    }`}>
                      <PDFPreview pdfUrl={coa.file_url} title={coa.document_name} />

                      {/* Hover brightness overlay */}
                      <div className={`absolute inset-0 transition-all duration-200 pointer-events-none ${
                        isSelected ? 'bg-[#0071e3]/10' : 'bg-black/5 group-hover:bg-black/10'
                      }`}></div>
                    </div>

                    {/* Info Below */}
                    <div className="px-0.5">
                      <h3 className={`text-[10px] sm:text-xs font-medium truncate mb-0.5 transition-colors ${
                        isSelected ? 'text-[#0071e3]' : 'text-white group-hover:text-[#0071e3]'
                      }`}>
                        {coa.document_name || `COA #${coa.id.slice(0, 8)}`}
                      </h3>
                      <div className="flex items-center text-[9px] sm:text-[10px] text-white/50">
                        <span>{new Date(coa.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </>
                )

                return isSelectionMode ? (
                  <div
                    key={coa.id}
                    className="group block transition-all duration-200 relative cursor-pointer"
                    onMouseDown={() => handleLongPressStart(coa.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(coa.id)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                    onClick={(e) => handleCOAClick(e, coa.id)}
                  >
                    {cardContent}
                  </div>
                ) : (
                  <Link
                    key={coa.id}
                    href={getCoaUrl(coa)}
                    className="group block transition-all duration-200 relative"
                    onMouseDown={() => handleLongPressStart(coa.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(coa.id)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                    onClick={(e) => handleCOAClick(e, coa.id)}
                  >
                    {cardContent}
                  </Link>
                )
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    loadCOAsForStore(selectedStore, nextPage)
                  }}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-white/10 hover:bg-[#0071e3] border border-white/20 hover:border-[#0071e3] rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </>
      )}
    </main>
  )
}
