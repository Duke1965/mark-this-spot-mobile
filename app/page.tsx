"use client"

import dynamic from 'next/dynamic'

const PINITApp = dynamic(() => import('./client-page'), { ssr: false })

export default function Page() {
  return <PINITApp />
}
