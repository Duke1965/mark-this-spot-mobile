import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

function getBucketName(): string | undefined {
  const raw = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!raw) return undefined
  let name = String(raw).trim()
  if (!name) return undefined

  // Accept common formats users paste into env vars.
  // - gs://my-bucket
  // - https://storage.googleapis.com/my-bucket
  name = name.replace(/^gs:\/\//i, '')
  name = name.replace(/^https?:\/\/storage\.googleapis\.com\//i, '')
  name = name.replace(/\/+$/g, '')
  return name || undefined
}

export function getNormalizedBucketName(): string | undefined {
  return getBucketName()
}

function parseServiceAccountFromEnv(): admin.ServiceAccount | null {
  const raw =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    ''

  const rawBase64 =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    ''

  try {
    if (rawBase64) {
      const decoded = Buffer.from(rawBase64, 'base64').toString('utf8')
      return JSON.parse(decoded)
    }
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through
  }

  // Support split env vars if user prefers that pattern
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  if (clientEmail && privateKey) {
    return {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      projectId
    } as admin.ServiceAccount
  }

  return null
}

export function getAdminApp(): admin.app.App | null {
  try {
    if (admin.apps.length > 0) return admin.apps[0]!

    const serviceAccount = parseServiceAccountFromEnv()
    const storageBucket = getBucketName()
    if (serviceAccount) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        ...(storageBucket ? { storageBucket } : {})
      })
    }

    // Fall back to application default credentials if available (e.g., GCP).
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(storageBucket ? { storageBucket } : {})
    })
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error)
    return null
  }
}

export function getAdminFirestore() {
  const app = getAdminApp()
  if (!app) return null
  try {
    return getFirestore(app)
  } catch (e) {
    console.error('❌ Failed to get Firestore:', e)
    return null
  }
}

export function getAdminStorageBucket(bucketNameOverride?: string) {
  const app = getAdminApp()
  if (!app) return null
  try {
    const storage = getStorage(app)
    const bucketName = bucketNameOverride || getBucketName()
    return bucketName ? storage.bucket(bucketName) : storage.bucket()
  } catch (e) {
    console.error('❌ Failed to get Storage bucket:', e)
    return null
  }
}

