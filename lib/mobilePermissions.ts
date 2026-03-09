import { Capacitor, registerPlugin } from "@capacitor/core"

type PermissionStateLike = "granted" | "denied" | "prompt" | "prompt-with-rationale"
type UnknownRecord = Record<string, unknown>

type PluginWithPermissions = {
  checkPermissions?: () => Promise<unknown>
  requestPermissions?: (args?: unknown) => Promise<unknown>
}

const EXPLAINED_KEY_PREFIX = "pinit-permission-explained:"

function isNativeCapacitor(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform()
}

function wasExplained(key: string): boolean {
  try {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(EXPLAINED_KEY_PREFIX + key) === "1"
  } catch {
    return false
  }
}

function markExplained(key: string) {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(EXPLAINED_KEY_PREFIX + key, "1")
  } catch {
    // best-effort
  }
}

function parseAnyGranted(result: unknown): boolean {
  if (!result || typeof result !== "object") return false
  for (const v of Object.values(result as UnknownRecord)) {
    if (v === "granted") return true
  }
  return false
}

function normalizePermissionValue(v: unknown): PermissionStateLike | null {
  if (v === "granted" || v === "denied" || v === "prompt" || v === "prompt-with-rationale") return v
  return null
}

function pickFirstPermissionValue(result: unknown): PermissionStateLike | null {
  if (!result || typeof result !== "object") return null
  for (const v of Object.values(result as UnknownRecord)) {
    const norm = normalizePermissionValue(v)
    if (norm) return norm
  }
  return null
}

async function showExplanationModalOnce(opts: {
  key: string
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}): Promise<boolean> {
  if (typeof window === "undefined") return true
  if (wasExplained(opts.key)) return true

  const ok = await showPinitConfirmModal({
    title: opts.title,
    message: opts.message,
    confirmText: opts.confirmText ?? "Continue",
    cancelText: opts.cancelText ?? "Not now",
  })
  if (ok) markExplained(opts.key)
  return ok
}

async function showPinitConfirmModal(opts: {
  title: string
  message: string
  confirmText: string
  cancelText: string
}): Promise<boolean> {
  if (typeof document === "undefined") return true

  return await new Promise<boolean>((resolve) => {
    const overlay = document.createElement("div")
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:999999",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:18px",
      "background:rgba(0,0,0,0.65)",
      "backdrop-filter:blur(10px)",
    ].join(";")

    const card = document.createElement("div")
    card.style.cssText = [
      "width:min(420px, 92vw)",
      "border-radius:20px",
      "padding:18px",
      "color:white",
      "background:linear-gradient(135deg, rgba(30,58,138,0.96) 0%, rgba(30,64,175,0.96) 50%, rgba(55,48,163,0.96) 100%)",
      "border:1px solid rgba(255,255,255,0.18)",
      "box-shadow:0 20px 60px rgba(0,0,0,0.55)",
    ].join(";")

    const title = document.createElement("div")
    title.textContent = opts.title
    title.style.cssText = [
      "font-size:16px",
      "font-weight:700",
      "letter-spacing:0.2px",
      "margin-bottom:10px",
    ].join(";")

    const message = document.createElement("div")
    message.textContent = opts.message
    message.style.cssText = [
      "font-size:13px",
      "line-height:1.35",
      "opacity:0.9",
      "margin-bottom:16px",
    ].join(";")

    const row = document.createElement("div")
    row.style.cssText = ["display:flex", "gap:10px", "justify-content:flex-end"].join(";")

    const cancelBtn = document.createElement("button")
    cancelBtn.type = "button"
    cancelBtn.textContent = opts.cancelText
    cancelBtn.style.cssText = [
      "padding:10px 12px",
      "border-radius:12px",
      "border:1px solid rgba(255,255,255,0.22)",
      "background:rgba(255,255,255,0.10)",
      "color:white",
      "font-weight:600",
      "cursor:pointer",
    ].join(";")

    const confirmBtn = document.createElement("button")
    confirmBtn.type = "button"
    confirmBtn.textContent = opts.confirmText
    confirmBtn.style.cssText = [
      "padding:10px 12px",
      "border-radius:12px",
      "border:1px solid rgba(255,255,255,0.22)",
      "background:rgba(16,185,129,0.22)",
      "color:white",
      "font-weight:800",
      "cursor:pointer",
    ].join(";")

    const cleanup = (value: boolean) => {
      try {
        overlay.remove()
      } catch {
        // ignore
      }
      resolve(value)
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false)
    })
    cancelBtn.addEventListener("click", () => cleanup(false))
    confirmBtn.addEventListener("click", () => cleanup(true))

    row.appendChild(cancelBtn)
    row.appendChild(confirmBtn)

    card.appendChild(title)
    card.appendChild(message)
    card.appendChild(row)
    overlay.appendChild(card)
    document.body.appendChild(overlay)
  })
}

async function requestNativePermission(pluginName: string, requestArgs?: unknown): Promise<boolean> {
  try {
    const plugin = registerPlugin<PluginWithPermissions>(pluginName)
    if (typeof plugin?.checkPermissions === "function") {
      const existing = await plugin.checkPermissions()
      if (parseAnyGranted(existing)) return true
      const existingFirst = pickFirstPermissionValue(existing)
      if (existingFirst === "denied") {
        // Don't loop; user must enable in system settings
        return false
      }
    }

    if (typeof plugin?.requestPermissions !== "function") {
      console.warn(`⚠️ Native permission request unavailable for plugin: ${pluginName}`)
      return false
    }

    const res = requestArgs ? await plugin.requestPermissions(requestArgs) : await plugin.requestPermissions()
    return parseAnyGranted(res)
  } catch (e) {
    console.warn(`⚠️ Native permission request failed (${pluginName})`, e)
    return false
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const ok = await showExplanationModalOnce({
    key: "location",
    title: "Enable location",
    message:
      "PINIT uses your location to show where you are on the map and help you pin places around you.",
    confirmText: "Allow location",
  })
  if (!ok) return false

  if (isNativeCapacitor()) {
    console.log("📍 Permission path: native location")
    return await requestNativePermission("Geolocation")
  }

  console.log("📍 Permission path: web location")
  return true
}

export async function requestCameraPermission(): Promise<boolean> {
  const ok = await showExplanationModalOnce({
    key: "camera",
    title: "Enable camera",
    message: "PINIT needs camera access so you can take photos of places you want to remember.",
    confirmText: "Allow camera",
  })
  if (!ok) return false

  if (isNativeCapacitor()) {
    console.log("📷 Permission path: native camera")
    // Uses the native Camera plugin if available in the Capacitor shell
    return await requestNativePermission("Camera", { permissions: ["camera"] })
  }

  console.log("📷 Permission path: web camera")
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

export async function requestPhotoPermission(): Promise<boolean> {
  const ok = await showExplanationModalOnce({
    key: "photos",
    title: "Enable photos",
    message: "PINIT needs access to your photos so you can attach pictures of places you've visited.",
    confirmText: "Allow photos",
  })
  if (!ok) return false

  if (isNativeCapacitor()) {
    console.log("🖼️ Permission path: native photos")
    // Uses the native Camera plugin's photos permission if available
    return await requestNativePermission("Camera", { permissions: ["photos"] })
  }

  console.log("🖼️ Permission path: web photos")
  return true
}

export async function requestContactsPermission(): Promise<boolean> {
  const ok = await showExplanationModalOnce({
    key: "contacts",
    title: "Enable contacts",
    message:
      "PINIT can use your contacts so you can easily invite friends to discover and share places with you.",
    confirmText: "Allow contacts",
  })
  if (!ok) return false

  if (isNativeCapacitor()) {
    console.log("👥 Permission path: native contacts")
    return await requestNativePermission("Contacts")
  }

  console.log("👥 Permission path: web contacts")
  return false
}

export async function requestNotificationPermission(): Promise<boolean> {
  const ok = await showExplanationModalOnce({
    key: "notifications",
    title: "Enable notifications",
    message:
      "PINIT can send notifications when friends share places with you or recommend new spots.",
    confirmText: "Enable notifications",
  })
  if (!ok) return false

  if (isNativeCapacitor()) {
    console.log("🔔 Permission path: native notifications")
    return await requestNativePermission("PushNotifications")
  }

  console.log("🔔 Permission path: web notifications")
  try {
    if (typeof Notification === "undefined") return false
    const res = await Notification.requestPermission()
    return res === "granted"
  } catch {
    return false
  }
}

