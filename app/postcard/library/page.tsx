import { Suspense } from "react"
import MyPostcardsClient from "./my-postcards-client"

export default function MyPostcardsPage() {
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
      <MyPostcardsClient />
    </Suspense>
  )
}

