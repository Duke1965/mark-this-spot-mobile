"use client"

import { useState } from "react"
import { ArrowLeft, User, Settings, Palette, MapPin, Share2, LogOut, Mail, Lock } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface SettingsPageProps {
  onBack: () => void
  onComplete: () => void
}

export function SettingsPage({ onBack, onComplete }: SettingsPageProps) {
  const { user, loading, error, signInWithGoogle, signInWithFacebook, signOutUser } = useAuth()
  const [currentStep, setCurrentStep] = useState<"welcome" | "login" | "email-login" | "profile" | "social" | "location" | "theme" | "complete">("welcome")
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
      whatsapp: ""
    }
  })

  const handleNext = () => {
    console.log("🔄 handleNext called, current step:", currentStep)
    switch (currentStep) {
      case "welcome":
        console.log("📝 Moving from welcome to login")
        setCurrentStep("login")
        break
      case "login":
        if (user) {
          console.log("📝 Moving from login to profile")
          setCurrentStep("profile")
        }
        break
      case "profile":
        console.log("📝 Moving from profile to social")
        setCurrentStep("social")
        break
      case "social":
        console.log("📝 Moving from social to location")
        setCurrentStep("location")
        break
      case "location":
        console.log("📝 Moving from location to theme")
        setCurrentStep("theme")
        break
      case "theme":
        console.log("📝 Moving from theme to complete")
        setCurrentStep("complete")
        break
      case "complete":
        console.log("📝 Completing setup")
        onComplete()
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case "login":
        setCurrentStep("welcome")
        break
      case "profile":
        setCurrentStep("login")
        break
      case "social":
        setCurrentStep("profile")
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
      // Temporary mock login for testing
      console.log("🔐 Mock Google login - Firebase not configured yet")
      setUserProfile(prev => ({
        ...prev,
        name: "Test User",
        email: "test@example.com",
        avatar: "https://via.placeholder.com/150"
      }))
      // Auto-advance to next step on successful login
      setTimeout(() => setCurrentStep("profile"), 1000)
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  const handleFacebookLogin = async () => {
    try {
      // Temporary mock login for testing
      console.log("🔐 Mock Facebook login - Firebase not configured yet")
      setUserProfile(prev => ({
        ...prev,
        name: "Test User",
        email: "test@example.com",
        avatar: "https://via.placeholder.com/150"
      }))
      // Auto-advance to next step on successful login
      setTimeout(() => setCurrentStep("profile"), 1000)
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
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
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>PINIT Setup</span>
        </div>

        <div style={{ width: "40px" }}></div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
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

            {/* Success Message */}
            {user && (
              <div style={{
                background: "rgba(34,197,94,0.2)",
                border: "1px solid #22c55e",
                padding: "1rem",
                borderRadius: "0.5rem",
                marginTop: "1rem"
              }}>
                ✅ Welcome, {user.displayName || user.email}!
              </div>
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
                Continue to Social Setup
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
                Continue to Location
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
                Complete Setup
              </button>
            </div>
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
            {["login", "profile", "social", "location", "theme", "complete"].map((step, index) => (
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
