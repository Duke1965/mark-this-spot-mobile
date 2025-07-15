"use client"

// Enhanced audio feedback system
export const playEnhancedSound = (soundType: string) => {
  if (typeof window === "undefined") return

  try {
    // Create audio context for better control
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    switch (soundType) {
      case "success-chime":
        playSuccessChime(audioContext)
        break
      case "camera-shutter":
        playCameraShutter(audioContext)
        break
      case "notification":
        playNotification(audioContext)
        break
      case "error":
        playError(audioContext)
        break
      default:
        playClick(audioContext)
    }
  } catch (error) {
    console.warn("Audio not supported:", error)
    // Fallback to vibration if available
    if (navigator.vibrate) {
      navigator.vibrate(100)
    }
  }
}

const playSuccessChime = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // Success chord progression
  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
  oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.5)
}

const playCameraShutter = (audioContext: AudioContext) => {
  // Create a short, sharp click sound
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1)

  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.1)
}

const playNotification = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
  oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.15)

  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.3)
}

const playError = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
  oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.2)

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.4)
}

const playClick = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(1000, audioContext.currentTime)

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.05)
}
