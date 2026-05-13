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
            backgroundColor: "#eef8f4",
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

