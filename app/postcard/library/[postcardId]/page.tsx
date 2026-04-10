import { Suspense } from "react"
import PostcardLibraryDetailClient from "./postcard-library-detail-client"

export default function PostcardLibraryDetailPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
          }}
        />
      }
    >
      <PostcardLibraryDetailClient />
    </Suspense>
  )
}

