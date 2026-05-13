import { Suspense } from "react"
import PreviewClient from "./preview-client"

export default function PostcardPreviewPage() {
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
      <PreviewClient />
    </Suspense>
  )
}

