"use client"

// Enhanced audio system with professional sounds
export class SoundEngine {
  private audioContext: AudioContext | null = null
  private isInitialized = false

  constructor() {
    this.initializeAudio()
  }

  private async initializeAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext

      if (!AudioContextClass) {
        console.warn("Web Audio API not supported")
        return
      }

      this.audioContext = new AudioContextClass()

      if (this.audioContext.state === "suspended") {
        console.log("Audio context suspended, will resume on user interaction")
      }

      this.isInitialized = true
      console.log("Sound Engine initialized successfully")
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

  async playSound(type = "success-chime") {
    try {
      await this.ensureAudioContext()

      if (!this.audioContext) {
        console.warn("Audio context not available, using fallback")
        this.playFallbackSound(type)
        return
      }

      console.log(`Playing sound: ${type}`)

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      const filterNode = this.audioContext.createBiquadFilter()

      oscillator.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      filterNode.type = "lowpass"
      const currentTime = this.audioContext.currentTime

      switch (type) {
        // ACHIEVEMENT SOUNDS
        case "success-chime":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(523, currentTime) // C5
          oscillator.frequency.setValueAtTime(659, currentTime + 0.1) // E5
          oscillator.frequency.setValueAtTime(784, currentTime + 0.2) // G5
          gainNode.gain.setValueAtTime(0.3, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4)
          filterNode.frequency.setValueAtTime(2000, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.4)
          break

        case "fanfare":
          oscillator.type = "square"
          oscillator.frequency.setValueAtTime(440, currentTime) // A4
          oscillator.frequency.setValueAtTime(554, currentTime + 0.15) // C#5
          oscillator.frequency.setValueAtTime(659, currentTime + 0.3) // E5
          oscillator.frequency.setValueAtTime(880, currentTime + 0.45) // A5
          gainNode.gain.setValueAtTime(0.4, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.6)
          filterNode.frequency.setValueAtTime(1500, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.6)
          break

        case "magic-sparkle":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(1047, currentTime) // C6
          oscillator.frequency.exponentialRampToValueAtTime(2093, currentTime + 0.1) // C7
          oscillator.frequency.exponentialRampToValueAtTime(1568, currentTime + 0.2) // G6
          gainNode.gain.setValueAtTime(0.2, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3)
          filterNode.frequency.setValueAtTime(3000, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.3)
          break

        // RETRO GAME SOUNDS
        case "coin-collect":
          oscillator.type = "square"
          oscillator.frequency.setValueAtTime(988, currentTime) // B5
          oscillator.frequency.setValueAtTime(1319, currentTime + 0.1) // E6
          gainNode.gain.setValueAtTime(0.3, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2)
          filterNode.frequency.setValueAtTime(2000, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.2)
          break

        case "power-up":
          oscillator.type = "sawtooth"
          oscillator.frequency.setValueAtTime(220, currentTime) // A3
          oscillator.frequency.exponentialRampToValueAtTime(440, currentTime + 0.2) // A4
          oscillator.frequency.exponentialRampToValueAtTime(880, currentTime + 0.4) // A5
          gainNode.gain.setValueAtTime(0.3, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5)
          filterNode.frequency.setValueAtTime(1000, currentTime)
          filterNode.frequency.exponentialRampToValueAtTime(2000, currentTime + 0.5)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.5)
          break

        case "victory":
          oscillator.type = "triangle"
          oscillator.frequency.setValueAtTime(523, currentTime) // C5
          oscillator.frequency.setValueAtTime(659, currentTime + 0.15) // E5
          oscillator.frequency.setValueAtTime(784, currentTime + 0.3) // G5
          oscillator.frequency.setValueAtTime(1047, currentTime + 0.45) // C6
          gainNode.gain.setValueAtTime(0.4, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.6)
          filterNode.frequency.setValueAtTime(1500, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.6)
          break

        // NATURE SOUNDS
        case "bird-chirp":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(2000, currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(3000, currentTime + 0.05)
          oscillator.frequency.exponentialRampToValueAtTime(2500, currentTime + 0.1)
          oscillator.frequency.exponentialRampToValueAtTime(2800, currentTime + 0.15)
          gainNode.gain.setValueAtTime(0.2, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2)
          filterNode.frequency.setValueAtTime(4000, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.2)
          break

        case "water-drop":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(800, currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(200, currentTime + 0.3)
          gainNode.gain.setValueAtTime(0.3, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4)
          filterNode.frequency.setValueAtTime(1000, currentTime)
          filterNode.frequency.exponentialRampToValueAtTime(300, currentTime + 0.4)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.4)
          break

        case "wind-chime":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(1047, currentTime) // C6
          oscillator.frequency.setValueAtTime(1319, currentTime + 0.2) // E6
          oscillator.frequency.setValueAtTime(1568, currentTime + 0.4) // G6
          gainNode.gain.setValueAtTime(0.15, currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.8)
          filterNode.frequency.setValueAtTime(2000, currentTime)
          oscillator.start(currentTime)
          oscillator.stop(currentTime + 0.8)
          break

        default:
          // Default to success chime
          this.playSound("success-chime")
          return
      }

      console.log(`Sound ${type} played successfully`)
    } catch (error) {
      console.error("Failed to play sound:", error)
      this.playFallbackSound(type)
    }
  }

  private playFallbackSound(type: string) {
    console.log(`🔊 SOUND: ${type.toUpperCase()} 🎵`)
  }

  async testAudio() {
    console.log("Testing sound system...")
    await this.playSound("success-chime")
  }
}

// Global sound engine instance
let soundEngine: SoundEngine | null = null

export function getSoundEngine(): SoundEngine {
  if (!soundEngine) {
    soundEngine = new SoundEngine()
  }
  return soundEngine
}

export async function playSound(type = "success-chime") {
  const engine = getSoundEngine()
  await engine.playSound(type)
}
