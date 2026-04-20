"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Settings, LogOut, Bug, AlertTriangle, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { auth } from "@/lib/firebase"
import SystemHealthCheck from "./SystemHealthCheck"
import { getHintsEnabled, setHintsEnabled, HINTS_ENABLED_KEY } from "@/lib/hints"

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.75 1.22 9.25 3.62l6.92-6.92C36.01 2.37 30.44 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.05 6.26C12.59 13.36 17.86 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.15 24.5c0-1.65-.15-3.24-.43-4.78H24v9.06h12.43c-.54 2.9-2.18 5.36-4.66 7.01l7.5 5.82C43.52 37.73 46.15 31.6 46.15 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.61 28.39a14.47 14.47 0 0 1 0-8.78l-8.05-6.26A23.98 23.98 0 0 0 0 24c0 3.87.93 7.53 2.56 10.65l8.05-6.26z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.44 0 11.86-2.12 15.82-5.74l-7.5-5.82c-2.08 1.4-4.73 2.23-8.32 2.23-6.14 0-11.41-3.86-13.39-9.99l-8.05 6.26C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.43c0-3.03 1.79-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.98h-1.52c-1.5 0-1.97.94-1.97 1.9v2.29h3.35l-.54 3.49h-2.81V24c5.74-.91 10.13-5.91 10.13-11.93z"
      />
    </svg>
  )
}

interface SettingsPageProps {
  onBack: () => void
  onComplete: () => void
  isReturningUser: boolean
}

// Factory Reset Dialog Component
function FactoryResetDialog() {
  const [showDialog, setShowDialog] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [resetConfirmed, setResetConfirmed] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showPasswordError, setShowPasswordError] = useState(false)

  const handleResetClick = () => {
    setShowDialog(true)
  }

  const handleCancel = () => {
    setShowDialog(false)
    setPassword("")
    setConfirmed(false)
    setResetConfirmed(false)
    setShowPasswordError(false)
  }

  const performFactoryReset = async () => {
    if (!confirmed || !resetConfirmed || !password) {
      setShowPasswordError(true)
      return
    }
    
    setIsResetting(true)
    
    // Simulate delay for security
    setTimeout(() => {
      try {
        // Clear all localStorage data
        localStorage.removeItem('pinit-app-state')
        localStorage.removeItem('pinit-pins')
        localStorage.removeItem('last-ai-recommendation-time')
        localStorage.removeItem('last-new-user-request')
        localStorage.removeItem('userProfile')
        localStorage.removeItem('pinit-setup-completed')
        localStorage.removeItem('pinit-welcome-seen')
        localStorage.removeItem(HINTS_ENABLED_KEY)
        
        console.log("⚠️ Factory reset completed")
        
        // Reload the app
        window.location.reload()
      } catch (error) {
        console.error("❌ Error during factory reset:", error)
        setIsResetting(false)
      }
    }, 2000)
  }

  return (
    <>
      <button
        onClick={handleResetClick}
        disabled={isResetting}
        style={{
          background: "#EF4444",
          color: "white",
          padding: "1rem",
          borderRadius: "0.5rem",
          border: "none",
          cursor: isResetting ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: "bold",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transition: "all 0.2s ease"
        }}
      >
        <Trash2 size={20} />
        {isResetting ? "Resetting..." : "Reset to Factory Defaults"}
      </button>

      {showDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: "1rem"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
            borderRadius: "20px",
            maxWidth: "400px",
            width: "100%",
            padding: "2rem",
            color: "white",
            border: "2px solid rgba(239, 68, 68, 0.5)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <AlertTriangle size={32} color="#EF4444" />
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>⚠️ Factory Reset</h2>
            </div>
            
            <div style={{
              background: "rgba(239, 68, 68, 0.2)",
              padding: "1rem",
              borderRadius: "12px",
              marginBottom: "1.5rem"
            }}>
              <p style={{ fontSize: "0.95rem", lineHeight: "1.5", margin: 0 }}>
                This will permanently delete <strong>ALL</strong> your data:
              </p>
              <ul style={{ margin: "0.75rem 0 0 1.5rem", fontSize: "0.9rem", lineHeight: "1.8" }}>
                <li>📌 All your pins</li>
                <li>💡 All your recommendations</li>
                <li>📸 All your photos</li>
                <li>⚙️ All your settings</li>
              </ul>
              <p style={{ fontSize: "0.9rem", margin: "0.75rem 0 0 0", fontWeight: "bold", color: "#FCA5A5" }}>
                ⚠️ This action cannot be undone!
              </p>
            </div>

            {/* Confirmation Checkbox 1 */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.75rem",
                fontSize: "0.95rem",
                cursor: "pointer"
              }}>
                <input 
                  type="checkbox" 
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked)
                    setShowPasswordError(false)
                  }}
                  style={{ 
                    width: "20px", 
                    height: "20px",
                    cursor: "pointer"
                  }}
                />
                <span>I understand this will delete all my data</span>
              </label>
            </div>

            {/* Confirmation Checkbox 2 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.75rem",
                fontSize: "0.95rem",
                cursor: "pointer"
              }}>
                <input 
                  type="checkbox" 
                  checked={resetConfirmed}
                  onChange={(e) => {
                    setResetConfirmed(e.target.checked)
                    setShowPasswordError(false)
                  }}
                  style={{ 
                    width: "20px", 
                    height: "20px",
                    cursor: "pointer"
                  }}
                />
                <span>Yes, I want to reset to factory defaults</span>
              </label>
            </div>

            {/* Password Confirmation */}
            {confirmed && resetConfirmed && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  opacity: 0.9
                }}>
                  Enter your password to confirm:
                </label>
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setShowPasswordError(false)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "1rem"
                  }}
                />
                {showPasswordError && (
                  <p style={{ 
                    color: "#FCA5A5", 
                    fontSize: "0.875rem", 
                    margin: "0.5rem 0 0 0" 
                  }}>
                    Password is required to continue
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleCancel}
                disabled={isResetting}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: isResetting ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "600"
                }}
              >
                Cancel
              </button>
              <button
                onClick={performFactoryReset}
                disabled={!confirmed || !resetConfirmed || !password || isResetting}
                style={{
                  flex: 1,
                  background: confirmed && resetConfirmed && password ? "#EF4444" : "rgba(239, 68, 68, 0.3)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "none",
                  cursor: (confirmed && resetConfirmed && password && !isResetting) ? "pointer" : "not-allowed",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  transition: "all 0.2s ease"
                }}
              >
                {isResetting ? "Resetting..." : "Reset Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function SettingsPage({ onBack, onComplete, isReturningUser }: SettingsPageProps) {
  const { user, loading, error, signInWithGoogle, signInWithFacebook, signOutUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [tipsEnabled, setTipsEnabled] = useState(true)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [showInternalTools, setShowInternalTools] = useState(false)
  
  // FIX: Check if user is already authenticated and skip to complete step
  const [currentStep, setCurrentStep] = useState<"welcome" | "login" | "email-login" | "data" | "debug" | "complete" | "settings-menu">(
    isReturningUser ? "settings-menu" : (user ? "complete" : "welcome") // Returning users go to settings menu, authenticated users to complete, new users to welcome
  )
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    avatar: "",
    socialAccounts: {
      instagram: "",
      twitter: "",
      facebook: "",
      whatsapp: "",
      tiktok: "",
      linkedin: "",
      youtube: ""
    },
    preferences: {
      shareByDefault: false,
      autoTag: true,
      locationSharing: true,
      publicProfile: false
    }
  })

  // Load existing profile for returning users
  useEffect(() => {
    setTipsEnabled(getHintsEnabled())
  }, [])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      const urlFlag = new URLSearchParams(window.location.search).get("internal") === "1"
      const storedFlag = localStorage.getItem("pinit-internal-tools") === "1"
      setShowInternalTools(urlFlag || storedFlag)
    } catch {
      setShowInternalTools(false)
    }
  }, [])

  // Guard: keep technical steps out of normal user flow
  useEffect(() => {
    if (showInternalTools) return
    if (currentStep === "data" || currentStep === "debug") {
      setCurrentStep(user ? "complete" : "login")
    }
  }, [currentStep, showInternalTools, user])

  const resetTips = () => {
    try {
      // Clear "shown once" session keys so hints can be re-tested.
      sessionStorage.removeItem("pinit-postcard-rotate-hint-shown-v1")
      sessionStorage.removeItem("pinit-postcard-photo-gesture-hint-shown-v1")
      sessionStorage.removeItem("pinit-postcard-sticker-gesture-hint-shown-v1")
      sessionStorage.removeItem("pinit-shared-rotate-hint-v1")
      try {
        window.alert("Tips reset for this session.")
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (isReturningUser) {
      try {
        const savedProfile = localStorage.getItem('userProfile')
        if (savedProfile) {
          const profile = JSON.parse(savedProfile)
          setUserProfile(prev => ({
            ...prev,
            ...profile,
            socialAccounts: {
              ...prev.socialAccounts,
              ...profile.socialAccounts
            }
          }))
        }
      } catch (error) {
        console.log("Could not load existing profile")
      }
    }
  }, [isReturningUser])

  const handleLogout = async () => {
    try {
      setLogoutError(null)
      setIsLoggingOut(true)
      await signOutUser()

      // Best-effort confirmation (works in real Firebase auth; harmless in demo mode)
      const stillSignedIn = !!(auth as any)?.currentUser
      if (stillSignedIn) {
        throw new Error("Sign out didn't complete. Please try again.")
      }

      try {
        localStorage.setItem("pinit-flash-success", "You are logged out.")
      } catch {
        // ignore
      }

      onComplete()
    } catch (e: any) {
      setLogoutError(e?.message || "Failed to log out. Please try again.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleNext = () => {
    switch (currentStep) {
      case "welcome":
        // Mark welcome as seen immediately when user clicks "Get Started"
        localStorage.setItem('pinit-welcome-seen', 'true')
        setCurrentStep("login")
        break
      case "login":
        if (user) setCurrentStep(showInternalTools ? "data" : "complete")
        break
      case "data":
        setCurrentStep("debug")
        break
      case "debug":
        setCurrentStep("complete")
        break
      case "complete":
        // Mark setup as completed
        localStorage.setItem('pinit-setup-completed', 'true')
        onComplete()
        break
      case "settings-menu":
        // This shouldn't happen - settings menu doesn't have a next button
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case "login":
        setCurrentStep("welcome")
        break
      case "settings-menu":
        // Settings menu goes back to main app
        onBack()
        break
      case "complete":
        setCurrentStep(showInternalTools ? "debug" : "settings-menu")
        break
      default:
        onBack()
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle()
      if (user) {
        setUserProfile(prev => ({
          ...prev,
          name: user.displayName || "User",
          email: user.email || "",
          avatar: user.photoURL || "https://via.placeholder.com/150"
        }))
        // Auto-advance to next step on successful login
        setTimeout(() => setCurrentStep(showInternalTools ? "data" : "complete"), 650)
      }
    } catch (error) {
      console.error("Google login failed:", error)
    }
  }

  const handleFacebookLogin = async () => {
    try {
      const user = await signInWithFacebook()
      if (user) {
        setUserProfile(prev => ({
          ...prev,
          name: user.displayName || "User",
          email: user.email || "",
          avatar: user.photoURL || "https://via.placeholder.com/150"
        }))
        // Auto-advance to next step on successful login
        setTimeout(() => setCurrentStep(showInternalTools ? "data" : "complete"), 650)
      }
    } catch (error) {
      console.error("Facebook login failed:", error)
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <button
          onClick={handleBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Settings size={20} />
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>
            {currentStep === "settings-menu" ? "Settings" : "PINIT Setup"}
          </span>
        </div>

        <div style={{ width: "40px" }}></div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {/* Settings Menu Step - for returning users */}
        {currentStep === "settings-menu" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚙️</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Settings</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Manage your PINIT account and preferences.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px", margin: "0 auto" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Legal</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: 0.92 }}>
                  <a href="/terms" style={{ color: "white", fontWeight: 800, textDecoration: "underline" }}>
                    Terms of Use
                  </a>
                  <a href="/privacy" style={{ color: "white", fontWeight: 800, textDecoration: "underline" }}>
                    Privacy Policy
                  </a>
                </div>
              </div>

              {showInternalTools ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep("debug")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(255,255,255,0.14)",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: 800,
                    textAlign: "left",
                  }}
                >
                  Internal tools
                </button>
              ) : null}

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#EF4444",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    border: "2px solid rgba(239, 68, 68, 0.35)",
                    cursor: isLoggingOut ? "not-allowed" : "pointer",
                    fontSize: "1rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    opacity: isLoggingOut ? 0.75 : 1,
                  }}
                >
                  <LogOut size={20} />
                  {isLoggingOut ? "Signing out…" : "Sign out"}
                </button>
              ) : null}
              {logoutError && user ? (
                <div
                  style={{
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    color: "white",
                    textAlign: "left",
                    fontSize: "0.95rem",
                  }}
                >
                  {logoutError}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Welcome to PINIT!</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Let&apos;s set up your account to make the most of your travel discoveries.
            </p>
            <button
              onClick={handleNext}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
                fontWeight: "bold"
              }}
            >
              Get Started
            </button>
          </div>
        )}

        {/* Login Step */}
        {currentStep === "login" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            {user ? (
              // User is already logged in - show welcome back with logout option
              <>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👋</div>
                <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Welcome back, {user.displayName}!</h1>
                <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
                  You&apos;re already signed in to PINIT
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
                  <button
                    onClick={onComplete}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                      padding: "1rem 2rem",
                      borderRadius: "0.5rem",
                      border: "2px solid rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.3)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.2)"
                    }}
                  >
                    Continue to PINIT
                  </button>
                </div>
              </>
            ) : (
              // User not logged in - show sign-in options
              <>
                <div style={{ fontSize: "2.5rem", fontWeight: 950, letterSpacing: "0.6px", marginBottom: "0.35rem" }}>PINIT</div>
                <div style={{ fontSize: "1rem", opacity: 0.9, marginBottom: "1.5rem" }}>Sign in to save and share places</div>
                <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
                  Choose your preferred way to sign in and start discovering amazing places.
                </p>

                {/* Error Message */}
                {error && (
                  <div style={{
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid #ef4444",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem"
                  }}>
                    {error}
                  </div>
                )}

                {/* Login Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                      background: "white",
                      color: "#111827",
                      padding: "1rem 2rem",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(17,24,39,0.12)",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? "⏳" : <GoogleLogo />} Continue with Google
                  </button>

                  <button
                    onClick={handleFacebookLogin}
                    disabled={loading}
                    style={{
                      background: "#1877F2",
                      color: "white",
                      padding: "1rem 2rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? "⏳" : <FacebookLogo />} Continue with Facebook
                  </button>

                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "1rem", 
                    margin: "1rem 0",
                    opacity: 0.7 
                  }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.3)" }}></div>
                    <span style={{ fontSize: "0.875rem" }}>or</span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.3)" }}></div>
                  </div>

                  <button
                    onClick={() => setCurrentStep("email-login")}
                    disabled={loading}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                      padding: "1rem 2rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? "⏳" : "📧"} Continue with Email
                  </button>

                  <div style={{ marginTop: 10, fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.35 }}>
                    By continuing, you agree to our{" "}
                    <a href="/terms" style={{ color: "white", fontWeight: 900, textDecoration: "underline" }}>
                      Terms of Use
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" style={{ color: "white", fontWeight: 900, textDecoration: "underline" }}>
                      Privacy Policy
                    </a>
                    .
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Data Management Step (internal only) */}
        {showInternalTools && currentStep === "data" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💾</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Data Management</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Manage your PINIT data, backups, and privacy settings.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "350px", margin: "0 auto" }}>
              {/* Factory Reset - DANGEROUS SECTION */}
              <div style={{
                background: "rgba(239, 68, 68, 0.15)",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "2px solid rgba(239, 68, 68, 0.5)",
                marginTop: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>⚠️</span>
                  <div style={{ fontWeight: "600", color: "#EF4444" }}>Factory Reset</div>
                </div>
                <p style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "1rem" }}>
                  This will permanently delete all your pins, recommendations, and settings. This cannot be undone.
                </p>
                <FactoryResetDialog />
              </div>

              {/* Privacy Settings */}
              <div style={{
                background: "rgba(255,255,255,0.15)",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.3)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>🔒</span>
                  <div style={{ fontWeight: "600", color: "white" }}>Privacy Settings</div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white" }}>
                    <input 
                      type="checkbox" 
                      checked={userProfile.preferences.shareByDefault}
                      onChange={(e) => setUserProfile(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, shareByDefault: e.target.checked }
                      }))}
                      style={{ margin: 0 }}
                    />
                    Share discoveries by default
                  </label>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white" }}>
                    <input 
                      type="checkbox" 
                      checked={userProfile.preferences.locationSharing}
                      onChange={(e) => setUserProfile(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, locationSharing: e.target.checked }
                      }))}
                      style={{ margin: 0 }}
                    />
                    Allow location sharing
                  </label>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white" }}>
                    <input 
                      type="checkbox" 
                      checked={userProfile.preferences.publicProfile}
                      onChange={(e) => setUserProfile(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, publicProfile: e.target.checked }
                      }))}
                      style={{ margin: 0 }}
                    />
                    Make profile public
                  </label>
                </div>
              </div>

              {/* Tips & Hints */}
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>💡</span>
                  <div style={{ fontWeight: "600", color: "white" }}>Tips & Hints</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white", fontSize: "0.875rem" }}>
                  <input
                    type="checkbox"
                    checked={tipsEnabled}
                    onChange={(e) => {
                      const next = e.target.checked
                      setTipsEnabled(next)
                      setHintsEnabled(next)
                    }}
                    style={{ margin: 0 }}
                  />
                  Show tips
                </label>
                <div style={{ fontSize: "0.8rem", opacity: 0.9, marginTop: "0.4rem", fontWeight: 700 }}>
                  Tips are {tipsEnabled ? "ON" : "OFF"}
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: "0.4rem", lineHeight: 1.25 }}>
                  Shows subtle guidance while editing photos and stickers, and when viewing shared postcards.
                </div>
                <button
                  type="button"
                  onClick={resetTips}
                  style={{
                    marginTop: "0.75rem",
                    width: "100%",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    color: "white",
                    fontWeight: 900,
                    padding: "0.85rem 1rem",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Reset tips
                </button>
              </div>

              <button
                onClick={handleNext}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginTop: "1rem"
                }}
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Debug Step (internal only) */}
        {showInternalTools && currentStep === "debug" && (
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <Bug className="w-8 h-8 text-white" />
              <div>
                <h1 style={{ fontSize: "1.5rem", margin: 0 }}>System Health & Debug</h1>
                <p style={{ fontSize: "0.9rem", opacity: 0.8, margin: 0 }}>
                  Monitor app performance and debug issues
                </p>
              </div>
            </div>

            {/* Quick Diagnostics Link */}
            <a
              href="/diagnostics"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                background: "rgba(59, 130, 246, 0.2)",
                border: "2px solid rgba(59, 130, 246, 0.4)",
                borderRadius: "1rem",
                padding: "1rem",
                marginBottom: "1rem",
                textDecoration: "none",
                color: "white",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)"
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)"
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)"
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                Run Full System Diagnostics
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                Test API connections and environment setup
              </div>
            </a>

            <div style={{ 
              background: "rgba(255,255,255,0.05)", 
              borderRadius: "1rem", 
              overflow: "hidden",
              maxHeight: "60vh"
            }}>
              <SystemHealthCheck />
            </div>

            <button
              onClick={handleNext}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
                fontWeight: "bold",
                marginTop: "1rem",
                width: "100%"
              }}
            >
              Continue to Complete
            </button>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === "complete" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Welcome to PINIT!</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              You&apos;re ready to start discovering and sharing amazing places.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              <button
                onClick={onComplete}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginTop: "1rem"
                }}
              >
                Start Using PINIT
              </button>
            </div>
          </div>
        )}

        {/* Email Login Step */}
        {currentStep === "email-login" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Sign In with Email</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Enter your email to create or sign in to your PINIT account.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              <input
                type="email"
                placeholder="Enter your email"
                style={{
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "1rem",
                  width: "100%"
                }}
              />
              
              <button
                onClick={() => {
                  // Mock email login
                  console.log("📧 Mock email login")
                  setUserProfile(prev => ({
                    ...prev,
                    name: "Email User",
                    email: "user@example.com",
                    avatar: "https://via.placeholder.com/150"
                  }))
                  setTimeout(() => setCurrentStep(showInternalTools ? "data" : "complete"), 650)
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  fontWeight: "bold"
                }}
              >
                Continue with Email
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
} 
