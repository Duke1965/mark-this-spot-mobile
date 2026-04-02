import { Suspense } from "react"
import PostcardNewClient from "./postcard-new-client"

export default function PostcardNewPage() {
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
      <PostcardNewClient />
    </Suspense>
  )
}

