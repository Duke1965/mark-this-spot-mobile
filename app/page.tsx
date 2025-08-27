// app/page.tsx
import dynamic from "next/dynamic"

export const metadata = {
  title: "PINIT",
  description: "Pin It. Find It. Share It.",
}

export const dynamic = "force-dynamic"

const HomeClient = dynamic(() => import("@/components/HomeClient"), { ssr: false })

export default function Page() {
  return <HomeClient />
}
