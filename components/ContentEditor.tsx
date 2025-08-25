"use client"

import { useState } from "react"
import { ArrowLeft, Save, Share2 } from "lucide-react"

interface ContentEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  platform: string
  onBack: () => void
  onPost: (contentData: any) => void
  onSave: (contentData: any) => void
}

interface Sticker {
  id: string
  emoji: string // This will store the image URL
  name: string
  x: number
  y: number
  scale: number
  rotation: number
}

interface DraggableStickerProps {
  sticker: Sticker
  onUpdate: (updates: Partial<Sticker>) => void
  onRemove: () => void
  isActive?: boolean
  stickersLocked?: boolean
}

function DraggableSticker({ sticker, onUpdate, onRemove, isActive = true, stickersLocked = false }: DraggableStickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [initialDistance, setInitialDistance] = useState(0)
  const [initialScale, setInitialScale] = useState(1)
  const [initialRotation, setInitialRotation] = useState(0)

  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getAngle = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    return Math.atan2(dy, dx) * 180 / Math.PI
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return // Disable interactions when not active
    e.preventDefault()
    
    if (e.touches.length === 1) {
      // Single finger - drag
      const touch = e.touches[0]
      // Find the photo container using the data attribute
      const photoContainer = e.currentTarget.closest('[data-photo-container="true"]')
      const rect = photoContainer?.getBoundingClientRect()
      if (rect) {
        // Convert touch position to percentage relative to photo container
        const touchX = ((touch.clientX - rect.left) / rect.width) * 100
        const touchY = ((touch.clientY - rect.top) / rect.height) * 100
        setStartPos({ x: touchX - sticker.x, y: touchY - sticker.y })
      }
      setIsDragging(true)
    } else if (e.touches.length === 2) {
      // Two fingers - scale and rotate
      setInitialDistance(getDistance(e.touches))
      setInitialScale(sticker.scale)
      setInitialRotation(sticker.rotation)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 1 && isDragging) {
      // Single finger drag
      const touch = e.touches[0]
      // Find the photo container using the data attribute
      const photoContainer = e.currentTarget.closest('[data-photo-container="true"]')
      const rect = photoContainer?.getBoundingClientRect()
      if (rect) {
        // Convert touch position to percentage relative to photo container
        const touchX = ((touch.clientX - rect.left) / rect.width) * 100
        const touchY = ((touch.clientY - rect.top) / rect.height) * 100
        
        // Calculate new position as percentage
        const newX = Math.max(0, Math.min(100, touchX - startPos.x))
        const newY = Math.max(0, Math.min(100, touchY - startPos.y))
        
        console.log("🎯 Touch position update:", { 
          touchX, 
          touchY, 
          startPos, 
          newX, 
          newY, 
          rect: { width: rect.width, height: rect.height }
        })
        
        onUpdate({
          x: newX,
          y: newY
        })
      }
    } else if (e.touches.length === 2) {
      // Two finger scale and rotate simultaneously
      const currentDistance = getDistance(e.touches)
      const currentAngle = getAngle(e.touches)
      
      if (initialDistance > 0) {
        // Calculate scale
        const scaleChange = currentDistance / initialDistance
        const newScale = Math.max(0.5, Math.min(3, initialScale * scaleChange))
        
        // Calculate rotation (simplified for better performance)
        const angleDiff = currentAngle - getAngle(e.touches)
        const newRotation = initialRotation + angleDiff
        
        onUpdate({
          scale: newScale,
          rotation: newRotation
        })
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setInitialDistance(0)
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${sticker.x}%`, // Use percentage positioning to match stored values
        top: `${sticker.y}%`, // Use percentage positioning to match stored values
        transform: `translate(-50%, -50%)`, // Only center the sticker, no scale/rotation here
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
        fontSize: "96px",
        zIndex: isDragging ? 1000 : 1,
        padding: "20px", // Bigger touch area around sticker
        margin: "-20px", // Compensate for padding so sticker position stays the same
        // Ensure consistent sizing
        width: "96px",
        height: "96px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sticker Image with Scale and Rotation */}
      <img
        src={sticker.emoji}
        alt={sticker.name}
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`, // Apply scale and rotation to the image itself
          transformOrigin: "center center", // Ensure transformations happen from center
          pointerEvents: "none", // Prevent image from interfering with touch events
        }}
      />
      
      {/* X button for removal - Only show when not locked */}
      {!stickersLocked && (
        <button
          onClick={onRemove}
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "rgba(255, 0, 0, 0.8)",
            border: "2px solid white",
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
          }}
        >
          ×
        </button>
      )}
      
      {/* Draggable rotate handle - Only show when not locked */}
      {!stickersLocked && (
        <div
          onTouchStart={(e) => {
            e.stopPropagation()
            const touch = e.touches[0]
            const rect = e.currentTarget.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * 180 / Math.PI
            onUpdate({ rotation: angle })
          }}
          onTouchMove={(e) => {
            e.stopPropagation()
            const touch = e.touches[0]
            const rect = e.currentTarget.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * 180 / Math.PI
            onUpdate({ rotation: angle })
          }}
          style={{
            position: "absolute",
            top: "-10px",
            left: "-10px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "rgba(0, 0, 255, 0.8)",
            border: "2px solid white",
            color: "white",
            fontSize: "12px",
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            userSelect: "none",
            touchAction: "none",
          }}
        >
          🔄
        </div>
      )}
      
    </div>
  )
}

export function ContentEditor({ mediaUrl, mediaType, platform, onBack, onPost, onSave }: ContentEditorProps) {
  // Available stickers (matching exact GitHub file names)
  const availableStickers = [
    // Old School stickers
    { id: "old-1", imageUrl: "/stickers/Old-school-Chillin.png", name: "Chillin", category: "old-school" },
    { id: "old-2", imageUrl: "/stickers/Old-school-Dreamy.png", name: "Dreamy", category: "old-school" },
    { id: "old-3", imageUrl: "/stickers/Old-school-Exploring-2.png", name: "Exploring 2", category: "old-school" },
    { id: "old-4", imageUrl: "/stickers/Old-school-Found-Paradise.png", name: "Found Paradise", category: "old-school" },
    { id: "old-5", imageUrl: "/stickers/Old-school-Golden-Hour-2.png", name: "Golden Hour 2", category: "old-school" },
    { id: "old-6", imageUrl: "/stickers/Old-school-Good-Times.png", name: "Good Times", category: "old-school" },
    { id: "old-7", imageUrl: "/stickers/Old-school-Jet-Lagged.png", name: "Jet Lagged", category: "old-school" },
    { id: "old-8", imageUrl: "/stickers/Old-school-Just-Us-2.png", name: "Just Us 2", category: "old-school" },
    { id: "old-9", imageUrl: "/stickers/Old-school-Just-Us-3.png", name: "Just Us 3", category: "old-school" },
    { id: "old-10", imageUrl: "/stickers/Old-school-Just-Us.png", name: "Just Us", category: "old-school" },
    { id: "old-11", imageUrl: "/stickers/Old-school-Love-This.png", name: "Love This", category: "old-school" },
    { id: "old-12", imageUrl: "/stickers/Old-school-Mood-Magic.png", name: "Mood Magic", category: "old-school" },
    { id: "old-13", imageUrl: "/stickers/Old-school-My-Happy-Place-2.png", name: "My Happy Place 2", category: "old-school" },
    { id: "old-14", imageUrl: "/stickers/Old-school-No-Filter.png", name: "No Filter", category: "old-school" },
    { id: "old-15", imageUrl: "/stickers/Old-school-OMG.png", name: "OMG", category: "old-school" },
    { id: "old-16", imageUrl: "/stickers/Old-school-On-The-Road-Again.png", name: "On The Road Again", category: "old-school" },
    { id: "old-17", imageUrl: "/stickers/Old-school-PINITI.png", name: "PINITI", category: "old-school" },
    { id: "old-18", imageUrl: "/stickers/Old-school-Pure-Joy.png", name: "Pure Joy", category: "old-school" },
    { id: "old-19", imageUrl: "/stickers/Old-school-Road-Trip.png", name: "Road Trip", category: "old-school" },
    { id: "old-20", imageUrl: "/stickers/Old-school-Soul-Mates.png", name: "Soul Mates", category: "old-school" },
    { id: "old-21", imageUrl: "/stickers/Old-school-Sunset-Funday.png", name: "Sunset Funday", category: "old-school" },
    { id: "old-22", imageUrl: "/stickers/Old-school-Sunset-Vibes.png", name: "Sunset Vibes", category: "old-school" },
    { id: "old-23", imageUrl: "/stickers/Old-school-Sweet-Moment.png", name: "Sweet Moment", category: "old-school" },
    { id: "old-24", imageUrl: "/stickers/Old-school-Swoon.png", name: "Swoon", category: "old-school" },
    { id: "old-25", imageUrl: "/stickers/Old-school-Together.png", name: "Together", category: "old-school" },
    { id: "old-26", imageUrl: "/stickers/Old-school-Too-Cool.png", name: "Too Cool", category: "old-school" },
    { id: "old-27", imageUrl: "/stickers/Old-school-WOW-2.png", name: "WOW 2", category: "old-school" },
    { id: "old-28", imageUrl: "/stickers/Old-school-WOW-3.png", name: "WOW 3", category: "old-school" },
    { id: "old-29", imageUrl: "/stickers/Old-school-Wander-Lust.png", name: "Wander Lust", category: "old-school" },
    { id: "old-30", imageUrl: "/stickers/Old-school-Weekend-Mode.png", name: "Weekend Mode", category: "old-school" },
    { id: "old-31", imageUrl: "/stickers/Old-school-YASSS.png", name: "YASSS", category: "old-school" },
    
    // New stickers
    { id: "new-1", imageUrl: "/stickers/new-Adventure-Time.png", name: "Adventure Time", category: "new" },
    { id: "new-2", imageUrl: "/stickers/new-Cuties.png", name: "Cuties", category: "new" },
    { id: "new-3", imageUrl: "/stickers/new-Day-Trip.png", name: "Day Trip", category: "new" },
    { id: "new-4", imageUrl: "/stickers/new-Dream-Destination.png", name: "Dream Destination", category: "new" },
    { id: "new-5", imageUrl: "/stickers/new-Dreamy-2.png", name: "Dreamy 2", category: "new" },
    { id: "new-6", imageUrl: "/stickers/new-Exploring-3.png", name: "Exploring 3", category: "new" },
    { id: "new-7", imageUrl: "/stickers/new-Exploring.png", name: "Exploring", category: "new" },
    { id: "new-8", imageUrl: "/stickers/new-Get-Outside.png", name: "Get Outside", category: "new" },
    { id: "new-9", imageUrl: "/stickers/new-Getaway.png", name: "Getaway", category: "new" },
    { id: "new-10", imageUrl: "/stickers/new-Golden-Hour-2.png", name: "Golden Hour 2", category: "new" },
    { id: "new-11", imageUrl: "/stickers/new-Golden-Hour.png", name: "Golden Hour", category: "new" },
    { id: "new-12", imageUrl: "/stickers/new-Good-Times-2.png", name: "Good Times 2", category: "new" },
    { id: "new-13", imageUrl: "/stickers/new-Here-We-Go.png", name: "Here We Go", category: "new" },
    { id: "new-14", imageUrl: "/stickers/new-HoneyMoon-Mode.png", name: "HoneyMoon Mode", category: "new" },
    { id: "new-15", imageUrl: "/stickers/new-Legendary-Vaycay.png", name: "Legendary Vaycay", category: "new" },
    { id: "new-16", imageUrl: "/stickers/new-Lost-Again.png", name: "Lost Again", category: "new" },
    { id: "new-17", imageUrl: "/stickers/new-Love-In-The-Air.png", name: "Love In The Air", category: "new" },
    { id: "new-18", imageUrl: "/stickers/new-Love-This-2.png", name: "Love This 2", category: "new" },
    { id: "new-19", imageUrl: "/stickers/new-Making-Memories.png", name: "Making Memories", category: "new" },
    { id: "new-20", imageUrl: "/stickers/new-Memories.png", name: "Memories", category: "new" },
    { id: "new-21", imageUrl: "/stickers/new-My-Happy-Place.png", name: "My Happy Place", category: "new" },
    { id: "new-22", imageUrl: "/stickers/new-Next-Stop-2.png", name: "Next Stop 2", category: "new" },
    { id: "new-23", imageUrl: "/stickers/new-Next-Stop-Paris.png", name: "Next Stop Paris", category: "new" },
    { id: "new-24", imageUrl: "/stickers/new-On-The-Road-2.png", name: "On The Road 2", category: "new" },
    { id: "new-25", imageUrl: "/stickers/new-On-The-Road.png", name: "On The Road", category: "new" },
    { id: "new-26", imageUrl: "/stickers/new-Picture-Perfect.png", name: "Picture Perfect", category: "new" },
    { id: "new-27", imageUrl: "/stickers/new-Postcard.png", name: "Postcard", category: "new" },
    { id: "new-28", imageUrl: "/stickers/new-Send-Help.png", name: "Send Help", category: "new" },
    { id: "new-29", imageUrl: "/stickers/new-SnapShot.png", name: "SnapShot", category: "new" },
    { id: "new-30", imageUrl: "/stickers/new-So-Blessed.png", name: "So Blessed", category: "new" },
    { id: "new-31", imageUrl: "/stickers/new-Too-many-snacks.png", name: "Too many snacks", category: "new" },
    { id: "new-32", imageUrl: "/stickers/new-Travel-Squad.png", name: "Travel Squad", category: "new" },
    { id: "new-33", imageUrl: "/stickers/new-Travel-Vibes-2.png", name: "Travel Vibes 2", category: "new" },
    { id: "new-34", imageUrl: "/stickers/new-Travel-Vibes.png", name: "Travel Vibes", category: "new" },
    { id: "new-35", imageUrl: "/stickers/new-Unforgetable.png", name: "Unforgetable", category: "new" },
    { id: "new-36", imageUrl: "/stickers/new-Vacay-Mode.png", name: "Vacay Mode", category: "new" },
    { id: "new-37", imageUrl: "/stickers/new-WOW-4.png", name: "WOW 4", category: "new" },
    { id: "new-38", imageUrl: "/stickers/new-WOW.png", name: "WOW", category: "new" },
    { id: "new-39", imageUrl: "/stickers/new-Wanderlust-2.png", name: "Wanderlust 2", category: "new" },
    { id: "new-40", imageUrl: "/stickers/new-Wish-You-Were-Here-2.png", name: "Wish You Were Here 2", category: "new" },
    { id: "new-41", imageUrl: "/stickers/new-Wish-You-Were-Here.png", name: "Wish You Were Here", category: "new" },
    { id: "new-42", imageUrl: "/stickers/new-YASS!.png", name: "YASS!", category: "new" },
    { id: "new-43", imageUrl: "/stickers/new-Yummy.png", name: "Yummy", category: "new" },
  ]

  const [stickerCategory, setStickerCategory] = useState<"old-school" | "new">("old-school")
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [photoMode, setPhotoMode] = useState<"locked" | "sticker-selection">("sticker-selection") // Start with sticker selection open
  const [isRendering, setIsRendering] = useState(false) // Loading state for rendering
  const [stickersLocked, setStickersLocked] = useState(false) // Track if stickers are locked (handles hidden)

  // Filter stickers by category
  const filteredStickers = availableStickers.filter(sticker => sticker.category === stickerCategory)

  // Add sticker
  const addSticker = (stickerName: string) => {
    const stickerData = availableStickers.find(s => s.name === stickerName)
    if (!stickerData) return
    
    const newSticker: Sticker = {
      id: Date.now().toString(),
      emoji: stickerData.imageUrl, // Store image URL instead of emoji
      name: stickerData.name,
      x: 50, // Center the sticker (50% from left)
      y: 50, // Center the sticker (50% from top)
      scale: 1,
      rotation: 0,
    }
    setStickers(prevStickers => [...prevStickers, newSticker])
    setPhotoMode("locked") // Photo stays locked in social media frame
    setStickersLocked(false) // Unlock stickers when adding new one
  }

  // Remove sticker
  const removeSticker = (id: string) => {
    setStickers(prevStickers => prevStickers.filter(s => s.id !== id))
  }

  // Handle post
  const handlePost = async () => {
    setIsRendering(true)
    try {
      // Render stickers onto the photo
      const finalImageUrl = await renderContentToImage()
      
      const contentData = {
        stickers,
        platform,
        finalImageUrl, // Include the rendered image
      }
      onPost(contentData)
    } catch (error) {
      console.error('Error rendering image:', error)
      // Fallback to original image
      const contentData = {
        stickers,
        platform,
      }
      onPost(contentData)
    } finally {
      setIsRendering(false)
    }
  }

  // Handle save
  const handleSave = async () => {
    setIsRendering(true)
    try {
      // Render stickers and text onto the photo
      const finalImageUrl = await renderContentToImage()
      
      const contentData = {
        stickers,
        platform,
        finalImageUrl, // Include the rendered image
      }
      onSave(contentData)
    } catch (error) {
      console.error('Error rendering image:', error)
      // Fallback to original image
      const contentData = {
        stickers,
        platform,
      }
      onSave(contentData)
    } finally {
      setIsRendering(false)
    }
  }

  // Function to render stickers and text onto the photo
  const renderContentToImage = async (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(mediaUrl) // Fallback to original image
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // Get platform dimensions for consistent sizing
        const platformDims = getPlatformDimensions(platform)
        
        // Set canvas size to match platform dimensions
        canvas.width = platformDims.width
        canvas.height = platformDims.height

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw the original image scaled to fit platform dimensions
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Track sticker loading
        let stickersLoaded = 0
        const totalStickers = stickers.length

        if (totalStickers === 0) {
          // No stickers, resolve immediately
          const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9)
          resolve(finalImageUrl)
          return
        }

        // Draw stickers with corrected positioning
        stickers.forEach(sticker => {
          console.log("🎨 Rendering sticker:", { 
            id: sticker.id, 
            x: sticker.x, 
            y: sticker.y, 
            scale: sticker.scale, 
            rotation: sticker.rotation,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
          })
          
          const stickerImg = new Image()
          stickerImg.crossOrigin = 'anonymous'
          
          stickerImg.onload = () => {
            // CRITICAL FIX: Use the exact same positioning logic as the editor
            // The editor shows stickers positioned relative to the photo container
            // We need to maintain the same visual positioning when rendering
            
            // Calculate sticker position as percentage of the canvas dimensions
            const x = (sticker.x / 100) * canvas.width
            const y = (sticker.y / 100) * canvas.height
            
            // Save context for transformations
            ctx.save()
            
            // Move to sticker center (same as editor)
            ctx.translate(x, y)
            
            // Apply scale and rotation (same as editor)
            ctx.scale(sticker.scale, sticker.scale)
            ctx.rotate((sticker.rotation * Math.PI) / 180)
            
            // CRITICAL FIX: Use the same sticker size as in the editor
            // The editor uses 96px base size, maintain this exactly
            const stickerWidth = 96 * sticker.scale
            const stickerHeight = 96 * sticker.scale
            
            // Draw sticker centered at the calculated position
            ctx.drawImage(stickerImg, -stickerWidth/2, -stickerHeight/2, stickerWidth, stickerHeight)
            
            // Restore context
            ctx.restore()
            
            // Check if all stickers are loaded
            stickersLoaded++
            if (stickersLoaded === totalStickers) {
              const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9)
              resolve(finalImageUrl)
            }
          }
          
          stickerImg.onerror = () => {
            // Fallback to emoji if image fails
            ctx.save()
            ctx.translate((sticker.x / 100) * canvas.width, (sticker.y / 100) * canvas.height)
            ctx.scale(sticker.scale, sticker.scale)
            ctx.rotate((sticker.rotation * Math.PI) / 180)
            ctx.font = '48px Arial'
            ctx.fillStyle = 'white'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('🎯', 0, 0)
            ctx.restore()
            
            // Check if all stickers are processed
            stickersLoaded++
            if (stickersLoaded === totalStickers) {
              const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9)
              resolve(finalImageUrl)
            }
          }
          
          stickerImg.src = sticker.emoji
        })
      }
      
      img.onerror = () => {
        resolve(mediaUrl) // Fallback to original image
      }
      
      img.src = mediaUrl
    })
  }

  // Helper function to get platform dimensions
  const getPlatformDimensions = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
      case 'instagram story':
        return { width: 1080, height: 1920 }
      case 'tiktok':
        return { width: 1080, height: 1920 }
      case 'facebook':
        return { width: 1200, height: 630 }
      case 'twitter':
        return { width: 1200, height: 675 }
      default:
        return { width: 1080, height: 1920 } // Default to Instagram story size
    }
  }

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
      }}
    >
      {/* Header */}
              <div
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(30, 58, 138, 0.95)",
            backdropFilter: "blur(15px)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
        <button 
          onClick={onBack}
          style={{
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.15)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
          Add Content for {platform}
        </h1>
        <div style={{ width: "48px" }} />
      </div>

      {/* Preview */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          background: "rgba(30, 58, 138, 0.95)",
          position: "relative", // For positioning the Done button
          backdropFilter: "blur(15px)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* Done Button - Only show when stickers are placed */}
        {stickers.length > 0 && (
          <button
            onClick={() => {
              setStickersLocked(true) // Lock stickers when Done is clicked
              // Don't change photoMode - keep slider down
            }}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              zIndex: 1000,
              padding: "8px 16px",
              borderRadius: "20px",
              border: "2px solid rgba(255,255,255,0.3)",
              background: "rgba(0,0,0,0.7)",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            ✅ Done
          </button>
        )}

        <div
          style={{
            width: "90vw", // Photo stays fixed size in social media frame
            height: "60vh", // Fixed height for social media frame
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            position: "relative",
            touchAction: "none",
            transition: "all 0.3s ease", // Smooth transition between modes
          }}
          data-photo-container="true" // Identifier for sticker positioning
        >
          {mediaType === "photo" ? (
        <img 
          src={mediaUrl} 
          alt="Preview" 
          style={{ 
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <video
              src={mediaUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
              autoPlay
              loop
            />
          )}
          
          {/* Draggable Stickers Overlay */}
        {stickers.map((sticker) => (
          <DraggableSticker
            key={sticker.id}
            sticker={sticker}
            onUpdate={(updates) => {
              console.log("🎯 Sticker update:", { stickerId: sticker.id, updates, currentSticker: sticker })
              setStickers(prevStickers => prevStickers.map(s => 
                s.id === sticker.id ? { ...s, ...updates } : s
              ))
            }}
            onRemove={() => {
              removeSticker(sticker.id)
            }}
            isActive={!stickersLocked} // Disable interactions when locked
            stickersLocked={stickersLocked}
          />
        ))}
        </div>
      </div>

      {/* Sticker Selection Panel - Slides over photo */}
          <div style={{ 
        position: 'absolute',
        bottom: photoMode === "sticker-selection" ? '0' : '-100%',
        left: '0',
        right: '0',
        height: '60vh',
        backgroundColor: 'rgba(15, 23, 42, 0.95)', // PINIT dark theme
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '16px',
        overflowY: 'auto',
        transition: 'all 0.3s ease',
        zIndex: 1000,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
      }}>
        {/* Draggable Handle */}
        <div style={{
          width: '40px',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: '2px',
          margin: '0 auto 16px auto',
          cursor: 'grab'
        }} 
        onMouseDown={(e) => {
          e.preventDefault()
          setPhotoMode("locked")
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          setPhotoMode("locked")
        }}
        title="Drag down to close"
        />

        {/* Sticker Selection Mode Indicator */}
        {photoMode === "sticker-selection" && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '600' }}>
              🎯 Choose a Fun Sticker!
            </span>
        </div>
      )}

        <div>
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#f1f5f9'}}>
              Add Stickers
            </h3>
            
            {/* Sticker Category Tabs */}
            <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
              <button
                onClick={() => setStickerCategory("old-school")}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: stickerCategory === "old-school" ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
                  background: stickerCategory === "old-school" ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Old School
              </button>
              <button
                onClick={() => setStickerCategory("new")}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: stickerCategory === "new" ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
                  background: stickerCategory === "new" ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                New
              </button>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'}}>
              {filteredStickers.map((sticker, index) => (
                <button
                  key={sticker.id}
                  onClick={() => addSticker(sticker.name)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.8)', // Much lighter background
                    color: 'white',
                    cursor: 'pointer',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img 
                    src={sticker.imageUrl} 
                    alt={sticker.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      maxWidth: '60px', // Bigger stickers in selection
                      maxHeight: '60px'
                    }} 
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to emoji if image fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const emoji = document.createElement('div')
                      emoji.textContent = '🎯'
                      emoji.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px;'
                      target.parentNode?.appendChild(emoji)
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{padding: '16px', background: 'rgba(30, 58, 138, 0.95)', borderTop: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(15px)'}}>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            onClick={handleSave}
            disabled={isRendering}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: isRendering ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
              color: isRendering ? 'rgba(255,255,255,0.5)' : 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isRendering ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Save size={16} />
            {isRendering ? 'Rendering...' : 'Save'}
          </button>
          <button
            onClick={handlePost}
            disabled={isRendering}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: isRendering ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
              color: isRendering ? 'rgba(255,255,255,0.5)' : 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isRendering ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Share2 size={16} />
            {isRendering ? 'Rendering...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
} 
