// app/page.tsx
import dynamic from "next/dynamic";

// Avoid SSR for the heavy browser logic to prevent TDZ/cycle issues
const HomeClient = dynamic(() => import("@/components/HomeClient"), { ssr: false });

export const dynamic = "force-dynamic"; // ok here
// DO NOT export `revalidate` here

export default function Page() {
  return <HomeClient />;
}
