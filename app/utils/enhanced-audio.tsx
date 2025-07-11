"use client"

// Enhanced Sound Library with Categories
const ENHANCED_SOUND_URLS = {
  // Achievement Sounds
  "success-chime": "/sounds/success-chime.mp3",
  fanfare: "/sounds/fanfare.mp3",
  "magic-sparkle": "/sounds/magic-sparkle.mp3",
  "coin-collect": "/sounds/coin-collect.mp3",
  "power-up": "/sounds/power-up.mp3",
  victory: "/sounds/victory.mp3",

  // Nature Sounds
  "bird-chirp": "/sounds/bird-chirp.mp3",
  "water-drop": "/sounds/water-drop.mp3",
  "wind-chime": "/sounds/wind-chime.mp3",
  "ocean-wave": "/sounds/ocean-wave.mp3",
  "forest-birds": "/sounds/forest-birds.mp3",

  // Fun & Quirky Sounds
  "rubber-duck": "/sounds/rubber-duck.mp3",
  "cartoon-pop": "/sounds/cartoon-pop.mp3",
  "spring-boing": "/sounds/spring-boing.mp3",
  "bubble-pop": "/sounds/bubble-pop.mp3",

  // Captain's Special Collection 💨
  "gentle-toot": "/sounds/farts/gentle-toot.mp3",
  "squeaky-door": "/sounds/farts/squeaky-door.mp3",
  "air-release": "/sounds/farts/air-release.mp3",
  "trumpet-call": "/sounds/farts/trumpet-call.mp3",
  "whoopee-cushion": "/sounds/farts/whoopee-cushion.mp3",
  "steam-engine": "/sounds/farts/steam-engine.mp3",
  "duck-call": "/sounds/farts/duck-call.mp3",
  "balloon-squeak": "/sounds/farts/balloon-squeak.mp3",
}

// Enhanced tone generation with more variety
function generateEnhancedTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
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

// Enhanced tone mapping with more creative sounds
const ENHANCED_TONE_MAPPING = {
  // Achievement Sounds
  "success-chime": () => generateEnhancedTone(800, 0.3, "sine"),
  fanfare: () => generateEnhancedTone(600, 0.5, "triangle"),
  "magic-sparkle": () => generateEnhancedTone(1000, 0.2, "sine"),
  "coin-collect": () => generateEnhancedTone(700, 0.2, "square"),
  "power-up": () => generateEnhancedTone(500, 0.4, "sawtooth"),
  victory: () => generateEnhancedTone(900, 0.6, "triangle"),

  // Nature Sounds
  "bird-chirp": () => generateEnhancedTone(1200, 0.15, "sine"),
  "water-drop": () => generateEnhancedTone(400, 0.3, "sine"),
  "wind-chime": () => generateEnhancedTone(1100, 0.4, "triangle"),
  "ocean-wave": () => generateEnhancedTone(200, 0.8, "sine", 0.2),
  "forest-birds": () => generateEnhancedTone(1000, 0.5, "sine", 0.25),

  // Fun & Quirky Sounds
  "rubber-duck": () => generateEnhancedTone(350, 0.2, "square"),
  "cartoon-pop": () => generateEnhancedTone(800, 0.1, "square"),
  "spring-boing": () => generateEnhancedTone(300, 0.4, "sawtooth"),
  "bubble-pop": () => generateEnhancedTone(600, 0.15, "sine"),

  // Captain's Special Collection 💨
  "gentle-toot": () => generateEnhancedTone(150, 0.3, "sawtooth", 0.4),
  "squeaky-door": () => generateEnhancedTone(250, 0.4, "square", 0.3),
  "air-release": () => generateEnhancedTone(180, 0.5, "sawtooth", 0.35),
  "trumpet-call": () => generateEnhancedTone(220, 0.6, "triangle", 0.4),
  "whoopee-cushion": () => generateEnhancedTone(160, 0.4, "square", 0.45),
  "steam-engine": () => generateEnhancedTone(200, 0.7, "sawtooth", 0.3),
  "duck-call": () => generateEnhancedTone(280, 0.3, "triangle", 0.4),
  "balloon-squeak": () => generateEnhancedTone(320, 0.25, "square", 0.35),
}

export const enhancedSoundCategories = {
  "Achievement Sounds": {
    "success-chime": { name: "Success Chime", emoji: "🔔", description: "Satisfying ding!" },
    fanfare: { name: "Fanfare", emoji: "🎺", description: "Triumphant trumpet" },
    "magic-sparkle": { name: "Magic Sparkle", emoji: "✨", description: "Whimsical chime" },
    "coin-collect": { name: "Coin Collect", emoji: "🪙", description: "Classic arcade" },
    "power-up": { name: "Power-Up", emoji: "⭐", description: "Level complete" },
    victory: { name: "Victory", emoji: "🎊", description: "Celebration sound" },
  },
  "Nature Sounds": {
    "bird-chirp": { name: "Bird Chirp", emoji: "🐦", description: "Pleasant & universal" },
    "water-drop": { name: "Water Drop", emoji: "💧", description: "Zen-like" },
    "wind-chime": { name: "Wind Chime", emoji: "🎐", description: "Peaceful" },
    "ocean-wave": { name: "Ocean Wave", emoji: "🌊", description: "Calming waves" },
    "forest-birds": { name: "Forest Birds", emoji: "🌲", description: "Nature symphony" },
  },
  "Fun & Quirky": {
    "rubber-duck": { name: "Rubber Duck", emoji: "🦆", description: "Squeaky fun" },
    "cartoon-pop": { name: "Cartoon Pop", emoji: "💥", description: "Playful pop" },
    "spring-boing": { name: "Spring Boing", emoji: "🌀", description: "Bouncy sound" },
    "bubble-pop": { name: "Bubble Pop", emoji: "🫧", description: "Satisfying pop" },
  },
  "Captain's Special 💨": {
    "gentle-toot": { name: "Gentle Toot", emoji: "💨", description: "Subtle & classy" },
    "squeaky-door": { name: "Squeaky Door", emoji: "🚪", description: "Needs some oil!" },
    "air-release": { name: "Air Release", emoji: "🎈", description: "Pressure relief" },
    "trumpet-call": { name: "Trumpet Call", emoji: "🎺", description: "Musical announcement" },
    "whoopee-cushion": { name: "Whoopee Cushion", emoji: "🪑", description: "Classic prank" },
    "steam-engine": { name: "Steam Engine", emoji: "🚂", description: "All aboard!" },
    "duck-call": { name: "Duck Call", emoji: "🦆", description: "Quack attack" },
    "balloon-squeak": { name: "Balloon Squeak", emoji: "🎈", description: "Party time" },
  },
}

export async function playEnhancedSound(soundId: string): Promise<void> {
  try {
    console.log(`🎵 Playing enhanced sound: ${soundId}`)

    // First try to play actual audio file
    const soundUrl = ENHANCED_SOUND_URLS[soundId as keyof typeof ENHANCED_SOUND_URLS]
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
    const toneGenerator = ENHANCED_TONE_MAPPING[soundId as keyof typeof ENHANCED_TONE_MAPPING]
    if (toneGenerator) {
      await toneGenerator()
      console.log(`✅ Enhanced tone played: ${soundId}`)
    } else {
      console.warn(`⚠️ Unknown sound ID: ${soundId}`)
      // Default fallback tone
      await generateEnhancedTone(600, 0.3)
    }
  } catch (error) {
    console.error(`❌ Failed to play enhanced sound ${soundId}:`, error)
  }
}

export function preloadEnhancedSounds(): void {
  Object.entries(ENHANCED_SOUND_URLS).forEach(([soundId, url]) => {
    const audio = new Audio(url)
    audio.preload = "auto"
    audio.volume = 0.5
    console.log(`🔄 Preloading enhanced sound: ${soundId}`)
  })
}
