"use client"

// Audio file URLs - these would typically be hosted assets
const SOUND_URLS = {
  "success-chime": "/sounds/success-chime.mp3",
  fanfare: "/sounds/fanfare.mp3",
  "magic-sparkle": "/sounds/magic-sparkle.mp3",
  "coin-collect": "/sounds/coin-collect.mp3",
  "power-up": "/sounds/power-up.mp3",
  victory: "/sounds/victory.mp3",
  "bird-chirp": "/sounds/bird-chirp.mp3",
  "water-drop": "/sounds/water-drop.mp3",
  "wind-chime": "/sounds/wind-chime.mp3",
}

// Fallback: Generate simple tones using Web Audio API
function generateTone(frequency: number, duration: number, type: OscillatorType = "sine"): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)

      oscillator.onended = () => {
        audioContext.close()
        resolve()
      }
    } catch (error) {
      console.warn("⚠️ Web Audio API not available:", error)
      resolve()
    }
  })
}

// Generate different tones for different sound types
const TONE_MAPPING = {
  "success-chime": () => generateTone(800, 0.3),
  fanfare: () => generateTone(600, 0.5),
  "magic-sparkle": () => generateTone(1000, 0.2),
  "coin-collect": () => generateTone(700, 0.2),
  "power-up": () => generateTone(500, 0.4),
  victory: () => generateTone(900, 0.6),
  "bird-chirp": () => generateTone(1200, 0.15),
  "water-drop": () => generateTone(400, 0.3),
  "wind-chime": () => generateTone(1100, 0.4),
}

export async function playSound(soundId: string): Promise<void> {
  try {
    console.log(`🎵 Playing sound: ${soundId}`)

    // First try to play actual audio file
    const soundUrl = SOUND_URLS[soundId as keyof typeof SOUND_URLS]
    if (soundUrl) {
      const audio = new Audio(soundUrl)
      audio.volume = 0.5

      try {
        await audio.play()
        console.log(`✅ Audio file played: ${soundId}`)
        return
      } catch (audioError) {
        console.warn(`⚠️ Audio file failed, falling back to tone: ${soundId}`, audioError)
      }
    }

    // Fallback to generated tone
    const toneGenerator = TONE_MAPPING[soundId as keyof typeof TONE_MAPPING]
    if (toneGenerator) {
      await toneGenerator()
      console.log(`✅ Tone played: ${soundId}`)
    } else {
      console.warn(`⚠️ Unknown sound ID: ${soundId}`)
      // Default fallback tone
      await generateTone(600, 0.3)
    }
  } catch (error) {
    console.error(`❌ Failed to play sound ${soundId}:`, error)
  }
}

export function preloadSounds(): void {
  Object.entries(SOUND_URLS).forEach(([soundId, url]) => {
    const audio = new Audio(url)
    audio.preload = "auto"
    audio.volume = 0.5
    console.log(`🔄 Preloading sound: ${soundId}`)
  })
}
