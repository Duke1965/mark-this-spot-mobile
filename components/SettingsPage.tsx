"use client"

import { useState } from "react"
import { ArrowLeft, User, Settings, Palette, MapPin, Share2, LogOut } from "lucide-react"

interface SettingsPageProps {
  onBack: () => void
  onComplete: () => void
}

export function SettingsPage({ onBack, onComplete }: SettingsPageProps) {
  const [currentStep, setCurrentStep] = useState<"welcome" | "login" | "profile" | "social" | "location" | "theme" | "complete">("welcome")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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
        setCurrentStep("profile")
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
