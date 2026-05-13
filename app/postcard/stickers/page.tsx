import { Suspense } from "react"
import StickerStudioClient from "./sticker-studio-client"

export default function PostcardStickersPage() {
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
      <StickerStudioClient />
    </Suspense>
  )
}

