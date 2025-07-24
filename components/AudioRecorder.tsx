"use client"

import { useRef, useCallback } from "react"
import { Mic, MicOff } from "lucide-react"

interface AudioRecorderProps {
  onAudioRecorded: (audioUrl: string) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
}

export function AudioRecorder({ onAudioRecorded, isRecording, setIsRecording }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const audioUrl = URL.createObjectURL(audioBlob)
        onAudioRecorded(audioUrl)

        // Cleanup
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Failed to start audio recording:", error)
      // Simulate audio recording for demo
      setTimeout(() => {
        onAudioRecorded("/placeholder.svg?height=100&width=100&text=Audio")
        setIsRecording(false)
      }, 1000)
    }
  }, [onAudioRecorded, setIsRecording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording, setIsRecording])

  return (
    <>
      {/* Audio Control Button */}
      <div className="absolute bottom-32 right-4 z-10">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`p-4 rounded-full transition-all ${
            isRecording ? "bg-red-500 scale-110" : "bg-white/20 hover:bg-white/30"
          }`}
          title="Hold to record audio"
        >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute bottom-44 right-4 bg-red-500 px-3 py-1 rounded-full text-white text-sm font-bold z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Recording...
          </div>
        </div>
      )}
    </>
  )
}
