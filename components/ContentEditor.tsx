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
}

interface DraggableTextProps {
  text: string
  style: string
  textColor?: string
  selectedFont?: string
  onUpdate: (updates: any) => void
  isActive?: boolean
}

function DraggableSticker({ sticker, onUpdate, onRemove, isActive = true }: DraggableStickerProps) {
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
      const rect = e.currentTarget.getBoundingClientRect()
      setStartPos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top })
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
      const rect = e.currentTarget.getBoundingClientRect()
      const newX = touch.clientX - rect.left - startPos.x
      const newY = touch.clientY - rect.top - startPos.y
      
      onUpdate({
        x: newX,
        y: newY
      })
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
        left: `${sticker.x}px`,
        top: `${sticker.y}px`,
        transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
        fontSize: "96px",
        zIndex: isDragging ? 1000 : 1,
        padding: "20px", // Bigger touch area around sticker
        margin: "-20px", // Compensate for padding so sticker position stays the same
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* X button for removal */}
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
      
      {/* Draggable rotate handle */}
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
      
      <img 
        src={sticker.emoji} 
        alt={sticker.name}
        style={{ 
          width: "96px", 
          height: "96px", 
          objectFit: "contain",
          userSelect: "none",
          pointerEvents: "none"
        }} 
        loading="lazy"
        onError={(e) => {
          // Fallback to emoji if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const emoji = document.createElement('div')
          emoji.textContent = '🎯'
          emoji.style.cssText = 'width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; font-size: 48px; user-select: none; pointer-events: none;'
          target.parentNode?.appendChild(emoji)
        }}
      />
    </div>
  )
}

function DraggableText({ text, style, textColor = "#ffffff", selectedFont = "bangers", onUpdate, isActive = true }: DraggableTextProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 }) // Center position
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
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
      setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y })
      setIsDragging(true)
    } else if (e.touches.length === 2) {
      // Two fingers - scale and rotate
      setInitialDistance(getDistance(e.touches))
      setInitialScale(scale)
      setInitialRotation(rotation)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 1 && isDragging) {
      // Single finger drag
      const touch = e.touches[0]
      const newPosition = {
        x: touch.clientX - startPos.x,
        y: touch.clientY - startPos.y
      }
      setPosition(newPosition)
      onUpdate(newPosition)
    } else if (e.touches.length === 2) {
      // Two finger scale and rotate simultaneously
      const currentDistance = getDistance(e.touches)
      const currentAngle = getAngle(e.touches)
      
      if (initialDistance > 0) {
        // Calculate scale
        const scaleChange = currentDistance / initialDistance
        const newScale = Math.max(0.5, Math.min(3, initialScale * scaleChange))
        setScale(newScale)
        
        // Calculate rotation (simplified for better performance)
        const angleDiff = currentAngle - getAngle(e.touches)
        const newRotation = initialRotation + angleDiff
        setRotation(newRotation)
        
        onUpdate({ scale: newScale, rotation: newRotation })
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setInitialDistance(0)
  }

  // Get font style based on selectedFont
  const getFontStyle = () => {
    switch (selectedFont) {
      case "bangers":
        return { fontFamily: "Bangers, cursive", fontSize: "24px", letterSpacing: "2px" }
      case "chewy":
        return { fontFamily: "Chewy, cursive", fontSize: "20px" }
      case "bubblegum":
        return { fontFamily: "Bubblegum Sans, cursive", fontSize: "22px" }
      case "indie":
        return { fontFamily: "Indie Flower, cursive", fontSize: "20px" }
      case "righteous":
        return { fontFamily: "Righteous, cursive", fontSize: "18px" }
      case "audiowide":
        return { fontFamily: "Audiowide, cursive", fontSize: "16px", letterSpacing: "1px" }
      default:
        return { fontWeight: "bold", fontSize: "24px" }
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        color: textColor,
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
        zIndex: isDragging ? 1000 : 1,
        maxWidth: "calc(100% - 20px)",
        wordWrap: "break-word",
        padding: "20px", // Bigger touch area
        margin: "-20px", // Compensate for padding
        ...getFontStyle()
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* X button for removal */}
      <button
        onClick={() => onUpdate({ remove: true })}
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
      
      {/* Draggable rotate handle */}
      <div
        onTouchStart={(e) => {
          e.stopPropagation()
          const touch = e.touches[0]
          const rect = e.currentTarget.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * 180 / Math.PI
          setRotation(angle)
          onUpdate({ rotation: angle })
        }}
        onTouchMove={(e) => {
          e.stopPropagation()
          const touch = e.touches[0]
          const rect = e.currentTarget.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * 180 / Math.PI
          setRotation(angle)
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
      
      {text}
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

  // Font styles from PhotoEditor
  const textStyles = [
    { name: "bangers", label: "Bangers", style: "font-family: 'Bangers', cursive; font-size: 24px; letter-spacing: 2px;" },
    { name: "chewy", label: "Chewy", style: "font-family: 'Chewy', cursive; font-size: 20px;" },
    { name: "bubblegum", label: "Bubblegum", style: "font-family: 'Bubblegum Sans', cursive; font-size: 22px;" },
    { name: "indie", label: "Indie", style: "font-family: 'Indie Flower', cursive; font-size: 20px;" },
    { name: "righteous", label: "Righteous", style: "font-family: 'Righteous', cursive; font-size: 18px;" },
    { name: "audiowide", label: "Audiowide", style: "font-family: 'Audiowide', cursive; font-size: 16px; letter-spacing: 1px;" },
  ]

  const [activeTab, setActiveTab] = useState<"stickers" | "text">("stickers")
  const [stickerCategory, setStickerCategory] = useState<"old-school" | "new">("old-school")
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [textOverlay, setTextOverlay] = useState("")
  const [textStyle, setTextStyle] = useState("bold")
  const [textColor, setTextColor] = useState("#ffffff") // White default
  const [selectedFont, setSelectedFont] = useState("bangers")
  const [photoMode, setPhotoMode] = useState<"selection" | "active">("selection") // New state for photo visibility
  const [isRendering, setIsRendering] = useState(false) // Loading state for rendering

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
      x: 150, // Fixed pixel position from left
      y: 100, // Fixed pixel position from top
      scale: 1,
      rotation: 0,
    }
    setStickers(prevStickers => [...prevStickers, newSticker])
    setPhotoMode("active") // Switch to active mode when sticker is added
  }

  // Remove sticker
  const removeSticker = (id: string) => {
    setStickers(prevStickers => prevStickers.filter(s => s.id !== id))
  }

  // Handle text input change
  const handleTextChange = (text: string) => {
    setTextOverlay(text)
    if (text.trim()) {
      setPhotoMode("active") // Switch to active mode when text is entered
    }
  }

  // Handle post
  const handlePost = async () => {
    setIsRendering(true)
    try {
      // Render stickers and text onto the photo
      const finalImageUrl = await renderContentToImage()
      
      const contentData = {
        stickers,
        text: textOverlay,
        textStyle,
        textColor,
        selectedFont,
        platform,
        finalImageUrl, // Include the rendered image
      }
      onPost(contentData)
    } catch (error) {
      console.error('Error rendering image:', error)
      // Fallback to original image
      const contentData = {
        stickers,
        text: textOverlay,
        textStyle,
        textColor,
        selectedFont,
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
        text: textOverlay,
        textStyle,
        textColor,
        selectedFont,
        platform,
        finalImageUrl, // Include the rendered image
      }
      onSave(contentData)
    } catch (error) {
      console.error('Error rendering image:', error)
      // Fallback to original image
      const contentData = {
        stickers,
        text: textOverlay,
        textStyle,
        textColor,
        selectedFont,
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
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the original image
        ctx.drawImage(img, 0, 0)

        // Draw stickers with corrected positioning
        stickers.forEach(sticker => {
          const stickerImg = new Image()
          stickerImg.crossOrigin = 'anonymous'
          stickerImg.onload = () => {
            // Use pixel positioning directly
            const x = sticker.x
            const y = sticker.y
            
            // Save context for transformations
            ctx.save()
            
            // Move to sticker center (same as editor)
            ctx.translate(x, y)
            
            // Apply scale and rotation (same as editor)
            ctx.scale(sticker.scale, sticker.scale)
            ctx.rotate((sticker.rotation * Math.PI) / 180)
            
            // Draw sticker centered (same size as editor)
            const stickerWidth = 96 * sticker.scale
            const stickerHeight = 96 * sticker.scale
            ctx.drawImage(stickerImg, -stickerWidth/2, -stickerHeight/2, stickerWidth, stickerHeight)
            
            // Restore context
            ctx.restore()
          }
          stickerImg.onerror = () => {
            // Fallback to emoji if image fails
            ctx.save()
            ctx.translate(sticker.x, sticker.y)
            ctx.scale(sticker.scale, sticker.scale)
            ctx.rotate((sticker.rotation * Math.PI) / 180)
            ctx.font = '48px Arial'
            ctx.fillStyle = 'white'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('🎯', 0, 0)
            ctx.restore()
          }
          stickerImg.src = sticker.emoji
        })

        // Draw text with corrected positioning
        if (textOverlay.trim()) {
          ctx.save()
          
          // Get font style
          const getFontStyle = () => {
            switch (selectedFont) {
              case "bangers":
                return "48px 'Bangers', cursive"
              case "chewy":
                return "40px 'Chewy', cursive"
              case "bubblegum":
                return "44px 'Bubblegum Sans', cursive"
              case "indie":
                return "40px 'Indie Flower', cursive"
              case "righteous":
                return "36px 'Righteous', cursive"
              case "audiowide":
                return "32px 'Audiowide', cursive"
              default:
                return "48px bold"
            }
          }

          ctx.font = getFontStyle()
          ctx.fillStyle = textColor
          ctx.strokeStyle = 'black'
          ctx.lineWidth = 4
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          
          // Use the same positioning as the editor (center of image)
          const textX = canvas.width / 2
          const textY = canvas.height / 2
          
          // Draw text with stroke for better visibility
          ctx.strokeText(textOverlay, textX, textY)
          ctx.fillText(textOverlay, textX, textY)
          
          ctx.restore()
        }

        // Convert canvas to data URL
        const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9)
        resolve(finalImageUrl)
      }
      
      img.onerror = () => {
        resolve(mediaUrl) // Fallback to original image
      }
      
      img.src = mediaUrl
    })
  }

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
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <button 
          onClick={onBack}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
          background: "rgba(0,0,0,0.1)",
          position: "relative", // For positioning the Done button
        }}
      >
        {/* Done Button - Only show in active mode */}
        {photoMode === "active" && (
          <button
            onClick={() => setPhotoMode("selection")}
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
            width: photoMode === "active" ? "95vw" : "90vw",
            height: photoMode === "active" ? "70vh" : "25vh", // Much bigger in active mode
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            position: "relative",
            touchAction: "none",
            transition: "all 0.3s ease", // Smooth transition between modes
          }}
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
          
          {/* Draggable Stickers Overlay - Always visible, but only interactive when stickers tab is active */}
        {stickers.map((sticker) => (
          <DraggableSticker
            key={sticker.id}
            sticker={sticker}
              onUpdate={(updates) => {
                if (activeTab === "stickers") {
                  setStickers(prevStickers => prevStickers.map(s => 
                    s.id === sticker.id ? { ...s, ...updates } : s
                  ))
                }
              }}
              onRemove={() => {
                if (activeTab === "stickers") {
                  removeSticker(sticker.id)
                }
              }}
              isActive={activeTab === "stickers"}
          />
        ))}
        
          {/* Draggable Text Overlay - Always visible, but only interactive when text tab is active */}
          {textOverlay && textOverlay.trim() && (
          <DraggableText
              text={textOverlay}
              style={selectedFont}
              textColor={textColor}
              selectedFont={selectedFont}
              onUpdate={(updates) => {
                if (activeTab === "text") {
                  if (updates.remove) {
                    setTextOverlay("")
                  }
                  // Text position, scale, rotation are handled internally by DraggableText component
                }
              }}
              isActive={activeTab === "text"}
            />
          )}
        </div>
      </div>

      {/* Color Slider - Only show when text tab is active */}
      {activeTab === "text" && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(0,0,0,0.2)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
            Text Color
          </label>
      <div style={{ 
            position: "relative",
            width: "90%", // Much wider slider
            height: "24px", // Slightly thicker
            borderRadius: "12px",
            overflow: "hidden",
            background: "rgba(255,255,255,0.3)",
            padding: "6px", // More padding for thicker slider
            margin: "0 auto"
          }}>
            <input
              type="range"
              min="0"
              max="360"
              value={textColor.startsWith('hsl') ? parseInt(textColor.match(/hsl\((\d+)/)?.[1] || '0') : 0}
              onChange={(e) => {
                const hue = parseInt(e.target.value)
                const color = `hsl(${hue}, 70%, 50%)`
                setTextColor(color)
              }}
              style={{
                width: "100%",
                height: "16px", // Thicker slider
                background: "linear-gradient(to right, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000)",
                borderRadius: "8px",
                outline: "none",
                cursor: "pointer",
                border: "none",
                appearance: "none",
                WebkitAppearance: "none"
              }}
            />
            <div style={{
              position: "absolute",
              top: "50%",
              left: `${(textColor.startsWith('hsl') ? parseInt(textColor.match(/hsl\((\d+)/)?.[1] || '0') : 0) / 360 * 100}%`,
              transform: "translate(-50%, -50%)",
              width: "12px", // Slightly bigger indicator
              height: "12px",
              backgroundColor: textColor,
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              pointerEvents: "none"
            }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex" style={{backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        <button
          onClick={() => setActiveTab("stickers")}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === "stickers" ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: activeTab === "stickers" ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🎯 Stickers
        </button>

        <button
          onClick={() => setActiveTab("text")}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === "text" ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: activeTab === "text" ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ✏️ Text
        </button>
      </div>

      {/* Tab Content */}
          <div style={{ 
        flex: photoMode === "active" ? 0 : 1, // Take less space in active mode
        padding: '16px', 
        overflowY: 'auto', 
        backgroundColor: 'rgba(0,0,0,0.2)',
        maxHeight: photoMode === "active" ? '20vh' : '40vh', // Much smaller in active mode
        transition: 'all 0.3s ease'
      }}>
        {/* Mode Indicator */}
        {photoMode === "active" && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              🎯 Active Mode - Photo visible for precise positioning
            </span>
            <button
              onClick={() => setPhotoMode("selection")}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Back to Selection
            </button>
        </div>
      )}

        {activeTab === "stickers" && (
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'white'}}>
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
        )}

        {activeTab === "text" && (
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'white'}}>
              Add Text
            </h3>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>
                Your Message
              </label>
              <input
                type="text"
                value={textOverlay}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Add your message..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Font Selector */}
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>
                Font Style
              </label>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {textStyles.map(font => (
                  <option key={font.name} value={font.name} style={{ padding: '8px', background: '#2a2a2a' }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>
                Text Style
              </label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px'}}>
                {["bold", "normal"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setTextStyle(style)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: textStyle === style ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
                      background: textStyle === style ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{padding: '16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            onClick={handleSave}
            disabled={isRendering}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: isRendering ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color: isRendering ? 'rgba(255,255,255,0.5)' : 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isRendering ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
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
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: isRendering ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color: isRendering ? 'rgba(255,255,255,0.5)' : 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isRendering ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
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
