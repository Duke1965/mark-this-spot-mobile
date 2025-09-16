    
    if (!authLoading && !user) {
      console.log("🔐 No user, redirecting to settings")
      setCurrentScreen("settings")
    } else if (!authLoading && user) {
      console.log("🔐 User authenticated:", user.displayName)
      setCurrentScreen("map")
    }
  }, [user, authLoading])

  // Handle Android back button navigation - CORRECT IMPLEMENTATION
  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      event.preventDefault()
      
      // Navigation stack logic
      if (currentScreen === "map") {
        // If on main map, don't allow back (prevent app close)
        window.history.pushState(null, "", window.location.href)
        return
      }
      
      // Navigate back through screens
      const screenStack = [
        "map",           // Main screen
        "settings",      // Settings
        "camera",        // Camera
        "platform-select", // Platform selection
        "content-editor", // Content editor
        "story",         // Story mode
        "library",       // Library
        "story-builder", // Story builder
        "recommendations", // Recommendations
        "place-navigation", // Place navigation
        "results"        // Results
      ]
      
      const currentIndex = screenStack.indexOf(currentScreen)
      if (currentIndex > 0) {
        setCurrentScreen(screenStack[currentIndex - 1] as any)
      } else {
        setCurrentScreen("map")
      }
    }

    // Add history state to prevent immediate back
    window.history.pushState(null, "", window.location.href)
    
    // Listen for back button
    window.addEventListener('popstate', handleBackButton)
    
    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [currentScreen])

  // Screen rendering
  if (currentScreen === "camera") {
    return <ReliableCamera mode={cameraMode} onCapture={handleCameraCapture} onClose={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "platform-select" && capturedMedia) {
    return (
      <SocialPlatformSelector
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        onPlatformSelect={handlePlatformSelect}
        onBack={() => setCurrentScreen("map")}
      />
    )
  }

  if (currentScreen === "content-editor" && capturedMedia && selectedPlatform) {
    return (
      <ContentEditor
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        platform={selectedPlatform}
        onBack={() => setCurrentScreen("platform-select")}
        onPost={(contentData) => {
          // Prevent multiple rapid clicks
          if (isPosting) return
          setIsPosting(true)
          
          // Store the final image data for the recommendation popup
          setFinalImageData(contentData)
          
          // Handle posting with content data
          setSuccessMessage(`Posted to ${selectedPlatform} successfully!`)
          setShowRecommendationPopup(true) // Show recommendation popup instead of success popup
          
          // Check if this is a PINIT pin (has personalThoughts) and show recommendation form
          if (capturedMedia.personalThoughts) {
            // Show recommendation form after success message for PINIT pins
          setTimeout(() => {
            setShowRecommendationPopup(false)
            setRecommendationData({
              mediaUrl: contentData.finalImageUrl || capturedMedia.url, // Use rendered image if available
                locationName: capturedMedia.location || capturedMedia.title || "PINIT Location",
              platform: selectedPlatform,
              aiTitle: capturedMedia.title,
              aiDescription: capturedMedia.description,
              aiTags: capturedMedia.tags,
              personalThoughts: capturedMedia.personalThoughts,
              pinId: capturedMedia.id,
              latitude: capturedMedia.latitude,
              longitude: capturedMedia.longitude,
              additionalPhotos: capturedMedia.additionalPhotos
            })
            setShowRecommendationForm(true)
          }, 2000)
          } else {
            // Regular photo - just return to map
          setTimeout(() => {
            setCurrentScreen("map")
            setIsPosting(false)
          }, 2000)
          }
        }}
        onSave={(contentData) => {
          // Handle saving with content data
          setSuccessMessage("Saved to library successfully!")
          setShowSuccessPopup(true)
          setTimeout(() => setShowSuccessPopup(false), 2000)
          setCurrentScreen("map")
        }}
      />
    )
  }

  if (currentScreen === "editor" && capturedMedia) {
    // Redirect to social platform selector instead of photo editor
    setCurrentScreen("platform-select")
    return null
  }



  if (currentScreen === "story") {
    return <PinStoryMode pins={pins} onBack={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "story-builder") {
    return (
      <PinStoryBuilder
        pins={pins}
        onBack={() => setCurrentScreen("library")}
        onCreateStory={(selectedPins, storyTitle) => {
          console.log("Story created:", storyTitle, selectedPins)
          setCurrentScreen("library")
          setLastActivity("story-created")
        }}
      />
    )
  }

  // NEW RECOMMENDATIONS HUB SCREEN
  if (currentScreen === "recommendations") {
    console.log("🧠 Opening AI-Powered Recommendations Hub")
    console.log("🧠 - AI brain is learning from user behavior")
    console.log("🧠 - Generating personalized recommendations")
    
        return (
      <AIRecommendationsHub
        onBack={() => setCurrentScreen("map")} 
        userLocation={location}
          // NEW: Pass recommendations to the component (convert to expected format)
  initialRecommendations={recommendations.map(rec => ({
    id: rec.id,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    location: {
      lat: location?.latitude || -33.9,
      lng: location?.longitude || 18.4
    },
    rating: 4.0 + Math.random() * 1.0, // Generate random rating
    isAISuggestion: rec.isAISuggestion || false,
    confidence: 0.7 + Math.random() * 0.3, // Generate confidence
    reason: rec.description,
    timestamp: new Date(rec.timestamp)
  }))}
      />
    )
  }

  // NEW PLACE NAVIGATION SCREEN
  if (currentScreen === "place-navigation" && selectedPlace) {
    return (
      <PlaceNavigation
        place={selectedPlace}
        userLocation={userLocation}
        onBack={() => setCurrentScreen("recommendations")}
        onSaveForLater={handleSaveForLater}
        onNavigate={handleStartNavigation}
        onArrived={handleArrival}
      />
    )
  }

  if (currentScreen === "results" && currentResultPin) {
    return (
      <PinResults
        pin={currentResultPin}
        onSave={handleSaveFromResults}
        onShare={handleShareFromResults}
        onBack={handleBackFromResults}
      />
    )
  }

  if (currentScreen === "library") {
    return (
      <PinLibrary
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={(pin: PinData) => {
          // Handle pin selection
          console.log("Pin selected:", pin)
        }}
        onPinUpdate={(pinId: string, updates: any) => {
          // Handle pin updates
          const updatedPins = pins.map(pin => 
            pin.id === pinId ? { ...pin, ...updates } : pin
          )
          // Update pins state here if needed
          console.log("Pin updated:", pinId, updates)
        }}
      />
    )
  }

  if (currentScreen === "settings") {
    return (
      <SettingsPage
        onBack={() => setCurrentScreen("map")}
        onComplete={() => setCurrentScreen("map")}
      />
    )
  }

  // Main map screen (Shazam-like interface) - ENHANCED WITH SUBTLE NOTIFICATIONS

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
        padding: "2rem",
      }}
    >
      {/* Success Popup */}
      {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(30, 58, 138, 0.95)",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.2)",
            zIndex: 1000,
            textAlign: "center",
            minWidth: "250px",
            backdropFilter: "blur(15px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <div style={{ 
            fontSize: "1.125rem", 
            fontWeight: "600", 
            color: "#10B981",
            marginBottom: "0.5rem"
          }}>
            {successMessage}
          </div>
          <div style={{ 
            fontSize: "0.875rem", 
            opacity: 0.8 
          }}>
            Your content has been processed successfully
          </div>
        </div>
      )}
      
      {/* Recommendation Popup */}
      {showRecommendationPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "2rem" }}>✅</div>
          <h3 style={{ 
            color: "white", 
            marginBottom: "1rem", 
            fontSize: "1.5rem",
            fontWeight: "bold",
            textAlign: "center"
          }}>
            {successMessage}
          </h3>
          <p style={{ 
            color: "rgba(255,255,255,0.9)", 
            marginBottom: "3rem", 
            fontSize: "1.1rem",
            textAlign: "center",
            maxWidth: "300px"
          }}>
            Would you like to recommend this place?
          </p>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", width: "100%", maxWidth: "300px" }}>
            <button
              onClick={() => {
                setShowRecommendationPopup(false)
                setShowSuccessPopup(true)
                setTimeout(() => setShowSuccessPopup(false), 2000)
              }}
              style={{
                flex: 1,
                padding: "1rem 1.5rem",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              No, Thanks
            </button>
            <button
              onClick={() => {
                setShowRecommendationPopup(false)
                setRecommendationData({
                  mediaUrl: finalImageData?.finalImageUrl || capturedMedia?.url || "",
                  locationName: capturedMedia?.location || capturedMedia?.title || "PINIT Location",
                  platform: selectedPlatform,
                  aiTitle: capturedMedia?.title,
                  aiDescription: capturedMedia?.description,
                  aiTags: capturedMedia?.tags,
                  personalThoughts: capturedMedia?.personalThoughts,
                  pinId: capturedMedia?.id,
                  latitude: capturedMedia?.latitude,
                  longitude: capturedMedia?.longitude,
                  additionalPhotos: capturedMedia?.additionalPhotos
                })
                setShowRecommendationForm(true) // ADDED BACK: Show the recommendations form
              }}
              style={{
                flex: 1,
                padding: "1rem 1.5rem",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              Yes, Recommend
            </button>
          </div>
        </div>
      )}
      
      {/* Recommendation Form */}
      {showRecommendationForm && recommendationData && (
        <RecommendationForm
          mediaUrl={recommendationData.mediaUrl}
          locationName={recommendationData.locationName}
          onRecommend={handleRecommendationSubmit}
          onSkip={handleRecommendationSkip}
        />
      )}
      
      {/* SUBTLE PROACTIVE AI NOTIFICATIONS - WhatsApp Style with DARK BLUE */}
      <ProactiveAI
        userLocation={userLocation}
        pins={pins}
        isMoving={motionData.isMoving}
        lastActivity={lastActivity}
        onSuggestionAction={handleProactiveSuggestion}
        onRecommendationGenerated={handleAIRecommendations}
        onNotificationTap={handleNotificationTap}
      />



      {/* Enhanced Location Service - Hidden but working */}
      {location && (
        <EnhancedLocationService
          latitude={location.latitude}
          longitude={location.longitude}
          onLocationEnhanced={setLocationDetails}
        />
      )}

      {/* Discovery Mode Toggle - Top Right */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
          display: "flex",
          gap: "0.5rem"
        }}
      >
        {/* Settings Button */}
        <button
          onClick={() => setCurrentScreen("settings")}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          ⚙️
        </button>
      </div>



      {/* Motion Status Indicator (Hidden - functionality still works in background) */}
      {/* {motionData.isMoving && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            background: "rgba(16,185,129,0.8)",
            padding: "0.5rem 1rem",
            borderRadius: "1rem",
            fontSize: "0.75rem",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          🚶‍♂️ Moving ({motionData.speed.toFixed(1)} km/h)
        </div>
      )} */}

      {/* SHAZAM-STYLE CIRCLE - MOVED TO TOP THIRD & PULSATING */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        {/* Multiple Pulsing Glow Rings - ENHANCED VISIBILITY */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,0.2) 35%, transparent 50%)",
            animation: "shazamPulse 1.2s ease-out infinite",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 15%, rgba(255,255,255,0.2) 35%, transparent 50%)",
            animation: "shazamPulse 1.2s ease-out infinite 0.4s",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 15%, rgba(255,255,255,0.1) 35%, transparent 50%)",
            animation: "shazamPulse 1.2s ease-out infinite 0.8s",
            zIndex: 1,
          }}
        />

        {/* Main Pin Button with LIVE GOOGLE MAPS */}
        <button
          onClick={handleQuickPin}
          disabled={isQuickPinning}
          style={{
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            border: motionData.isMoving && motionData.speed > 5 ? "4px solid #22C55E" : "4px solid rgba(255,255,255,0.95)",
            background: "rgba(255,255,255,0.05)",
            cursor: isQuickPinning ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: motionData.isMoving && motionData.speed > 5 ? "0 8px 32px rgba(34, 197, 94, 0.4)" : "0 8px 32px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "white",
            fontSize: "1.125rem",
            fontWeight: "bold",
            opacity: isQuickPinning ? 0.7 : 1,
            position: "relative",
            zIndex: 2,
            overflow: "hidden",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "scale(1.05)"
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"
            }
          }}
          onMouseLeave={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = motionData.isMoving && motionData.speed > 5 ? "0 8px 32px rgba(34, 197, 94, 0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
            }
          }}
        >
          {/* LIVE GOOGLE MAPS BACKGROUND - WORKING VERSION */}
          {(userLocation || location) && (
            <div
              style={{
                position: "absolute",
                inset: "4px",
                borderRadius: "50%",
                overflow: "hidden",
                zIndex: 1,
                background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
              }}
            >
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${
                  userLocation?.latitude || location?.latitude || -25.7479
                },${
                  userLocation?.longitude || location?.longitude || 28.2293
                }&zoom=16&size=280x280&maptype=satellite&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}`}
                alt="Live Map"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.1) saturate(1.2)",
                }}
                onLoad={(e) => {
                  console.log("Map loaded successfully")
                }}
                onError={(e) => {
                  console.log("Google Maps failed, trying alternative...")
                  // Try OpenStreetMap tile service as fallback
                  e.currentTarget.src = `https://tile.openstreetmap.org/16/${Math.floor(
                    (((userLocation?.longitude || location?.longitude || 28.2293) + 180) / 360) * Math.pow(2, 16),
                  )}/${Math.floor(
                    ((1 -
                      Math.log(
                        Math.tan(((userLocation?.latitude || location?.latitude || -25.7479) * Math.PI) / 180) +
                          1 / Math.cos(((userLocation?.latitude || location?.latitude || -25.7479) * Math.PI) / 180),
                      ) /
                        Math.PI) /
                      2) *
                      Math.pow(2, 16),
                  )}.png`

                  // If that also fails, show a nice gradient background
                  setTimeout(() => {
                    if (e.currentTarget.complete && e.currentTarget.naturalHeight === 0) {
                      e.currentTarget.style.display = "none"
                    }
                  }, 2000)
                }}
              />

                          {/* Speed-based pinning indicator */}
            {motionData.isMoving && motionData.speed > 5 && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(34, 197, 94, 0.9)",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  zIndex: 3,
                  whiteSpace: "nowrap"
                }}
              >
                🚗 Speed Pinning Active
              </div>
            )}

            {/* Minimal location overlay - positioned at top */}
            <div
              style={{
                position: "absolute",
                  top: "10%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "white",
                  fontSize: "0.6rem",
                  fontWeight: "bold",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "0.2rem",
                  pointerEvents: "none",
                }}
              >
                📍 Live
              </div>
            </div>
          )}

          {/* Content Overlay - REMOVED DARK BACKGROUND */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isQuickPinning ? (
              <>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid rgba(255,255,255,0.3)",
                    borderTop: "4px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "0.5rem",
                  }}
                />
                <span
                  style={{
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  Pinning...
                </span>
              </>
            ) : quickPinSuccess ? (
              <>
                <Check size={48} style={{ marginBottom: "0.5rem", color: "#10B981" }} />
                <span
                  style={{
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  Pinned!
                </span>
              </>
            ) : (
              <>
                <MapPin
                  size={48}
                  style={{ marginBottom: "0.5rem", color: "white", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
                />
                <span
                  style={{
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  Tap to PINIT!
                </span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* PINIT Branding - Moved to center */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "3rem",
            fontWeight: "bold",
            color: "white",
            textShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          PINIT
        </h1>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "1.1rem",
            opacity: 0.95,
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
            fontWeight: "500",
          }}
        >
          Find It. Pin It. Share It.
        </p>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            opacity: 0.95,
            fontSize: "1rem",
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          📍 {locationName}
        </p>
      </div>

      {/* ENHANCED: Real Google Places Discovery Panel */}
      {showNearbyPins && (
        <div
          style={{
            position: "absolute",
            bottom: "8rem",
            left: "1rem",
            right: "1rem",
            background: "rgba(30, 58, 138, 0.95)",
            borderRadius: "1rem",
            padding: "1rem",
            backdropFilter: "blur(15px)",
            maxHeight: "200px",
            overflowY: "auto",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold", color: "white" }}>
              🌐 Real Places Nearby {isLoadingPlaces && "⏳"}
            </h3>
            <button
              onClick={() => setShowNearbyPins(false)}
              style={{
                padding: "0.5rem",
                background: "rgba(255,255,255,0.15)",
                color: "white",
                cursor: "pointer",
                borderRadius: "0.5rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
            {nearbyPins.map((pin) => (
              <div
                key={pin.id}
                style={{
                  minWidth: "160px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                  color: "white",
                  cursor: "pointer",
                  border: pin.googlePlaceId ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.15)",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(10px)",
                }}
                onClick={() => {
                  // Add to user's pins
                  addPin({ ...pin, id: Date.now().toString() })
                  setShowNearbyPins(false)
                }}
              >
                {pin.mediaUrl && (
                  <img
                    src={pin.mediaUrl || "/placeholder.svg"}
                    alt={pin.title}
                    style={{
                      width: "100%",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "0.25rem",
                      marginBottom: "0.5rem",
                    }}
                  />
                )}
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.75rem", fontWeight: "bold" }}>{pin.title}</h4>
                <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.625rem", opacity: 0.8 }}>{pin.description}</p>
                {pin.rating && (
                  <div style={{ fontSize: "0.625rem", color: "#F59E0B", marginBottom: "0.25rem" }}>
                    {"⭐".repeat(Math.floor(pin.rating))} {pin.rating}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {pin.googlePlaceId && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        background: "rgba(255,255,255,0.2)",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      🌐 Google
                    </span>
                  )}
                  {pin.isRecommended && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        background: "rgba(255,255,255,0.2)",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      ⭐ Top
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

              {/* Bottom Navigation - Photo/Video/Library/AI-Powered Recommendations */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "2rem",
          right: "2rem",
          display: "flex",
          justifyContent: "space-around",
          padding: "1.5rem",
        }}
      >
        <button
          onClick={() => {
            setCameraMode("photo")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Camera size={28} />
        </button>

        <button
          onClick={() => {
            setCameraMode("video")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Video size={28} />
        </button>

        <button
          onClick={openLibrary}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Library size={28} style={{ color: "white" }} />
          {/* Pin Count Badge */}
          {newPins > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "bold",
                border: "2px solid white",
              }}
            >
              {newPins}
            </div>
          )}
        </button>

        <button
          onClick={() => setCurrentScreen("recommendations")}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          title="🧠 AI-Powered Recommendations"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Star size={28} style={{ color: "white" }} />
          {/* Notification Badge */}
          {recommendations.filter((r) => !r.isCompleted).length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "bold",
                border: "2px solid white",
              }}
            >
              {recommendations.filter((r) => !r.isCompleted).length}
            </div>
          )}
        </button>
      </div>



      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shazamPulse {
          0% { 
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 1;
          }
          20% { 
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 0.9;
          }
          40% { 
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0.7;
          }
          60% { 
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0.4;
          }
          80% { 
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0.2;
          }
          100% { 
            transform: translate(-50%, -50%) scale(3.5);
            opacity: 0;
          }
        }

        @keyframes mapShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Helper function for platform dimensions
function getPlatformDimensions(platform: string) {
  const dimensions = {
    "instagram-story": { width: 1080, height: 1920 },
    "instagram-post": { width: 1080, height: 1080 },
    "facebook-post": { width: 1200, height: 630 },
            "x-post": { width: 1200, height: 675 },
    "linkedin-post": { width: 1200, height: 627 },
    tiktok: { width: 1080, height: 1920 },
    snapchat: { width: 1080, height: 1920 },
    whatsapp: { width: 1080, height: 1080 },
  }

  return dimensions[platform as keyof typeof dimensions] || { width: 1080, height: 1080 }
}
