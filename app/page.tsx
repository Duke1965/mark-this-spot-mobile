// app/page.tsx
import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/components/HomeClient"), { ssr: false });

export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeClient />;
}
