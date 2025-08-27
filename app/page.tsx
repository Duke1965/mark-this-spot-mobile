// app/page.tsx  (Server Component — note: NO "use client")
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic"; // ok here on the server

export default function Page() {
  return <HomeClient />;
}
