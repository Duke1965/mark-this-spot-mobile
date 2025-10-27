import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFirestore } from 'firebase/firestore'
import { getItem, setItem, removeItem } from '@/lib/serverStore'
import { logger } from '@/lib/logger'

// Firebase configuration
// Environment variables should be set in production for full functionality
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
}

// Validate Firebase configuration
const isFirebaseConfigured = () => {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)
}

// Log configuration status for debugging
if (typeof window !== "undefined") {
  if (isFirebaseConfigured()) {
    logger.info("🔥 Firebase: Configuration loaded successfully", undefined, 'Firebase')
  } else {
    logger.info("🔥 Firebase: Using demo mode - set environment variables for full functionality", undefined, 'Firebase')
  }
}

// Initialize Firebase only if properly configured
let app: any = null
let auth: any = null
let storage: any = null
let firestore: any = null

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    storage = getStorage(app)
    firestore = getFirestore(app)
    
    // Enable persistence
    setPersistence(auth, browserLocalPersistence)
  } else {
    // Create mock objects for demo mode
    auth = {
      currentUser: null,
      onAuthStateChanged: (callback: (user: any) => void) => {
        // Call callback with null user immediately for demo mode
        setTimeout(() => callback(null), 0)
        return () => {} // Return unsubscribe function
      },
    }
    
    storage = {
      ref: () => ({
        put: async () => ({ ref: { getDownloadURL: () => Promise.resolve('mock-url') } })
      })
    }
    
    firestore = {}
  }
} catch (error) {
  logger.error("🔥 Firebase initialization failed", error, 'Firebase')
  // Fallback mock objects
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: (user: any) => void) => {
      setTimeout(() => callback(null), 0)
      return () => {}
    },
  }
  
  storage = {
    ref: () => ({
      put: async () => ({ ref: { getDownloadURL: () => Promise.resolve('mock-url') } })
    })
  }
  
  firestore = {}
}

export { auth, storage, firestore }

// Auth providers (only initialize if Firebase is configured)
export const googleProvider = isFirebaseConfigured() ? new GoogleAuthProvider() : null
export const facebookProvider = isFirebaseConfigured() ? new FacebookAuthProvider() : null

// Configure providers only if they exist
if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  })
}

if (facebookProvider) {
  facebookProvider.setCustomParameters({
    display: 'popup'
  })
}

export default app 
