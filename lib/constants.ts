// Centralized Constants for PINIT
// All configuration values, magic numbers, and app settings

// App Configuration
export const APP_CONFIG = {
  NAME: 'PINIT',
  VERSION: '1.0.0',
  TAGLINE: 'Find It. Pin It. Share It.',
  DESCRIPTION: 'The Shazam for Travel - Discover and share amazing places',
} as const

// Location & GPS Settings
export const LOCATION_CONFIG = {
  // High accuracy settings
  HIGH_ACCURACY_TIMEOUT: 15000, // 15 seconds
  HIGH_ACCURACY_MAX_AGE: 60000, // 1 minute
  
  // Mobile optimized settings
  MOBILE_TIMEOUT: 10000, // 10 seconds
  MOBILE_MAX_AGE: 120000, // 2 minutes
  
  // Speed calculation
  MIN_SPEED_FOR_PINNING: 5, // km/h
  SPEED_CALCULATION_DISTANCE: 100, // meters
  
  // Reverse geocoding
  GEOCODING_CACHE_DURATION: 300000, // 5 minutes
  GEOCODING_RETRY_ATTEMPTS: 3,
} as const

// UI & Performance Settings
export const UI_CONFIG = {
  // Debouncing
  LOCATION_NAME_DEBOUNCE_MOBILE: 2000, // 2 seconds
  LOCATION_NAME_DEBOUNCE_DESKTOP: 500, // 500ms
  APP_STATE_SAVE_DEBOUNCE: 1000, // 1 second
  AI_BEHAVIOR_SAVE_DEBOUNCE: 2000, // 2 seconds
  
  // Animation & Timing
  PULSING_ANIMATION_DURATION: 2000, // 2 seconds
  AUTO_RETURN_TIMER: 5, // 5 seconds
  LOADING_SPINNER_DELAY: 300, // 300ms
  
  // Mobile optimization
  MOBILE_BREAKPOINT: 768, // pixels
  CAMERA_MOBILE_WIDTH: 1280,
  CAMERA_DESKTOP_WIDTH: 1920,
  CAMERA_MOBILE_HEIGHT: 720,
  CAMERA_DESKTOP_HEIGHT: 1080,
  
  // AI intervals
  AI_SUGGESTION_INTERVAL_MOBILE: 120000, // 2 minutes
  AI_SUGGESTION_INTERVAL_DESKTOP: 60000, // 1 minute
} as const

// Storage & Data Settings
export const STORAGE_CONFIG = {
  // LocalStorage keys
  PINS_KEY: 'pinit-pins',
  APP_STATE_KEY: 'pinit-app-state',
  USER_PROFILE_KEY: 'userProfile',
  AI_BEHAVIORS_KEY: 'pinit-ai-behaviors',
  AI_PREFERENCES_KEY: 'pinit-ai-preferences',
  AI_INSIGHTS_KEY: 'pinit-ai-insights',
  SYNC_TIMESTAMP_KEY: 'pinit-sync-timestamp',
  
  // Data limits
  MAX_PINS_STORAGE: 1000,
  MAX_PINS_MOBILE_FALLBACK: 50,
  MAX_AI_BEHAVIORS: 100,
  MAX_BACKUP_RETENTION_DAYS: 30,
  
  // Export settings
  EXPORT_VERSION: '1.0',
  BACKUP_PREFIX: 'pinit-backup-',
  EMERGENCY_PREFIX: 'pinit-emergency-',
} as const

// API & Network Settings
export const API_CONFIG = {
  // Timeouts
  FETCH_TIMEOUT: 15000, // 15 seconds
  PLACES_API_TIMEOUT: 10000, // 10 seconds
  
  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // 1 second
  RETRY_DELAY_MULTIPLIER: 2,
  
  // Google Maps
  STATIC_MAP_SIZE: '300x300',
  STATIC_MAP_ZOOM: 15,
  STATIC_MAP_SCALE: 2,
  
  // Places API
  NEARBY_SEARCH_RADIUS: 5000, // 5km
  MAX_PLACES_RESULTS: 20,
} as const

// Social Platform Settings
export const SOCIAL_CONFIG = {
  // Character limits
  TWITTER_MAX_LENGTH: 280,
  INSTAGRAM_MAX_LENGTH: 2200,
  FACEBOOK_MAX_LENGTH: 63206,
  WHATSAPP_MAX_LENGTH: 4096,
  TIKTOK_MAX_LENGTH: 2200,
  LINKEDIN_MAX_LENGTH: 3000,
  
  // Default hashtags
  DEFAULT_HASHTAGS: ['PINIT', 'Discovery', 'Travel'],
  PLATFORM_SPECIFIC_HASHTAGS: {
    instagram: ['TravelGram', 'Wanderlust'],
    tiktok: ['TikTokTravel', 'Explore'],
    linkedin: ['Business', 'Networking'],
    twitter: ['PINITApp'],
  },
} as const

// Validation Rules
export const VALIDATION_CONFIG = {
  // Pin validation
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
  
  // Content limits
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_TAGS_COUNT: 20,
  MAX_DOWNVOTE_RATIO: 0.5, // 50%
  
  // Categories
  VALID_CATEGORIES: [
    'coffee', 'restaurant', 'museum', 'park', 'shopping', 
    'hotel', 'bar', 'general', 'tourist_attraction', 'cafe',
    'food', 'entertainment', 'nature', 'culture', 'adventure'
  ],
  
  // Pin management
  MAX_DOWNVOTES: 100,
  MIN_ENDORSEMENTS: 0,
  MAX_AGE_YEARS: 10,
} as const

// AI & ML Settings
export const AI_CONFIG = {
  // Behavior tracking
  MAX_BEHAVIOR_HISTORY: 100,
  CONFIDENCE_THRESHOLD: 0.7,
  
  // Recommendation settings
  MAX_RECOMMENDATIONS: 10,
  RECOMMENDATION_RADIUS: 10000, // 10km
  
  // Personality categories
  PERSONALITY_CATEGORIES: [
    'food', 'adventure', 'culture', 'nature', 'shopping',
    'nightlife', 'history', 'art', 'sports', 'relaxation'
  ],
  
  // Content generation
  TITLE_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 200,
  MAX_TAGS_GENERATED: 5,
} as const

// Error Messages
export const ERROR_MESSAGES = {
  LOCATION_PERMISSION_DENIED: 'Location access denied. Please enable location services.',
  LOCATION_UNAVAILABLE: 'Location unavailable. Please check your GPS settings.',
  LOCATION_TIMEOUT: 'Location request timed out. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  STORAGE_QUOTA_EXCEEDED: 'Storage full. Some old pins may have been removed.',
  FIREBASE_NOT_CONFIGURED: 'Authentication not available. Please contact support.',
  GOOGLE_MAPS_ERROR: 'Map services unavailable. Using fallback map.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  PIN_CREATED: 'Pin created successfully! 📍',
  PIN_SAVED: 'Pin saved to your library! 💾',
  PHOTO_CAPTURED: 'Photo captured! 📸',
  VIDEO_RECORDED: 'Video recorded! 🎥',
  SHARED_SUCCESSFULLY: 'Shared successfully! 🚀',
  BACKUP_CREATED: 'Backup created! 📦',
  DATA_EXPORTED: 'Data exported! 📤',
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_OFFLINE_MODE: true,
  ENABLE_AUTO_HEALING: true,
  ENABLE_AI_RECOMMENDATIONS: true,
  ENABLE_SOCIAL_SHARING: true,
  ENABLE_COMMUNITY_FEATURES: true,
  ENABLE_ADVANCED_CAMERA: true,
  ENABLE_STORY_MODE: true,
  ENABLE_PROACTIVE_AI: true,
} as const 
