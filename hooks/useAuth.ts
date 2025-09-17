"use client"

import { useState, useEffect } from 'react'
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth'
import { auth, googleProvider, facebookProvider } from '@/lib/firebase'

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
}

interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  providerId: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false) // No splash screen
  const [error, setError] = useState<string | null>(null)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          providerId: firebaseUser.providerData[0]?.providerId || 'unknown'
        })
      } else {
        setUser(null)
      }
      setLoading(false) // Set to false only after Firebase responds
    })

    return () => unsubscribe()
  }, [])

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)
      
      if (!isFirebaseConfigured() || !googleProvider) {
        throw new Error("Firebase authentication is not configured. Please set up environment variables.")
      }
      
      const result = await signInWithPopup(auth, googleProvider!)
      console.log("✅ Google sign in successful:", result.user.displayName)
      return result.user
    } catch (error: any) {
      console.error("❌ Google sign in failed:", error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Facebook Sign In
  const signInWithFacebook = async () => {
    try {
      setError(null)
      setLoading(true)
      
      if (!isFirebaseConfigured() || !facebookProvider) {
        throw new Error("Firebase authentication is not configured. Please set up environment variables.")
      }
      
      const result = await signInWithPopup(auth, facebookProvider!)
      console.log("✅ Facebook sign in successful:", result.user.displayName)
      return result.user
    } catch (error: any) {
      console.error("❌ Facebook sign in failed:", error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign Out
  const signOutUser = async () => {
    try {
      await signOut(auth)
      console.log("✅ Sign out successful")
    } catch (error: any) {
      console.error("❌ Sign out failed:", error)
      setError(error.message)
    }
  }

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithFacebook,
    signOutUser
  }
} 
