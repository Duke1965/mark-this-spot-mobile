import { Suspense } from "react"
import PostcardCreatorClient from "./postcard-creator-client"
import EditorErrorBoundary from "./editor-error-boundary"

export default function PostcardEditorPage() {
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
      <EditorErrorBoundary>
        <PostcardCreatorClient />
      </EditorErrorBoundary>
    </Suspense>
  )
}

