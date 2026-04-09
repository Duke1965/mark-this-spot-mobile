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
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
          }}
        />
      }
    >
      <StickerStudioClient />
    </Suspense>
  )
}

