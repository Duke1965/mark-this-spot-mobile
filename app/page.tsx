"use client"

import dynamic from 'next/dynamic'
import ErrorBoundary from '@/components/ErrorBoundary'

const PINITApp = dynamic(() => import('./client-page'), { ssr: false })

export default function Page() {
  return (
    <ErrorBoundary>
      <PINITApp />
    </ErrorBoundary>
  )
}
