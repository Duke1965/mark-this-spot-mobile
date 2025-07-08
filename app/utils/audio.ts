"use client"

// Enhanced audio system for mobile browsers
export class FartSoundEngine {
  private audioContext: AudioContext | null = null
  private isInitialized = false

  constructor() {
    this.initializeAudio()
  }

  private async initializeAudio() {
    try {
      // Create audio context with better mobile support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext

      if (!AudioContextClass) {
        console.warn("Web Audio API not supported")
        return
      }

      this.audioContext = new AudioContextClass()

      // Handle mobile audio context suspension
      if (this.audioContext.state === "suspended") {
        console.log("Audio context suspended, will resume on user interaction")
      }

      this.isInitialized = true
      console.log("Fart Sound Engine initialized successfully")
    } catch (error) {
      console.error("Failed to initialize audio:", error)
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      await this.initializeAudio()
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume()
        console.log("Audio context resumed")
      } catch (error) {
        console.error("Failed to resume audio context:", error)
      }
    }
  }

  async playFartSound(type: "classic" | "quick" | "squeaky" = "classic") {
    try {
      await this.ensureAudioContext()

      if (!this.audioContext) {
        console.warn("Audio context not available, using fallback")
        this.playFallbackSound(type)
        return
      }

      console.log(`Playing fart sound: ${type}`)

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      const filterNode = this.audioContext.createBiquadFilter()

      // Connect audio nodes
      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Configure filter for more realistic sound
      filterNode.type = "lowpass"
      filterNode.frequency.setValueAtTime(200, this.audioContext.currentTime)

      const currentTime = this.audioContext.currentTime

      switch (type) {
        case "classic":
          // Deep, rumbling fart
          oscillator.type = "sawtooth"
          oscillator.frequency.setValueAtTime(80, currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(40, currentTime + 0.4)
          gainNode.gain.setValueAtTime(0.4, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4)
          filterNode.frequency.exponentialRampToValueAtTime(100, currentTime + 0.4)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.4)
          break

        case "quick":
          // Short, sharp pop
          oscillator.type = "square"
          oscillator.frequency.setValueAtTime(150, currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(80, currentTime + 0.15)
          gainNode.gain.setValueAtTime(0.3, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.15)
          filterNode.frequency.setValueAtTime(300, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.15)
          break

        case "squeaky":
          // High-pitched, squeaky sound
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(250, currentTime)
          oscillator.frequency.linearRampToValueAtTime(180, currentTime + 0.25)
          gainNode.gain.setValueAtTime(0.25, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.25)
          filterNode.frequency.setValueAtTime(400, currentTime)
          filterNode.frequency.linearRampToValueAtTime(200, currentTime + 0.25)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.25)
          break
      }

      console.log(`Fart sound ${type} played successfully`)
    } catch (error) {
      console.error("Failed to play fart sound:", error)
      this.playFallbackSound(type)
    }
  }

  private playFallbackSound(type: string) {
    // Fallback for when Web Audio API fails
    console.log(`🔊 FART SOUND: ${type.toUpperCase()} 💨`)

    // Try to use HTML5 audio as fallback
    try {
      const audio = new Audio()
      audio.volume = 0.5

      // Generate a simple beep as fallback
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.frequency.value = type === "squeaky" ? 800 : type === "quick" ? 400 : 200
      gain.gain.setValueAtTime(0.1, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)

      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)
    } catch (fallbackError) {
      console.log("Even fallback audio failed, but fart sound was attempted! 💨")
    }
  }

  // Test audio system
  async testAudio() {
    console.log("Testing fart sound system...")
    await this.playFartSound("classic")
  }
}

// Global fart sound engine instance
let fartEngine: FartSoundEngine | null = null

export function getFartSoundEngine(): FartSoundEngine {
  if (!fartEngine) {
    fartEngine = new FartSoundEngine()
  }
  return fartEngine
}

export async function playFartSound(type: "classic" | "quick" | "squeaky" = "classic") {
  const engine = getFartSoundEngine()
  await engine.playFartSound(type)
}
