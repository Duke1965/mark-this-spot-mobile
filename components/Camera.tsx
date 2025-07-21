"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"

interface CameraProps {
  onCapture: (imageSrc: string) => void
}

const Camera: React.FC<CameraProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setHasCameraPermission(true)
      } catch (error) {
        console.error("Error accessing camera:", error)
        setHasCameraPermission(false)
      }
    }

    getCameraPermission()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
        const imageSrc = canvas.toDataURL("image/png")
        onCapture(imageSrc)
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      {hasCameraPermission === null ? (
        <div>Requesting camera permission...</div>
      ) : hasCameraPermission ? (
        <>
          <div className="flex-1 relative bg-black/20 flex items-center justify-center min-h-[calc(100vh-160px)]">
            <video ref={videoRef} autoPlay className="max-w-full max-h-full" />
          </div>
          <button
            onClick={captureImage}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
          >
            Capture
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </>
      ) : (
        <div>Camera permission denied. Please enable it in your browser settings.</div>
      )}
    </div>
  )
}

export default Camera
