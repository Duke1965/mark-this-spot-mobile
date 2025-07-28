  if (currentScreen === "library") {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "white",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>📚 Pin Library</h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {pins.filter((p) => p.mediaUrl).length > 0 && (
              <button
                onClick={() => setCurrentScreen("story-builder")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#10B981",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                📖 Story
              </button>
            )}
            <button
              onClick={() => setCurrentScreen("map")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>
        </div>

        {/* Pins List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {pins.length === 0 ? (
            <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📍</div>
              <h2>No Pins Yet</h2>
              <p>Start pinning locations to build your collection!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    color: "white",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: "bold" }}>{pin.title}</h3>
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>📍 {pin.locationName}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                    {new Date(pin.timestamp).toLocaleDateString()} at {new Date(pin.timestamp).toLocaleTimeString()}
                  </p>
                  {pin.tags && (
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {pin.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "rgba(255,255,255,0.2)",
                            borderRadius: "0.25rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

->

  if (currentScreen === "library") {
    return (
      <PinLibrary
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={(pin) => {
          // Handle pin selection
          console.log("Pin selected:", pin)
        }}
        onPinUpdate={(pinId, updates) => {
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
