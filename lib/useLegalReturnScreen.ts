import { useEffect, type Dispatch, type SetStateAction } from "react"
import { consumeLegalReturnToAccount } from "@/lib/legalPageBack"

type AppScreen =
  | "map"
  | "camera"
  | "platform-select"
  | "content-editor"
  | "editor"
  | "story"
  | "library"
  | "story-builder"
  | "recommendations"
  | "place-navigation"
  | "results"
  | "settings"

/** After legal pages push Home with a return marker, reopen Account if that was the prior screen. */
export function useLegalReturnScreen(
  authLoading: boolean,
  setCurrentScreen: Dispatch<SetStateAction<AppScreen>>,
): void {
  useEffect(() => {
    if (authLoading) return
    if (!consumeLegalReturnToAccount()) return
    try {
      if (localStorage.getItem("pinit-current-screen") === "settings") {
        setCurrentScreen("settings")
      }
    } catch {
      /* ignore */
    }
  }, [authLoading, setCurrentScreen])
}
