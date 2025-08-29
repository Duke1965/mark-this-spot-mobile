# PINIT Code Organization Guide

## 📁 Project Structure

### `/app` - Next.js App Router
- `layout.tsx` - Root layout with metadata and global styles
- `page.tsx` - Wrapper component with SSR disabled
- `client-page.tsx` - Main application logic (client-only)
- `viewport.ts` - Viewport configuration for mobile optimization

### `/components` - React Components
```
/ui/           - Reusable UI components (buttons, modals, etc.)
/components/   - Feature-specific components
```

**Core Components:**
- `ReliableCamera.tsx` - Camera capture with mobile optimization
- `SocialShare.tsx` - Multi-platform sharing with direct integration
- `SettingsPage.tsx` - User onboarding and profile management
- `PinResults.tsx` - Pin details with community features
- `AIRecommendationsHub.tsx` - AI-powered location recommendations

### `/hooks` - Custom React Hooks
- `useLocationServices.ts` - GPS tracking and geocoding
- `usePinStorage.ts` - Local storage with validation and backup
- `useMotionDetection.ts` - Speed calculation for pin placement
- `useAIBehaviorTracker.ts` - User behavior analysis for AI
- `useAuth.ts` - Firebase authentication

### `/lib` - Utility Libraries
**Core Systems:**
- `constants.ts` - Centralized configuration and magic numbers
- `helpers.ts` - Common utility functions
- `types.ts` - TypeScript interfaces and types
- `validation.ts` - Data validation and integrity checks

**Specialized Systems:**
- `dataHealing.ts` - Automatic data corruption detection/repair
- `dataSync.ts` - Multi-device synchronization
- `firebase.ts` - Firebase configuration and initialization
- `pinMigration.ts` - Data structure migration system

**Feature Libraries:**
- `analytics.ts` - User behavior tracking
- `scoringEngine.ts` - Pin ranking and recommendation scoring
- `trending.ts` - Trending location detection
- `reverseGeocode.ts` - Location name resolution

### `/api` - Next.js API Routes
- `places/route.ts` - Google Places API integration
- `pin-management/` - Pin lifecycle management
- `endorse/route.ts` - Pin endorsement system
- `downvote/route.ts` - Pin downvoting system

## 🏗️ Architecture Principles

### 1. **Client-Side First**
- Main app logic runs client-only to access browser APIs
- SSR disabled for components requiring `window`/`navigator`
- Progressive enhancement for better mobile experience

### 2. **Performance Optimization**
- Lazy loading for large components (`dynamic` imports)
- Debounced updates for location and AI behavior
- Mobile-specific optimizations (timeouts, accuracy, intervals)
- Memory management (limited storage, cleanup routines)

### 3. **Data Integrity**
- Comprehensive validation system
- Automatic data healing on startup
- Backup creation before any data changes
- Migration system for schema updates

### 4. **Error Resilience**
- Retry logic with exponential backoff
- Fallback systems (OpenStreetMap when Google fails)
- Graceful degradation for missing APIs
- Network connectivity monitoring

### 5. **Modular Design**
- Centralized constants and configuration
- Reusable utility functions
- Type-safe interfaces
- Feature flags for conditional functionality

## 🔧 Development Workflow

### Code Standards
1. **Imports Organization:**
   ```typescript
   // React core imports
   // Next.js imports  
   // Icon imports
   // Custom hooks
   // Utility functions
   // UI Components
   ```

2. **Function Organization:**
   - Helper functions defined before usage (hoisting prevention)
   - Centralized utilities in `/lib/helpers.ts`
   - Component-specific logic kept in component files

3. **Type Safety:**
   - All interfaces in `/lib/types.ts`
   - Strict TypeScript configuration
   - Proper error handling with typed exceptions

### File Naming Conventions
- **Components**: PascalCase (e.g., `SocialShare.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useLocationServices.ts`)
- **Utils**: camelCase (e.g., `dataHealing.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `API_CONFIG`)

### Import Path Standards
- Use `@/` alias for all internal imports
- Import from `/lib/types.ts` for shared interfaces
- Import from `/lib/constants.ts` for configuration
- Import from `/lib/helpers.ts` for utilities

## 🚀 Performance Considerations

### Mobile Optimizations
- Reduced GPS accuracy on mobile for battery saving
- Longer debounce times for mobile interactions
- Smaller camera resolution on mobile devices
- Less frequent AI suggestion intervals

### Memory Management
- Limited pin storage (1000 max, 50 on mobile fallback)
- AI behavior history capped at 100 items
- Automatic cleanup of old backup data
- Storage quota monitoring and management

### Network Efficiency
- Request timeouts and retry logic
- Offline mode detection and handling
- Debounced API calls
- Cached reverse geocoding results

## 🔐 Data Flow

```
User Action → Component → Hook → Validation → Storage → Backup
                ↓
         AI Analysis → Recommendations → UI Update
```

### State Management
- Local state with React hooks
- Persistent storage with localStorage
- Data validation on all operations
- Automatic sync and conflict resolution

### Error Handling
- Validation at data entry points
- Graceful fallbacks for all external APIs
- User-friendly error messages
- Automatic recovery mechanisms

## 🧪 Testing Strategy

### Data Integrity
- Validation tests for all pin operations
- Migration tests for schema changes
- Backup and recovery testing
- Storage quota handling

### Performance
- Mobile device testing
- Network failure scenarios
- Large dataset handling
- Memory usage monitoring

### User Experience
- Cross-platform compatibility
- Accessibility compliance
- Offline functionality
- Progressive web app features 