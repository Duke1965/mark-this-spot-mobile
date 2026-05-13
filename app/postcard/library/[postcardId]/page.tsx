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
            backgroundColor: "#eef8f4",
          }}
        />
      }
    >
      <PostcardLibraryDetailClient />
    </Suspense>
  )
}

