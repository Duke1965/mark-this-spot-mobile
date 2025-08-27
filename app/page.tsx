import dynamic from "next/dynamic"

// Ensure this route never prerenders
export const dynamic = "force-dynamic"

// No metadata export here. No "use client". No revalidate. Nothing else.
const HomeClient = dynamic(() => import("@/components/HomeClient"), { ssr: false })

export default function Page() {
  return <HomeClient />
}
