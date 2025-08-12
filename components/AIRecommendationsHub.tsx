"use client"

import React, { useState } from 'react'

export default function AIRecommendationsHub() {
  const [viewMode, setViewMode] = useState<"map" | "list" | "insights">("map")

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        paddingTop: '60px',
        textAlign: 'center',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'relative'
      }}>
        <button
          onClick={() => window.history.back()}
          style={{
            position: 'absolute',
            left: '20px',
            top: '60px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          🧠 AI Recommendations
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
          Personalized for you based on your behavior
        </p>
      </div>

      {/* View Mode Tabs */}
      <div style={{
        display: 'flex',
        padding: '0 20px',
        marginTop: '20px',
        gap: '10px'
      }}>
        {[
          { key: "map", label: "🗺️ Map", icon: "🗺️" },
          { key: "list", label: "📋 List", icon: "📋" },
          { key: "insights", label: "🧠 Insights", icon: "🧠" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key as any)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: viewMode === tab.key 
                ? 'rgba(255,255,255,0.2)' 
                : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        {viewMode === "map" && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
              <div>Map View - Coming Soon</div>
              <div style={{ 
                marginTop: '10px', 
                fontSize: '14px', 
                opacity: 0.7 
              }}>
                Basic component loaded successfully!
              </div>
            </div>
          </div>
        )}

        {viewMode === "list" && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
              <div>List View - Coming Soon</div>
              <div style={{ 
                marginTop: '10px', 
                fontSize: '14px', 
                opacity: 0.7 
              }}>
                Basic component loaded successfully!
              </div>
            </div>
          </div>
        )}

        {viewMode === "insights" && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧠</div>
              <div>Insights View - Coming Soon</div>
              <div style={{ 
                marginTop: '10px', 
                fontSize: '14px', 
                opacity: 0.7 
              }}>
                Basic component loaded successfully!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
