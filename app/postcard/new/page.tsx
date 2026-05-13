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
            backgroundColor: "#eef8f4",
          }}
        />
      }
    >
      <PostcardNewClient />
    </Suspense>
  )
}

