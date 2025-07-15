"use client"

interface AudioRecorderOptions {
  onDataAvailable?: (audioBlob: Blob) => void
  onError?: (error: string) => void
  onStart?: () => void
  onStop?: () => void
  maxDuration?: number // in seconds
  sampleRate?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private options: AudioRecorderOptions
  private recordingTimer: NodeJS.Timeout | null = null
  private startTime = 0
  private isRecording = false

  constructor(options: AudioRecorderOptions = {}) {
    this.options = {
      maxDuration: 60, // 1 minute default
      sampleRate: 44100,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...options,
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn("⚠️ Recording already in progress")
      return
    }

    try {
      console.log("🎤 Starting audio recording...")

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.options.echoCancellation,
          noiseSuppression: this.options.noiseSuppression,
          autoGainControl: this.options.autoGainControl,
          sampleRate: this.options.sampleRate,
        },
      })

      // Create MediaRecorder with best available format
      const mimeType = this.getBestMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
      })

      this.audioChunks = []
      this.startTime = Date.now()
      this.isRecording = true

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: mimeType,
        })

        if (this.options.onDataAvailable) {
          this.options.onDataAvailable(audioBlob)
        }

        if (this.options.onStop) {
          this.options.onStop()
        }

        this.cleanup()
        console.log("🎤 Audio recording completed")
      }

      this.mediaRecorder.onerror = (event) => {
        const error = `Recording error: ${event}`
        console.error("❌ Audio recording error:", error)

        if (this.options.onError) {
          this.options.onError(error)
        }

        this.cleanup()
      }

      this.mediaRecorder.onstart = () => {
        if (this.options.onStart) {
          this.options.onStart()
        }
        console.log("🎤 Audio recording started")
      }

      // Start recording
      this.mediaRecorder.start(100) // Collect data every 100ms

      // Set max duration timer
      if (this.options.maxDuration) {
        this.recordingTimer = setTimeout(() => {
          console.log(`⏰ Max recording duration (${this.options.maxDuration}s) reached`)
          this.stopRecording()
        }, this.options.maxDuration * 1000)
      }
    } catch (error) {
      const errorMessage = `Failed to start recording: ${error}`
      console.error("❌ Audio recording start error:", errorMessage)

      if (this.options.onError) {
        this.options.onError(errorMessage)
      }

      this.cleanup()
    }
  }

  stopRecording(): void {
    if (!this.isRecording) {
      console.warn("⚠️ No recording in progress")
      return
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
      console.log("🛑 Stopping audio recording...")
    }

    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer)
      this.recordingTimer = null
    }

    this.isRecording = false
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause()
      console.log("⏸️ Audio recording paused")
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume()
      console.log("▶️ Audio recording resumed")
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording && this.mediaRecorder?.state === "recording"
  }

  isPaused(): boolean {
    return this.isRecording && this.mediaRecorder?.state === "paused"
  }

  getRecordingDuration(): number {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  getRecordingState(): string {
    if (!this.mediaRecorder) return "inactive"
    return this.mediaRecorder.state
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer)
      this.recordingTimer = null
    }

    this.mediaRecorder = null
    this.startTime = 0
    this.isRecording = false
  }

  private getBestMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`🎵 Using audio format: ${type}`)
        return type
      }
    }

    console.warn("⚠️ No preferred audio format supported, using default")
    return "audio/webm" // fallback
  }

  // Static method to check if audio recording is supported
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)
  }
}

// Utility functions for audio handling
export function createAudioUrl(audioBlob: Blob): string {
  return URL.createObjectURL(audioBlob)
}

export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url)
}

export function downloadAudio(audioBlob: Blob, filename = `recording-${Date.now()}.webm`): void {
  const url = createAudioUrl(audioBlob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  revokeAudioUrl(url)
  console.log(`📥 Audio downloaded: ${filename}`)
}

export async function playAudio(audioBlob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(createAudioUrl(audioBlob))

    audio.onended = () => {
      revokeAudioUrl(audio.src)
      resolve()
    }

    audio.onerror = (error) => {
      revokeAudioUrl(audio.src)
      reject(new Error("Audio playback failed"))
    }

    audio.play().catch(reject)
  })
}

export function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(createAudioUrl(audioBlob))

    audio.onloadedmetadata = () => {
      revokeAudioUrl(audio.src)
      resolve(audio.duration)
    }

    audio.onerror = () => {
      revokeAudioUrl(audio.src)
      reject(new Error("Failed to load audio metadata"))
    }
  })
}

export function convertAudioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert audio to base64"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read audio blob"))
    }

    reader.readAsDataURL(audioBlob)
  })
}

// Audio visualization utilities
export class AudioVisualizer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private source: MediaStreamAudioSourceNode | null = null

  constructor(private stream: MediaStream) {
    this.setupAudioContext()
  }

  private setupAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256

      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)

      this.source = this.audioContext.createMediaStreamSource(this.stream)
      this.source.connect(this.analyser)

      console.log("🎵 Audio visualizer initialized")
    } catch (error) {
      console.error("❌ Failed to setup audio context:", error)
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null

    this.analyser.getByteFrequencyData(this.dataArray)
    return this.dataArray
  }

  getVolumeLevel(): number {
    const data = this.getFrequencyData()
    if (!data) return 0

    const sum = data.reduce((acc, value) => acc + value, 0)
    return sum / data.length / 255 // Normalize to 0-1
  }

  cleanup(): void {
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.dataArray = null
  }
}

// Simple audio utilities for user feedback
export function playClickSound() {
  try {
    // Create a simple click sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch (error) {
    console.warn("Could not play click sound:", error)
  }
}

export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Success sound - ascending notes
    oscillator.frequency.setValueAtTime(523, audioContext.currentTime) // C5
    oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1) // E5
    oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2) // G5

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.warn("Could not play success sound:", error)
  }
}

export function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Error sound - descending notes
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.warn("Could not play error sound:", error)
  }
}

// Haptic feedback for mobile devices
export function vibrate(pattern: number | number[] = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

// Combined feedback function
export function provideFeedback(type: "click" | "success" | "error") {
  switch (type) {
    case "click":
      playClickSound()
      vibrate(50)
      break
    case "success":
      playSuccessSound()
      vibrate([100, 50, 100])
      break
    case "error":
      playErrorSound()
      vibrate([200, 100, 200])
      break
  }
}
