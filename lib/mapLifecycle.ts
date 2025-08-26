// Map Lifecycle Configuration
// Configurable thresholds for pin management system
export const MAP_LIFECYCLE = {
  RECENT_WINDOW_DAYS: parseInt(process.env.NEXT_PUBLIC_MAP_RECENT_WINDOW_DAYS || '90'),
  TRENDING_WINDOW_DAYS: parseInt(process.env.NEXT_PUBLIC_MAP_TRENDING_WINDOW_DAYS || '14'),
  TRENDING_MIN_BURST: parseInt(process.env.NEXT_PUBLIC_MAP_TRENDING_MIN_BURST || '5'),
  CLASSICS_MIN_AGE_DAYS: parseInt(process.env.NEXT_PUBLIC_MAP_CLASSICS_MIN_AGE_DAYS || '180'),
  CLASSICS_MIN_TOTAL_ENDORSEMENTS: parseInt(process.env.NEXT_PUBLIC_MAP_CLASSICS_MIN_TOTAL_ENDORSEMENTS || '10'),
  DOWNVOTE_HIDE_THRESHOLD: parseInt(process.env.NEXT_PUBLIC_MAP_DOWNVOTE_HIDE_THRESHOLD || '10'),
  DECAY_HALF_LIFE_DAYS: parseInt(process.env.NEXT_PUBLIC_MAP_DECAY_HALF_LIFE_DAYS || '30'),
}

// Feature flag for dark-launch
export const FEATURE_MAP_LIFECYCLE = process.env.NEXT_PUBLIC_FEATURE_MAP_LIFECYCLE === 'true'

// Helper function to check if feature is enabled
export const isMapLifecycleEnabled = (): boolean => {
  return FEATURE_MAP_LIFECYCLE
} 
