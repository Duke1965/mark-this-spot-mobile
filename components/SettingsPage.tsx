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
  const [currentStep, setCurrentStep] = useState<"welcome" | "login" | "profile" | "social" | "location" | "theme" | "complete">("welcome")
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
    switch (currentStep) {
      case "welcome":
        setCurrentStep("login")
        break
      case "login":
        if (user) {
          setCurrentStep("profile")
        }
        break
      case "profile":
        setCurrentStep("social")
        break
      case "social":
        setCurrentStep("location")
        break
      case "location":
        setCurrentStep("theme")
        break
      case "theme":
        setCurrentStep("complete")
        break
      case "complete":
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
      await signInWithGoogle()
      // Auto-advance to next step on successful login
      setTimeout(() => setCurrentStep("profile"), 1000)
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook()
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
