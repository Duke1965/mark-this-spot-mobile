"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, User, Settings, Palette, MapPin, Share2, LogOut, Mail, Lock, Bug, AlertTriangle, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import SystemHealthCheck from "./SystemHealthCheck"

interface SettingsPageProps {
  onBack: () => void
  onComplete: () => void
  isReturningUser: boolean
}

// Factory Reset Dialog Component
function FactoryResetDialog() {
  const { user } = useAuth()
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
    if (!confirmed || !resetConfirmed) return
    
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
  
  // FIX: Check if user is already authenticated and skip to complete step
  const [currentStep, setCurrentStep] = useState<"welcome" | "login" | "email-login" | "profile" | "social" | "location" | "theme" | "data" | "debug" | "complete" | "settings-menu">(
    isReturningUser ? "settings-menu" : (user ? "complete" : "welcome") // Returning users go to settings menu, authenticated users to complete, new users to welcome
  )
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    avatar: "",
    homeLocation: "",
    theme: "light" as "light" | "dark",
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

  const handleNext = () => {
    switch (currentStep) {
      case "welcome":
        // Mark welcome as seen immediately when user clicks "Get Started"
        localStorage.setItem('pinit-welcome-seen', 'true')
        setCurrentStep("login")
        break
      case "login":
        if (user) {
          setCurrentStep("profile")
        }
        break
      case "profile":
        if (isReturningUser) {
          // Returning users go back to settings menu
          setCurrentStep("settings-menu")
        } else {
          setCurrentStep("social")
        }
        break
      case "social":
        if (isReturningUser) {
          // Returning users go back to main app after saving social accounts
          onComplete()
        } else {
          setCurrentStep("location")
        }
        break
      case "location":
        setCurrentStep("theme")
        break
      case "theme":
        setCurrentStep("data")
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
      case "profile":
        if (isReturningUser) {
          setCurrentStep("settings-menu")
        } else {
          setCurrentStep("login")
        }
        break
      case "social":
        if (isReturningUser) {
          // Returning users go back to settings menu
          setCurrentStep("settings-menu")
        } else {
          setCurrentStep("profile")
        }
        break
      case "settings-menu":
        // Settings menu goes back to main app
        onBack()
        break
      case "location":
        setCurrentStep("social")
        break
      case "theme":
        setCurrentStep("location")
        break
      case "complete":
        setCurrentStep("theme")
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
        setTimeout(() => setCurrentStep("profile"), 1000)
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
        setTimeout(() => setCurrentStep("profile"), 1000)
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
              {/* Profile Settings */}
              <button
                onClick={() => setCurrentStep("profile")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
              >
                <User size={24} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600" }}>Profile & Account</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Name, email, avatar</div>
                </div>
              </button>

              {/* Social Media Settings */}
              <button
                onClick={() => setCurrentStep("social")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
              >
                <Share2 size={24} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600" }}>Social Media</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Instagram, Facebook, LinkedIn, etc.</div>
                </div>
              </button>

              {/* Location Settings */}
              <button
                onClick={() => setCurrentStep("location")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
              >
                <MapPin size={24} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600" }}>Location</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Home location preferences</div>
                </div>
              </button>

              {/* Theme Settings */}
              <button
                onClick={() => setCurrentStep("theme")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
              >
                <Palette size={24} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600" }}>Appearance</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Light/dark theme</div>
                </div>
              </button>

              {/* Privacy & Data Settings */}
              <button
                onClick={() => setCurrentStep("data")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
              >
                <Lock size={24} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600" }}>Privacy & Data</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Data management, privacy settings</div>
                </div>
              </button>

              {/* Debug Settings */}
              <button
                onClick={() => setCurrentStep("debug")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
              >
                <Bug size={24} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "600" }}>System & Debug</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>System health, debugging tools</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Welcome to PINIT!</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Let's set up your account to make the most of your travel discoveries.
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
                  You're already signed in to PINIT
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
                  
                  <button
                    onClick={signOutUser}
                    style={{
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#EF4444",
                      padding: "1rem 2rem",
                      borderRadius: "0.5rem",
                      border: "2px solid rgba(239, 68, 68, 0.3)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
                    }}
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              // User not logged in - show sign-in options
              <>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔐</div>
                <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Sign In to PINIT</h1>
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
                    {loading ? "⏳" : "🔍"} Continue with Google
                  </button>

                  <button
                    onClick={handleFacebookLogin}
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
                    {loading ? "⏳" : "📘"} Continue with Facebook
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
                </div>
              </>
            )}
          </div>
        )}

        {/* Profile Step */}
        {currentStep === "profile" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👤</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Complete Your Profile</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Let's set up your PINIT profile to personalize your experience.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              {/* Profile Avatar */}
              <div style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                margin: "0 auto 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem"
              }}>
                {userProfile.avatar ? (
                  <img 
                    src={userProfile.avatar} 
                    alt="Profile" 
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  "👤"
                )}
              </div>

              {/* Profile Info */}
              <div style={{ textAlign: "left", background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>Name</p>
                <p style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>
                  {userProfile.name || "Test User"}
                </p>
                
                <p style={{ margin: "1rem 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>Email</p>
                <p style={{ margin: 0, fontSize: "1rem" }}>
                  {userProfile.email || "user@example.com"}
                </p>
              </div>

              <button
                onClick={() => {
                  // Save profile for returning users
                  if (isReturningUser) {
                    localStorage.setItem('userProfile', JSON.stringify(userProfile))
                  }
                  handleNext()
                }}
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
                {isReturningUser ? "Save Changes" : "Continue to Social Setup"}
              </button>
            </div>
          </div>
        )}

        {/* Social Media Setup Step */}
        {currentStep === "social" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📱</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Connect Social Media</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Add your social media accounts to share your PINIT discoveries easily.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              {/* Instagram */}
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>📸</span>
                  <span style={{ fontWeight: "bold" }}>Instagram</span>
                </div>
                <input
                  type="text"
                  placeholder="@yourusername"
                  value={userProfile.socialAccounts.instagram}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    socialAccounts: { ...prev.socialAccounts, instagram: e.target.value }
                  }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              {/* X (Twitter) */}
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>𝕏</span>
                  <span style={{ fontWeight: "bold" }}>X (Twitter)</span>
                </div>
                <input
                  type="text"
                  placeholder="@yourusername"
                  value={userProfile.socialAccounts.twitter}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    socialAccounts: { ...prev.socialAccounts, twitter: e.target.value }
                  }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              {/* Facebook */}
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>👥</span>
                  <span style={{ fontWeight: "bold" }}>Facebook</span>
                </div>
                <input
                  type="text"
                  placeholder="facebook.com/yourprofile"
                  value={userProfile.socialAccounts.facebook}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    socialAccounts: { ...prev.socialAccounts, facebook: e.target.value }
                  }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              {/* LinkedIn */}
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>💼</span>
                  <span style={{ fontWeight: "bold" }}>LinkedIn</span>
                </div>
                <input
                  type="text"
                  placeholder="linkedin.com/in/yourprofile"
                  value={userProfile.socialAccounts.linkedin}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    socialAccounts: { ...prev.socialAccounts, linkedin: e.target.value }
                  }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              {/* WhatsApp */}
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>💬</span>
                  <span style={{ fontWeight: "bold" }}>WhatsApp</span>
                </div>
                <input
                  type="text"
                  placeholder="+27 123 456 7890"
                  value={userProfile.socialAccounts.whatsapp}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    socialAccounts: { ...prev.socialAccounts, whatsapp: e.target.value }
                  }))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontSize: "0.875rem"
                  }}
                />
              </div>

              <button
                onClick={() => {
                  // Save social accounts for returning users
                  if (isReturningUser) {
                    localStorage.setItem('userProfile', JSON.stringify(userProfile))
                  }
                  handleNext()
                }}
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
                {isReturningUser ? "Save Changes" : "Continue to Location"}
              </button>
            </div>
          </div>
        )}

        {/* Location Setup Step */}
        {currentStep === "location" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📍</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Set Your Home Location</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              This helps PINIT understand your area for better recommendations.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              <input
                type="text"
                placeholder="Enter your city or address"
                value={userProfile.homeLocation}
                onChange={(e) => setUserProfile(prev => ({
                  ...prev,
                  homeLocation: e.target.value
                }))}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "1rem"
                }}
              />

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
                Continue to Theme
              </button>
            </div>
          </div>
        )}

        {/* Theme Setup Step */}
        {currentStep === "theme" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎨</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Choose Your Theme</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Select your preferred appearance for PINIT.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              {/* Light Theme */}
              <button
                onClick={() => {
                  setUserProfile(prev => ({ ...prev, theme: "light" }))
                  setTimeout(handleNext, 500)
                }}
                style={{
                  background: userProfile.theme === "light" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>☀️</span>
                Light Mode
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => {
                  setUserProfile(prev => ({ ...prev, theme: "dark" }))
                  setTimeout(handleNext, 500)
                }}
                style={{
                  background: userProfile.theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>🌙</span>
                Dark Mode
              </button>

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
                Continue to Data Settings
              </button>
            </div>
          </div>
        )}

        {/* Data Management Step */}
        {currentStep === "data" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💾</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Data Management</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem" }}>
              Manage your PINIT data, backups, and privacy settings.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "350px", margin: "0 auto" }}>
              {/* Export Data */}
              <button
                onClick={() => {
                  console.log("📤 Exporting user data")
                  // This would integrate with usePinStorage exportPins function
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>📤</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "600" }}>Export My Data</div>
                    <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Download all pins & settings</div>
                  </div>
                </div>
              </button>

              {/* Create Backup */}
              <button
                onClick={() => {
                  console.log("📦 Creating data backup")
                  // This would integrate with usePinStorage createBackup function
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>💾</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "600" }}>Create Backup</div>
                    <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Safe copy of your data</div>
                  </div>
                </div>
              </button>

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

        {/* Debug Step */}
        {currentStep === "debug" && (
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
              Your profile is all set up. You're ready to start discovering and sharing amazing places!
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "0.5rem", textAlign: "left" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>Profile Summary</p>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>👤 {userProfile.name}</p>
                <p style={{ margin: "0.25rem 0", fontSize: "0.875rem" }}>📧 {userProfile.email}</p>
                <p style={{ margin: "0.25rem 0", fontSize: "0.875rem" }}>📍 {userProfile.homeLocation || "Not set"}</p>
                <p style={{ margin: "0.25rem 0", fontSize: "0.875rem" }}>🎨 {userProfile.theme} mode</p>
              </div>

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
                  setTimeout(() => setCurrentStep("profile"), 1000)
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

        {/* Progress Indicator */}
        {currentStep !== "welcome" && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
            gap: "0.5rem"
          }}>
            {["login", "profile", "social", "location", "theme", "data", "debug", "complete"].map((step, index) => (
              <div
                key={step}
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: currentStep === step ? "white" : "rgba(255,255,255,0.3)"
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 
