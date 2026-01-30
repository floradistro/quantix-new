'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source - use local copy for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PDFViewerProps {
  url: string
  className?: string
}

export default function PDFViewer({ url, className = '' }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadPDF = async () => {
      if (!containerRef.current) return

      try {
        setLoading(true)
        setError(null)

        // Clear previous content
        containerRef.current.innerHTML = ''

        // Fetch PDF through proxy
        const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`
        const response = await fetch(proxyUrl)

        if (!response.ok) {
          throw new Error('Failed to load PDF')
        }

        const arrayBuffer = await response.arrayBuffer()

        if (cancelled) return

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (cancelled) return

        setPageCount(pdf.numPages)

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return

          const page = await pdf.getPage(pageNum)

          // Calculate scale to fit full container width
          const containerWidth = containerRef.current?.clientWidth || window.innerWidth
          const viewport = page.getViewport({ scale: 1 })
          const scale = containerWidth / viewport.width
          const scaledViewport = page.getViewport({ scale })

          // Create canvas for this page - full width with slight gap between pages
          const canvas = document.createElement('canvas')
          canvas.className = 'block w-full mb-2'
          canvas.width = scaledViewport.width * 2 // 2x for retina
          canvas.height = scaledViewport.height * 2
          canvas.style.width = `${scaledViewport.width}px`
          canvas.style.height = `${scaledViewport.height}px`

          const context = canvas.getContext('2d')
          if (!context) continue

          context.scale(2, 2) // Scale for retina

          // Render page
          await page.render({
            canvasContext: context,
            viewport: scaledViewport,
            canvas,
          } as any).promise

          if (cancelled || !containerRef.current) return

          containerRef.current.appendChild(canvas)
        }

        setLoading(false)
      } catch (err: any) {
        if (!cancelled) {
          console.error('PDF load error:', err)
          setError(err.message || 'Failed to load PDF')
          setLoading(false)
        }
      }
    }

    loadPDF()

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-[#0071e3] rounded-full animate-spin" />
            <p className="text-sm text-neutral-500">Loading document...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center p-4">
            <p className="text-sm text-red-500 mb-2">Failed to load PDF</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#0071e3] underline"
            >
              Open directly
            </a>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: loading ? '400px' : 'auto' }}
      />
    </div>
  )
}
