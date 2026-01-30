"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import type { PinData } from "@/lib/types"

interface DiagnosticResult {
  timestamp: string
  environment: {
    [key: string]: boolean | string | undefined
  }
  apis: {
    [key: string]: any
  }
  map_config?: {
    provider: string
    valid: boolean
    errors: string[]
  }
  overall_status: "OK" | "ISSUES_FOUND"
  issues_summary: {
    missing_env_vars: string[]
    failing_apis: string[]
  }
}

type PlacesBatchResult = {
  timestamp: string
  total: number
  ok: number
  hit_rate: {
    title: number
    description: number
    website: number
    website_images: number
  }
  counts: {
    withTitle: number
    withDescription: number
    withWebsite: number
    withWebsiteImages: number
  }
  capped?: { max_points: number; processed: number; requested: number }
  results: Array<any>
}

export default function DiagnosticsPage() {
  const router = useRouter()
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLocation, setTestLocation] = useState({ lat: "-33.9249", lng: "18.4241" }) // Default to Cape Town
  const [locationError, setLocationError] = useState<string | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  const [pinsDiag, setPinsDiag] = useState<PlacesBatchResult | null>(null)
  const [pinsDiagLoading, setPinsDiagLoading] = useState(false)
  const [pinsDiagError, setPinsDiagError] = useState<string | null>(null)

  // Get current location using navigator.geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser")
      return
    }

    setGettingLocation(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toString()
        const lng = position.coords.longitude.toString()
        setTestLocation({ lat, lng })
        setGettingLocation(false)
        console.log("📍 Current location obtained:", { lat, lng })
      },
      (error) => {
        setGettingLocation(false)
        let errorMessage = "Failed to get location: "
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Permission denied. Please enable location access in your browser settings."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information unavailable."
            break
          case error.TIMEOUT:
            errorMessage += "Location request timed out."
            break
          default:
            errorMessage += error.message || "Unknown error"
        }
        setLocationError(errorMessage)
        console.error("❌ Geolocation error:", error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const runDiagnostics = async () => {
    if (!testLocation.lat || !testLocation.lng) {
      setLocationError("Please enter coordinates or use current location")
      return
    }

    setLoading(true)
    setLocationError(null)
    try {
      const url = `/api/diagnostics?lat=${testLocation.lat}&lng=${testLocation.lng}`
      console.log("📍 Running diagnostics with location:", { lat: testLocation.lat, lng: testLocation.lng })
      
      const response = await fetch(url)
      const data = await response.json()
      setDiagnostics(data)
      console.log("📊 Diagnostics results:", data)
    } catch (error) {
      console.error("❌ Failed to run diagnostics:", error)
      setLocationError("Failed to run diagnostics. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const runDiagnosticsOnSavedPins = async () => {
    setPinsDiagLoading(true)
    setPinsDiagError(null)
    try {
      const raw = localStorage.getItem("pinit-pins")
      if (!raw) {
        setPinsDiagError("No saved pins found on this device.")
        return
      }
      const parsed: PinData[] = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setPinsDiagError("Saved pins data is empty.")
        return
      }

      // Use most recent pins (localStorage stores newest first)
      const recentPins = parsed.slice(0, 30).map((p: any) => ({
        id: p.id,
        title: p.title,
        timestamp: p.timestamp,
        latitude: p.latitude,
        longitude: p.longitude
      }))

      const resp = await fetch("/api/diagnostics/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pins: recentPins })
      })

      if (!resp.ok) {
        setPinsDiagError(`Failed to analyze pins: HTTP ${resp.status}`)
        return
      }

      const data = await resp.json()
      setPinsDiag(data)
    } catch (error) {
      console.error("❌ Failed to run pin diagnostics:", error)
      setPinsDiagError("Failed to analyze saved pins. Please try again.")
    } finally {
      setPinsDiagLoading(false)
    }
  }

  // Run diagnostics on mount with default location
  useEffect(() => {
    runDiagnostics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getStatusIcon = (status: string) => {
    if (status === "OK") return <CheckCircle className="w-5 h-5 text-green-500" />
    if (status === "ERROR") return <XCircle className="w-5 h-5 text-red-500" />
    return <AlertCircle className="w-5 h-5 text-yellow-500" />
  }

  const getStatusColor = (status: string) => {
    if (status === "OK") return "text-green-500"
    if (status === "ERROR") return "text-red-500"
    return "text-yellow-500"
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "15px",
        marginBottom: "30px"
      }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <ArrowLeft className="w-5 h-5" color="white" />
        </button>
        <h1 style={{
          color: "white",
          fontSize: "24px",
          fontWeight: "600",
          margin: 0
        }}>
          System Diagnostics
        </h1>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: loading ? "not-allowed" : "pointer",
            marginLeft: "auto"
          }}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} color="white" />
        </button>
      </div>

      {/* Test Location Input */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "15px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h3 style={{ color: "white", margin: "0 0 15px 0", fontSize: "16px" }}>Test Location</h3>
        
        {/* Always display current test coordinates */}
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "12px", marginBottom: "5px" }}>
            Testing coordinates:
          </div>
          <div style={{ color: "white", fontSize: "16px", fontWeight: "600", fontFamily: "monospace" }}>
            {testLocation.lat}, {testLocation.lng}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={testLocation.lat}
            onChange={(e) => {
              setTestLocation({ ...testLocation, lat: e.target.value })
              setLocationError(null)
            }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              fontSize: "14px"
            }}
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={testLocation.lng}
            onChange={(e) => {
              setTestLocation({ ...testLocation, lng: e.target.value })
              setLocationError(null)
            }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              fontSize: "14px"
            }}
          />
        </div>

        {/* Use Current Location Button */}
        <button
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            background: gettingLocation 
              ? "rgba(255, 255, 255, 0.1)" 
              : "rgba(255, 255, 255, 0.2)",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: gettingLocation ? "not-allowed" : "pointer",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (!gettingLocation) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"
            }
          }}
          onMouseLeave={(e) => {
            if (!gettingLocation) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"
            }
          }}
        >
          {gettingLocation ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              📍 Use my current location
            </>
          )}
        </button>

        {/* Error Display */}
        {locationError && (
          <div style={{
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "10px",
            color: "#fca5a5",
            fontSize: "13px"
          }}>
            ⚠️ {locationError}
          </div>
        )}

        {/* Run Diagnostics Button */}
        <button
          onClick={runDiagnostics}
          disabled={loading || !testLocation.lat || !testLocation.lng}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            background: (loading || !testLocation.lat || !testLocation.lng)
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(34, 197, 94, 0.3)",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: (loading || !testLocation.lat || !testLocation.lng) ? "not-allowed" : "pointer",
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (!loading && testLocation.lat && testLocation.lng) {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.4)"
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && testLocation.lat && testLocation.lng) {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.3)"
            }
          }}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running diagnostics...
            </>
          ) : (
            "▶ Run Diagnostics"
          )}
        </button>

        {/* Run Diagnostics on Saved Pins */}
        <button
          onClick={runDiagnosticsOnSavedPins}
          disabled={pinsDiagLoading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            background: pinsDiagLoading ? "rgba(255, 255, 255, 0.1)" : "rgba(59, 130, 246, 0.3)",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: pinsDiagLoading ? "not-allowed" : "pointer",
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease"
          }}
        >
          {pinsDiagLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing saved pins...
            </>
          ) : (
            "🧪 Analyze my saved pins (last 30)"
          )}
        </button>

        {pinsDiagError && (
          <div style={{
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "10px",
            color: "#fca5a5",
            fontSize: "13px"
          }}>
            ⚠️ {pinsDiagError}
          </div>
        )}
      </div>

      {/* Saved Pins Diagnostics Summary */}
      {pinsDiag && (
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "15px",
          padding: "20px",
          marginBottom: "20px"
        }}>
          <h3 style={{ color: "white", margin: "0 0 15px 0", fontSize: "16px" }}>
            Saved Pins Diagnostics (last {pinsDiag.capped?.processed ?? pinsDiag.total})
          </h3>
          <div style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "14px", lineHeight: 1.6 }}>
            <div><strong>Title hit-rate:</strong> {(pinsDiag.hit_rate.title * 100).toFixed(0)}%</div>
            <div><strong>Description hit-rate:</strong> {(pinsDiag.hit_rate.description * 100).toFixed(0)}%</div>
            <div><strong>Website present:</strong> {(pinsDiag.hit_rate.website * 100).toFixed(0)}%</div>
            <div><strong>Website images:</strong> {(pinsDiag.hit_rate.website_images * 100).toFixed(0)}%</div>
          </div>
          <details style={{ marginTop: "12px" }}>
            <summary style={{ color: "white", cursor: "pointer", fontWeight: "600" }}>
              Raw saved-pins diagnostics
            </summary>
            <pre style={{
              color: "white",
              fontSize: "12px",
              overflow: "auto",
              marginTop: "12px",
              background: "rgba(0, 0, 0, 0.3)",
              padding: "15px",
              borderRadius: "8px"
            }}>
              {JSON.stringify(pinsDiag, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {loading && (
        <div style={{
          textAlign: "center",
          color: "white",
          padding: "40px"
        }}>
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p>Running diagnostics...</p>
        </div>
      )}

      {diagnostics && !loading && (
        <>
          {/* Overall Status */}
          <div style={{
            background: diagnostics.overall_status === "OK" 
              ? "rgba(34, 197, 94, 0.2)" 
              : "rgba(239, 68, 68, 0.2)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${diagnostics.overall_status === "OK" ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {getStatusIcon(diagnostics.overall_status)}
              <h2 style={{
                color: "white",
                margin: 0,
                fontSize: "18px",
                fontWeight: "600"
              }}>
                {diagnostics.overall_status === "OK" ? "All Systems Operational" : "Issues Detected"}
              </h2>
            </div>
            {diagnostics.overall_status === "ISSUES_FOUND" && (
              <div style={{ marginTop: "15px", color: "white" }}>
                {diagnostics.issues_summary.missing_env_vars.length > 0 && (
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Missing Environment Variables:</strong>
                    <ul style={{ margin: "5px 0 0 20px" }}>
                      {diagnostics.issues_summary.missing_env_vars.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnostics.issues_summary.failing_apis.length > 0 && (
                  <div>
                    <strong>Failing APIs:</strong>
                    <ul style={{ margin: "5px 0 0 20px" }}>
                      {diagnostics.issues_summary.failing_apis.map((api, i) => (
                        <li key={i}>{api}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Configuration Status */}
          {diagnostics.map_config && (
            <div style={{
              background: diagnostics.map_config.valid 
                ? "rgba(34, 197, 94, 0.1)" 
                : "rgba(239, 68, 68, 0.1)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${diagnostics.map_config.valid ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              borderRadius: "15px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <h3 style={{ color: "white", margin: "0 0 15px 0", fontSize: "16px" }}>Map Configuration</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                {getStatusIcon(diagnostics.map_config.valid ? "OK" : "ERROR")}
                <span style={{ color: "white", fontSize: "14px" }}>
                  Provider: <strong>{diagnostics.map_config.provider}</strong>
                </span>
              </div>
              {diagnostics.map_config.errors && diagnostics.map_config.errors.length > 0 && (
                <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px", marginTop: "10px" }}>
                  {diagnostics.map_config.errors.map((error: string, i: number) => (
                    <div key={i} style={{ marginBottom: "5px" }}>⚠️ {error}</div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Environment Variables */}
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "20px"
          }}>
            <h3 style={{ color: "white", margin: "0 0 15px 0", fontSize: "16px" }}>Environment Variables</h3>
            {Object.entries(diagnostics.environment || {}).map(([key, value]) => (
              <div key={key} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
              }}>
                <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>{key}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {typeof value === "boolean" ? (
                    value ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : (
                    <span style={{ color: "white", fontSize: "14px" }}>{value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* API Status */}
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "20px"
          }}>
            <h3 style={{ color: "white", margin: "0 0 15px 0", fontSize: "16px" }}>API Status</h3>
            {Object.entries(diagnostics.apis || {}).map(([apiName, apiData]) => (
              <div key={apiName} style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "10px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  {getStatusIcon((apiData as any)?.status)}
                  <strong style={{ color: "white", textTransform: "capitalize" }}>
                    {apiName.replace(/_/g, " ")}
                  </strong>
                </div>
                <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>
                  {Object.entries((apiData as any) || {}).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: "5px" }}>
                      <strong style={{ color: "rgba(255, 255, 255, 0.6)" }}>{key}:</strong>{" "}
                      <span className={getStatusColor(String(value))}>
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Raw Data */}
          <details style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "15px",
            padding: "20px"
          }}>
            <summary style={{ color: "white", cursor: "pointer", fontWeight: "600" }}>
              Raw Diagnostic Data
            </summary>
            <pre style={{
              color: "white",
              fontSize: "12px",
              overflow: "auto",
              marginTop: "15px",
              background: "rgba(0, 0, 0, 0.3)",
              padding: "15px",
              borderRadius: "8px"
            }}>
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}

