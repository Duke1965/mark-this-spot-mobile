"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocationServices } from "@/hooks/useLocationServices"

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

export default function DiagnosticsPage() {
  const router = useRouter()
  const { location } = useLocationServices()
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLocation, setTestLocation] = useState({ lat: "", lng: "" })
  const [useCurrentLocation, setUseCurrentLocation] = useState(true)
  const [locationStatus, setLocationStatus] = useState<"loading" | "success" | "error">("loading")

  // Get current location when component mounts
  useEffect(() => {
    if (location && (location.latitude || location.lat) && (location.longitude || location.lng)) {
      const lat = location.latitude || location.lat
      const lng = location.longitude || location.lng
      setTestLocation({ lat: lat.toString(), lng: lng.toString() })
      setLocationStatus("success")
      console.log("📍 Current location detected:", { lat, lng })
    } else {
      setLocationStatus("error")
      // Fallback to Cape Town if location not available
      setTestLocation({ lat: "-33.9249", lng: "18.4241" })
    }
  }, [location])

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      let url = "/api/diagnostics"
      
      if (useCurrentLocation && testLocation.lat && testLocation.lng) {
        // Use current location
        url += `?lat=${testLocation.lat}&lng=${testLocation.lng}`
        console.log("📍 Running diagnostics with current location:", { lat: testLocation.lat, lng: testLocation.lng })
      } else if (!useCurrentLocation && testLocation.lat && testLocation.lng) {
        // Use custom location
        url += `?lat=${testLocation.lat}&lng=${testLocation.lng}`
        console.log("📍 Running diagnostics with custom location:", { lat: testLocation.lat, lng: testLocation.lng })
      }
      // If no location provided, API will use default (Cape Town)
      
      const response = await fetch(url)
      const data = await response.json()
      setDiagnostics(data)
      console.log("📊 Diagnostics results:", data)
    } catch (error) {
      console.error("❌ Failed to run diagnostics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Wait for location to be available before running diagnostics
    if (locationStatus !== "loading") {
      runDiagnostics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationStatus])

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
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="number"
            placeholder="Latitude"
            value={testLocation.lat}
            onChange={(e) => setTestLocation({ ...testLocation, lat: e.target.value })}
            disabled={useCurrentLocation}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              opacity: useCurrentLocation ? 0.5 : 1
            }}
          />
          <input
            type="number"
            placeholder="Longitude"
            value={testLocation.lng}
            onChange={(e) => setTestLocation({ ...testLocation, lng: e.target.value })}
            disabled={useCurrentLocation}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              opacity: useCurrentLocation ? 0.5 : 1
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={useCurrentLocation}
              onChange={(e) => setUseCurrentLocation(e.target.checked)}
            />
            Use my current location
          </label>
          {locationStatus === "loading" && (
            <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px" }}>
              📍 Getting your location...
            </span>
          )}
          {locationStatus === "success" && useCurrentLocation && (
            <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px" }}>
              📍 Using: {testLocation.lat}, {testLocation.lng}
            </span>
          )}
          {locationStatus === "error" && (
            <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px" }}>
              ⚠️ Location not available, using default (Cape Town)
            </span>
          )}
        </div>
      </div>

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
            {Object.entries(diagnostics.environment).map(([key, value]) => (
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
            {Object.entries(diagnostics.apis).map(([apiName, apiData]) => (
              <div key={apiName} style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "10px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  {getStatusIcon(apiData.status)}
                  <strong style={{ color: "white", textTransform: "capitalize" }}>
                    {apiName.replace(/_/g, " ")}
                  </strong>
                </div>
                <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>
                  {Object.entries(apiData).map(([key, value]) => (
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

