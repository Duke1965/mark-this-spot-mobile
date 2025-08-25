// ... existing code ...

        {/* Comment Box */}
        <div style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1rem",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <div style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
            💭 Add Your Comment
          </div>
          <textarea
            placeholder="Share your thoughts, memories, or tips about this place..."
            style={{
              width: "100%",
              minHeight: "80px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              color: "white",
              fontSize: "0.875rem",
              resize: "vertical"
            }}
            defaultValue={pin.userComment || ""}
            onChange={(e) => {
              // Update pin with user comment
              pin.userComment = e.target.value
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <Share2 size={16} />
            Share
          </button>
          
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <Save size={16} />
            Favorites
          </button>
        </div>

// ... existing code ...
