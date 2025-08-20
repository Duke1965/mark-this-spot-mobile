"use client"

import { useState, useEffect } from "react"
import { ContentEditor } from "./ContentEditor"

interface GooglePhoto {
  photo_reference: string
  url: string
  width: number
  height: number
}

interface PinData {
  id: string
  title: string
  description: string
  category: string
  latitude: number
  longitude: number
  locationName: string
  timestamp: string
  mediaUrl?: string
  additionalPhotos?: GooglePhoto[]
}

interface PinResultsProps {
  pin: PinData
  onBack: () => void
  onSave: () => void
  onShare: () => void
  onEdit?: (updatedPin: PinData) => void
}

export function PinResults({ pin, onBack, onSave, onShare, onEdit }: PinResultsProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  
  // NEW: Edit state management
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(pin.title || '')
  const [editDescription, setEditDescription] = useState(pin.description || '')
  const [editCategory, setEditCategory] = useState(pin.category || 'general')

  useEffect(() => {
    try {
      setIsLoading(true)
      console.log("📸 Setting up photo carousel from pin data...")
      
      const allPhotos: GooglePhoto[] = []
      
      // Add the pin's own photo if it exists
      if (pin.mediaUrl) {
        allPhotos.push({
          photo_reference: 'pin-photo',
          url: pin.mediaUrl,
          width: 400,
          height: 300
        })
      }
      
      // Add the already fetched location photos from pin.additionalPhotos
      if (pin.additionalPhotos && pin.additionalPhotos.length > 0) {
        console.log("📸 Found", pin.additionalPhotos.length, "location photos in pin data")
        
        pin.additionalPhotos.forEach((photoData, index) => {
          allPhotos.push({
            photo_reference: `location-${index}`,
            url: photoData.url,
            width: 400,
            height: 300
          })
        })
      } else {
        console.log("📸 No additional photos found in pin data")
      }
      
      setPhotos(allPhotos)
      if (allPhotos.length > 0) {
        setSelectedPhotoUrl(allPhotos[0].url)
        console.log("�� Photo carousel set up with", allPhotos.length, "photos")
      } else {
        console.log("📸 No photos available for carousel")
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error("❌ Error setting up photo carousel:", error)
      setIsLoading(false)
    }
  }, [pin.mediaUrl, pin.additionalPhotos])
  
  const nextPhoto = () => {
    if (photos.length > 0) {
      const nextIndex = (currentPhotoIndex + 1) % photos.length
      setCurrentPhotoIndex(nextIndex)
      setSelectedPhotoUrl(photos[nextIndex].url)
    }
  }

  const prevPhoto = () => {
    if (photos.length > 0) {
      const prevIndex = currentPhotoIndex === 0 ? photos.length - 1 : currentPhotoIndex - 1
      setCurrentPhotoIndex(prevIndex)
      setSelectedPhotoUrl(photos[prevIndex].url)
    }
  }

  // NEW: Handle edit save
  const handleEditSave = () => {
    const updatedPin = {
      ...pin,
      title: editTitle,
      description: editDescription,
      category: editCategory,
      lastEdited: new Date().toISOString()
    }
    
    // Call the onEdit prop with updated pin
    if (onEdit) {
      onEdit(updatedPin)
    }
    
    // Exit edit mode
    setIsEditing(false)
    
    console.log('✏️ Pin edited and saved:', updatedPin)
  }

  // NEW: Handle edit cancel
  const handleEditCancel = () => {
    // Reset to original values
    setEditTitle(pin.title || '')
    setEditDescription(pin.description || '')
    setEditCategory(pin.category || 'general')
    setIsEditing(false)
    
    console.log('❌ Edit cancelled, restored original values')
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Edit Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleEditCancel}
                className="text-white hover:text-blue-100 transition-colors"
              >
                ❌ Cancel
              </button>
              <h2 className="text-white text-lg font-semibold">Edit Pin</h2>
              <button
                onClick={handleEditSave}
                className="text-white hover:text-blue-100 transition-colors font-semibold"
              >
                ✅ Save
              </button>
            </div>
          </div>

          {/* Edit Form */}
          <div className="p-6 space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pin Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter an exciting title..."
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe this amazing spot..."
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="food">Food & Dining</option>
                <option value="adventure">Adventure & Outdoors</option>
                <option value="culture">Culture & History</option>
                <option value="relaxation">Relaxation & Wellness</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="nature">Nature & Wildlife</option>
                <option value="beach">Beach & Water</option>
                <option value="mountain">Mountain & Hiking</option>
              </select>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">{editTitle || 'Your Title Here'}</div>
                <div className="text-sm text-gray-600">{editDescription || 'Your description here...'}</div>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {editCategory}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-white hover:text-blue-100 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-white text-lg font-semibold">Pin Created!</h1>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Photo Carousel */}
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading photos...</p>
          </div>
        ) : photos.length > 0 ? (
          <div className="relative">
            <div className="aspect-square bg-gray-100">
              <img
                src={selectedPhotoUrl || photos[0].url}
                alt="Location photo"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Photo Navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                >
                  ←
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                >
                  →
                </button>
                
                {/* Photo Counter */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-gray-600">No photos available for this area</p>
          </div>
        )}

        {/* Pin Details */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{pin.title}</h2>
            <p className="text-gray-600">{pin.description}</p>
          </div>

          {/* Location Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">📍</span>
              <span className="text-sm text-blue-800">{pin.locationName}</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {new Date(pin.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ✏️ Edit
            </button>
            <button
              onClick={onSave}
              className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              💾 Save
            </button>
            <button
              onClick={onShare}
              className="bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              📤 Share
            </button>
          </div>

          {/* Additional Actions */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowEditor(true)}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              🎨 Edit Photos
            </button>
          </div>
        </div>
      </div>

      {/* Photo Editor Modal */}
      {showEditor && (
        <ContentEditor
          mediaUrl={selectedPhotoUrl || ''}
          onSave={(editedUrl) => {
            setSelectedPhotoUrl(editedUrl)
            setShowEditor(false)
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
