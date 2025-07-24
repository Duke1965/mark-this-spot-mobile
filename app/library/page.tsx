// app/library/page.tsx

import dynamic from "next/dynamic";

const PinLibrary = dynamic(() => import("@/components/PinLibrary"), {
  ssr: false,
});

export default function LibraryPage() {
  return <PinLibrary />;
}
