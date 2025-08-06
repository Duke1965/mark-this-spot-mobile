"use client"

import { useState, useRef, useCallback } from 'react';
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
  sticker: any;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  isActive: boolean;
}

interface DraggableTextProps {
  text: any;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  isActive: boolean;
}

const DraggableSticker = ({ sticker, onUpdate, onDelete, isActive }: DraggableStickerProps) => {
  const [position, setPosition] = useState({ x: sticker.x, y: sticker.y });
  const [scale, setScale] = useState(sticker.scale || 1);
  const [rotation, setRotation] = useState(sticker.rotation || 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [startTouch, setStartTouch] = useState({ x: 0, y: 0 });
  const [startDistance, setStartDistance] = useState(0);
  const [startAngle, setStartAngle] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsScaling(true);
      setIsRotating(true);
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const angle = Math.atan2(
        e.touches[1].clientY - e.touches[0].clientY,
        e.touches[1].clientX - e.touches[0].clientX
      );
      setStartDistance(distance);
      setStartAngle(angle);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive) return;
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - startTouch.x;
      const deltaY = e.touches[0].clientY - startTouch.y;
      const newPosition = { x: position.x + deltaX, y: position.y + deltaY };
      setPosition(newPosition);
      onUpdate(sticker.id, { x: newPosition.x, y: newPosition.y });
      setStartTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && (isScaling || isRotating)) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const angle = Math.atan2(
        e.touches[1].clientY - e.touches[0].clientY,
        e.touches[1].clientX - e.touches[0].clientX
      );
      
      if (isScaling) {
        const scaleFactor = distance / startDistance;
        const newScale = Math.max(0.5, Math.min(3, scale * scaleFactor));
        setScale(newScale);
        onUpdate(sticker.id, { scale: newScale });
      }
      
      if (isRotating) {
        const angleDelta = angle - startAngle;
        const newRotation = rotation + angleDelta * (180 / Math.PI);
        setRotation(newRotation);
        onUpdate(sticker.id, { rotation: newRotation });
      }
      
      setStartDistance(distance);
      setStartAngle(angle);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsScaling(false);
    setIsRotating(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        cursor: isActive ? 'pointer' : 'default',
        padding: '20px',
        margin: '-20px',
        zIndex: isActive ? 1000 : 1
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img 
        src={sticker.imageUrl} 
        alt={sticker.name}
        style={{ 
          width: '96px', 
          height: '96px',
          objectFit: 'contain',
          pointerEvents: 'none'
        }} 
      />
      
      {/* Delete Button */}
      <button
        onClick={() => onDelete(sticker.id)}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'red',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ×
      </button>
      
      {/* Rotate Handle */}
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'blue',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        🔄
      </div>
    </div>
  );
};

const DraggableText = ({ text, onUpdate, onDelete, isActive }: DraggableTextProps) => {
  const [position, setPosition] = useState({ x: text.x, y: text.y });
  const [scale, setScale] = useState(text.scale || 1);
  const [rotation, setRotation] = useState(text.rotation || 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [startTouch, setStartTouch] = useState({ x: 0, y: 0 });
  const [startDistance, setStartDistance] = useState(0);
  const [startAngle, setStartAngle] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsScaling(true);
      setIsRotating(true);
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const angle = Math.atan2(
        e.touches[1].clientY - e.touches[0].clientY,
        e.touches[1].clientX - e.touches[0].clientX
      );
      setStartDistance(distance);
      setStartAngle(angle);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive) return;
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - startTouch.x;
      const deltaY = e.touches[0].clientY - startTouch.y;
      const newPosition = { x: position.x + deltaX, y: position.y + deltaY };
      setPosition(newPosition);
      onUpdate(text.id, { x: newPosition.x, y: newPosition.y });
      setStartTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && (isScaling || isRotating)) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const angle = Math.atan2(
        e.touches[1].clientY - e.touches[0].clientY,
        e.touches[1].clientX - e.touches[0].clientX
      );
      
      if (isScaling) {
        const scaleFactor = distance / startDistance;
        const newScale = Math.max(0.5, Math.min(3, scale * scaleFactor));
        setScale(newScale);
        onUpdate(text.id, { scale: newScale });
      }
      
      if (isRotating) {
        const angleDelta = angle - startAngle;
        const newRotation = rotation + angleDelta * (180 / Math.PI);
        setRotation(newRotation);
        onUpdate(text.id, { rotation: newRotation });
      }
      
      setStartDistance(distance);
      setStartAngle(angle);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsScaling(false);
    setIsRotating(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        cursor: isActive ? 'pointer' : 'default',
        padding: '20px',
        margin: '-20px',
        zIndex: isActive ? 1000 : 1
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          color: text.color,
          fontFamily: text.font,
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none'
        }}
      >
        {text.content}
      </div>
      
      {/* Delete Button */}
      <button
        onClick={() => onDelete(text.id)}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'red',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ×
      </button>
      
      {/* Rotate Handle */}
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'blue',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        🔄
      </div>
    </div>
  );
};

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

  const [activeTab, setActiveTab] = useState<'stickers' | 'text'>('stickers')
  const [stickerCategory, setStickerCategory] = useState<'old-school' | 'new'>('old-school')
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [texts, setTexts] = useState<any[]>([])
  const [textOverlay, setTextOverlay] = useState("")
  const [textStyle, setTextStyle] = useState("bold")
  const [selectedFont, setSelectedFont] = useState('Bangers');
  const [selectedColor, setSelectedColor] = useState('#000000');

  const fonts = [
    'Bangers',
    'Chewy', 
    'Bubblegum Sans',
    'Indie Flower',
    'Righteous',
    'Audiowide'
  ];

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
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: 1,
      rotation: 0,
    }
    setStickers([...stickers, newSticker])
  }

  // Remove sticker
  const removeSticker = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id))
  }

  const addText = () => {
    if (textOverlay.trim()) {
      const textId = `text-${Date.now()}`;
      const newTextItem = {
        id: textId,
        content: textOverlay,
        x: Math.random() * 200,
        y: Math.random() * 200,
        scale: 1,
        rotation: 0,
        font: selectedFont,
        color: selectedColor
      };
      setTexts([...texts, newTextItem]);
      setTextOverlay('');
    }
  };

  const updateText = (id: string, updates: any) => {
    setTexts(texts.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
  };

  // Handle post
  const handlePost = () => {
    const contentData = {
      stickers,
      text: textOverlay,
      textStyle,
      platform,
    }
    onPost(contentData)
  }

  // Handle save
  const handleSave = () => {
    const contentData = {
      stickers,
      text: textOverlay,
      textStyle,
      platform,
    }
    onSave(contentData)
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
        }}
      >
        <div
          style={{
            width: "90vw",
            height: activeTab === "stickers" || activeTab === "text" ? "35vh" : "50vh",
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            position: "relative",
            touchAction: "none",
            transition: "height 0.3s ease",
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
              onUpdate={(id, updates) => {
                if (activeTab === "stickers") {
                  setStickers(stickers.map(s => 
                    s.id === id ? { ...s, ...updates } : s
                  ))
                }
              }}
              onDelete={removeSticker}
              isActive={activeTab === "stickers"}
            />
          ))}

          {/* Draggable Text Overlay - Always visible, but only interactive when text tab is active */}
          {textOverlay && (
            <DraggableText
              text={{
                id: `text-${Date.now()}`,
                content: textOverlay,
                x: Math.random() * 200,
                y: Math.random() * 200,
                scale: 1,
                rotation: 0,
                font: selectedFont,
                color: selectedColor
              }}
              onUpdate={(id, updates) => {
                if (activeTab === "text") {
                  if (updates.remove) {
                    setTextOverlay("")
                  } else {
                    // Update text position, scale, rotation
                    console.log("Text updated:", updates)
                  }
                }
              }}
              onDelete={() => {}} // No direct delete for text overlay
              isActive={activeTab === "text"}
            />
          )}

          {/* Texts */}
          {texts.map((text) => (
            <DraggableText
              key={text.id}
              text={text}
              onUpdate={updateText}
              onDelete={deleteText}
              isActive={activeTab === 'text'}
            />
          ))}
        </div>
      </div>

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
      <div style={{flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.2)'}}>
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
                onChange={(e) => setTextOverlay(e.target.value)}
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
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Font:
              </label>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                {fonts.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            
            {/* Color Picker */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Color:
              </label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <button
              onClick={addText}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#3a3a3a',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Add Text
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{padding: '16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={handlePost}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Share2 size={16} />
            Post
          </button>
        </div>
      </div>
    </div>
  )
} 
