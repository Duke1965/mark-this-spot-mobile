// Validation System for Pin Management
// Ensures data integrity and system reliability
import { PinData } from '@/app/client-page'
import { MAP_LIFECYCLE } from './mapLifecycle'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface PinValidationRules {
  requirePlaceId: boolean
  requireCategory: boolean
  requireScore: boolean
  requireEndorsements: boolean
  maxDownvotes: number
  minEndorsements: number
}

// Default validation rules
const DEFAULT_RULES: PinValidationRules = {
  requirePlaceId: true,
  requireCategory: true,
  requireScore: true,
  requireEndorsements: true,
  maxDownvotes: 100,
  minEndorsements: 0
}

/**
 * Validate a single pin
 */
export function validatePin(pin: PinData, rules: Partial<PinValidationRules> = {}): ValidationResult {
  const validationRules = { ...DEFAULT_RULES, ...rules }
  const errors: string[] = []
  const warnings: string[] = []

  // Basic required fields
  if (!pin.id) {
    errors.push('Pin ID is required')
  }

  if (!pin.latitude || !pin.longitude) {
    errors.push('Pin coordinates are required')
  }

  if (!pin.locationName && !pin.title) {
    errors.push('Pin name is required')
  }

  if (!pin.timestamp) {
    errors.push('Pin timestamp is required')
  }

  // Coordinate validation
  if (pin.latitude !== undefined && (pin.latitude < -90 || pin.latitude > 90)) {
    errors.push('Latitude must be between -90 and 90')
  }

  if (pin.longitude !== undefined && (pin.longitude < -180 || pin.longitude > 180)) {
    errors.push('Longitude must be between -180 and 180')
  }

  // Pin management system validation
  if (validationRules.requirePlaceId && !pin.placeId) {
    errors.push('Place ID is required for pin management system')
  }

  if (validationRules.requireCategory && !pin.category) {
    errors.push('Category is required for pin management system')
  }

  if (validationRules.requireScore && pin.score === undefined) {
    errors.push('Score is required for pin management system')
  }

  if (validationRules.requireEndorsements && pin.totalEndorsements === undefined) {
    errors.push('Total endorsements are required for pin management system')
  }

  // Business logic validation
  if (pin.totalEndorsements !== undefined && pin.totalEndorsements < validationRules.minEndorsements) {
    errors.push(`Total endorsements must be at least ${validationRules.minEndorsements}`)
  }

  if (pin.downvotes !== undefined && pin.downvotes > validationRules.maxDownvotes) {
    errors.push(`Downvotes cannot exceed ${validationRules.maxDownvotes}`)
  }

  if (pin.recentEndorsements !== undefined && pin.totalEndorsements !== undefined) {
    if (pin.recentEndorsements > pin.totalEndorsements) {
      errors.push('Recent endorsements cannot exceed total endorsements')
    }
  }

  // Timestamp validation
  if (pin.timestamp) {
    const timestamp = new Date(pin.timestamp)
    if (isNaN(timestamp.getTime())) {
      errors.push('Invalid timestamp format')
    } else {
      const now = new Date()
      const diffDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
      
      if (diffDays < 0) {
        errors.push('Timestamp cannot be in the future')
      }
      
      if (diffDays > 365 * 10) { // 10 years
        warnings.push('Pin timestamp is very old')
      }
    }
  }

  // Last endorsed validation
  if (pin.lastEndorsedAt) {
    const lastEndorsed = new Date(pin.lastEndorsedAt)
    const created = new Date(pin.timestamp)
    
    if (isNaN(lastEndorsed.getTime())) {
      errors.push('Invalid last endorsed timestamp format')
    } else if (lastEndorsed < created) {
      errors.push('Last endorsed cannot be before creation timestamp')
    }
  }

  // Score validation
  if (pin.score !== undefined) {
    if (typeof pin.score !== 'number' || isNaN(pin.score)) {
      errors.push('Score must be a valid number')
    } else if (pin.score < 0) {
      errors.push('Score cannot be negative')
    } else if (pin.score > 1000) {
      warnings.push('Score is unusually high')
    }
  }

  // Category validation
  if (pin.category) {
    const validCategories = [
      'coffee', 'restaurant', 'museum', 'park', 'shopping', 
      'hotel', 'bar', 'general', 'tourist_attraction', 'cafe',
      'food', 'entertainment', 'nature', 'culture', 'adventure'
    ]
    
    if (!validCategories.includes(pin.category)) {
      warnings.push(`Category '${pin.category}' is not in the standard list`)
    }
  }

  // Enhanced data integrity checks
  if (pin.title && pin.title.length > 200) {
    warnings.push('Pin title is very long (>200 characters)')
  }

  if (pin.description && pin.description.length > 1000) {
    warnings.push('Pin description is very long (>1000 characters)')
  }

  if (pin.tags && pin.tags.length > 20) {
    warnings.push('Pin has many tags (>20)')
  }

  // Remove reference to non-existent aiGenerated property

  // Social validation
  if (pin.totalEndorsements !== undefined && pin.downvotes !== undefined) {
    const ratio = pin.downvotes / (pin.totalEndorsements + pin.downvotes)
    if (ratio > 0.5) {
      warnings.push('Pin has high downvote ratio (>50%)')
    }
  }

  // Media validation
  if (pin.mediaUrl) {
    try {
      new URL(pin.mediaUrl)
    } catch {
      warnings.push('Media URL format may be invalid')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate all pins in a collection
 */
export function validatePinCollection(pins: PinData[], rules: Partial<PinValidationRules> = {}): {
  validPins: PinData[]
  invalidPins: Array<{ pin: PinData; validation: ValidationResult }>
  summary: {
    total: number
    valid: number
    invalid: number
    totalErrors: number
    totalWarnings: number
  }
} {
  const validPins: PinData[] = []
  const invalidPins: Array<{ pin: PinData; validation: ValidationResult }> = []
  let totalErrors = 0
  let totalWarnings = 0

  pins.forEach(pin => {
    const validation = validatePin(pin, rules)
    
    if (validation.isValid) {
      validPins.push(pin)
    } else {
      invalidPins.push({ pin, validation })
    }
    
    totalErrors += validation.errors.length
    totalWarnings += validation.warnings.length
  })

  return {
    validPins,
    invalidPins,
    summary: {
      total: pins.length,
      valid: validPins.length,
      invalid: invalidPins.length,
      totalErrors,
      totalWarnings
    }
  }
}

/**
 * Validate system configuration
 */
export function validateSystemConfig(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    warnings.push('Google Maps API key not found')
  }

  // Validate lifecycle configuration
  Object.entries(MAP_LIFECYCLE).forEach(([key, value]) => {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`Invalid configuration value for ${key}: ${value}`)
    } else if (value <= 0) {
      errors.push(`Configuration value for ${key} must be positive: ${value}`)
    }
  })

  // Validate specific thresholds
  if (MAP_LIFECYCLE.RECENT_WINDOW_DAYS < MAP_LIFECYCLE.TRENDING_WINDOW_DAYS) {
    warnings.push('Recent window should be larger than trending window for optimal performance')
  }

  if (MAP_LIFECYCLE.CLASSICS_MIN_AGE_DAYS < MAP_LIFECYCLE.RECENT_WINDOW_DAYS) {
    warnings.push('Classics minimum age should be larger than recent window')
  }

  if (MAP_LIFECYCLE.DOWNVOTE_HIDE_THRESHOLD < 1) {
    errors.push('Downvote hide threshold must be at least 1')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate data consistency
 */
export function validateDataConsistency(pins: PinData[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for duplicate place IDs
  const placeIds = pins.filter(p => p.placeId).map(p => p.placeId!)
  const duplicatePlaceIds = placeIds.filter((id, index) => placeIds.indexOf(id) !== index)
  
  if (duplicatePlaceIds.length > 0) {
    errors.push(`Found ${duplicatePlaceIds.length} duplicate place IDs`)
  }

  // Check for orphaned pins (pins with placeId but no corresponding place)
  const placeIdSet = new Set(placeIds)
  const orphanedPins = pins.filter(p => p.placeId && !placeIdSet.has(p.placeId))
  
  if (orphanedPins.length > 0) {
    warnings.push(`Found ${orphanedPins.length} pins with invalid place IDs`)
  }

  // Check for data type consistency
  const invalidScoreTypes = pins.filter(p => p.score !== undefined && typeof p.score !== 'number')
  if (invalidScoreTypes.length > 0) {
    errors.push(`Found ${invalidScoreTypes.length} pins with invalid score types`)
  }

  const invalidEndorsementTypes = pins.filter(p => 
    p.totalEndorsements !== undefined && typeof p.totalEndorsements !== 'number'
  )
  if (invalidEndorsementTypes.length > 0) {
    errors.push(`Found ${invalidEndorsementTypes.length} pins with invalid endorsement types`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Get validation report for the entire system
 */
export function getSystemValidationReport(pins: PinData[]): {
  systemConfig: ValidationResult
  dataConsistency: ValidationResult
  pinCollection: {
    validPins: PinData[]
    invalidPins: Array<{ pin: PinData; validation: ValidationResult }>
    summary: {
      total: number
      valid: number
      invalid: number
      totalErrors: number
      totalWarnings: number
    }
  }
  overall: {
    isValid: boolean
    totalErrors: number
    totalWarnings: number
    recommendations: string[]
  }
} {
  const systemConfig = validateSystemConfig()
  const dataConsistency = validateDataConsistency(pins)
  const pinCollection = validatePinCollection(pins)

  const totalErrors = systemConfig.errors.length + dataConsistency.errors.length + pinCollection.summary.totalErrors
  const totalWarnings = systemConfig.warnings.length + dataConsistency.warnings.length + pinCollection.summary.totalWarnings

  const recommendations: string[] = []
  
  if (pinCollection.summary.invalid > 0) {
    recommendations.push(`Fix ${pinCollection.summary.invalid} invalid pins`)
  }
  
  if (dataConsistency.errors.length > 0) {
    recommendations.push('Resolve data consistency issues')
  }
  
  if (systemConfig.warnings.length > 0) {
    recommendations.push('Review system configuration warnings')
  }

  return {
    systemConfig,
    dataConsistency,
    pinCollection,
    overall: {
      isValid: totalErrors === 0,
      totalErrors,
      totalWarnings,
      recommendations
    }
  }
} 
