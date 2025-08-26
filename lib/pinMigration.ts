// Pin Migration Helper
// Upgrades existing pins to the new pin management system
import { PinData } from '@/app/page'
import { MAP_LIFECYCLE } from './mapLifecycle'
import { daysAgo } from './trending'

/**
 * Migrate existing pin to new pin management system
 * @param pin Existing pin data
 * @returns Upgraded pin with new fields
 */
export function migratePinToNewSystem(pin: PinData): PinData {
  // If already migrated, return as-is
  if (pin.placeId !== undefined) {
    return pin
  }

  const now = new Date().toISOString()
  const daysSinceCreation = daysAgo(pin.timestamp)
  
  // Generate a unique place ID for this pin
  const placeId = `place_${pin.id}`
  
  // Determine category from existing data
  const category = determineCategory(pin)
  
  // Calculate initial endorsements (1 for the creator)
  const totalEndorsements = 1
  const recentEndorsements = daysSinceCreation <= MAP_LIFECYCLE.RECENT_WINDOW_DAYS ? 1 : 0
  
  // Initial score based on creation
  const initialScore = 1.0 // Full weight for new creation
  
  return {
    ...pin,
    placeId,
    category,
    totalEndorsements,
    recentEndorsements,
    lastEndorsedAt: pin.timestamp,
    score: initialScore,
    downvotes: 0,
    isHidden: false,
  }
}

/**
 * Determine place category from existing pin data
 * @param pin Pin data to analyze
 * @returns Category string
 */
function determineCategory(pin: PinData): string {
  // Try to extract category from existing data
  if (pin.types && pin.types.length > 0) {
    const primaryType = pin.types[0]
    return mapGoogleTypeToCategory(primaryType)
  }
  
  if (pin.tags && pin.tags.length > 0) {
    // Look for category-like tags
    const categoryTags = pin.tags.filter(tag => 
      ['coffee', 'restaurant', 'museum', 'park', 'shopping', 'hotel', 'bar', 'cafe'].includes(tag.toLowerCase())
    )
    if (categoryTags.length > 0) {
      return categoryTags[0].toLowerCase()
    }
  }
  
  // Default category based on title/description
  const text = `${pin.title} ${pin.description || ''}`.toLowerCase()
  if (text.includes('coffee') || text.includes('cafe')) return 'coffee'
  if (text.includes('restaurant') || text.includes('food')) return 'restaurant'
  if (text.includes('museum') || text.includes('gallery')) return 'museum'
  if (text.includes('park') || text.includes('garden')) return 'park'
  if (text.includes('shopping') || text.includes('mall')) return 'shopping'
  if (text.includes('hotel') || text.includes('accommodation')) return 'hotel'
  if (text.includes('bar') || text.includes('pub')) return 'bar'
  
  return 'general'
}

/**
 * Map Google Places types to our category system
 * @param googleType Google Places type
 * @returns Category string
 */
function mapGoogleTypeToCategory(googleType: string): string {
  const typeMap: Record<string, string> = {
    'restaurant': 'restaurant',
    'cafe': 'coffee',
    'bar': 'bar',
    'museum': 'museum',
    'park': 'park',
    'shopping_mall': 'shopping',
    'art_gallery': 'museum',
    'amusement_park': 'park',
    'zoo': 'park',
    'aquarium': 'museum',
    'lodging': 'hotel',
    'establishment': 'general',
    'point_of_interest': 'general',
    'tourist_attraction': 'general',
  }
  
  return typeMap[googleType] || 'general'
}

/**
 * Migrate all pins in localStorage to new system
 * @returns Array of migrated pins
 */
export function migrateAllPins(): PinData[] {
  try {
    const pinsJson = localStorage.getItem('pinit-pins')
    if (!pinsJson) return []
    
    const pins: PinData[] = JSON.parse(pinsJson)
    const migratedPins = pins.map(migratePinToNewSystem)
    
    // Save migrated pins back to localStorage
    localStorage.setItem('pinit-pins', JSON.stringify(migratedPins))
    
    console.log(`✅ Migrated ${migratedPins.length} pins to new system`)
    return migratedPins
  } catch (error) {
    console.error('❌ Error migrating pins:', error)
    return []
  }
}

/**
 * Check if pins need migration
 * @returns True if migration is needed
 */
export function needsPinMigration(): boolean {
  try {
    const pinsJson = localStorage.getItem('pinit-pins')
    if (!pinsJson) return false
    
    const pins: PinData[] = JSON.parse(pinsJson)
    return pins.some(pin => pin.placeId === undefined)
  } catch (error) {
    console.error('❌ Error checking migration status:', error)
    return false
  }
} 
