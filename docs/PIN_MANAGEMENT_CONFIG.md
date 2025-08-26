# PINIT Pin Management System Configuration

## Environment Variables

Copy these to your `.env.local` file to configure the pin management system:

```bash
# Feature Flag - Set to 'true' to enable the new pin management system
NEXT_PUBLIC_FEATURE_MAP_LIFECYCLE=false

# Map Lifecycle Thresholds
NEXT_PUBLIC_MAP_RECENT_WINDOW_DAYS=90
NEXT_PUBLIC_MAP_TRENDING_WINDOW_DAYS=14
NEXT_PUBLIC_MAP_TRENDING_MIN_BURST=5
NEXT_PUBLIC_MAP_CLASSICS_MIN_AGE_DAYS=180
NEXT_PUBLIC_MAP_CLASSICS_MIN_TOTAL_ENDORSEMENTS=10
NEXT_PUBLIC_MAP_DOWNVOTE_HIDE_THRESHOLD=10
NEXT_PUBLIC_MAP_DECAY_HALF_LIFE_DAYS=30
```

## Configuration Options

### Feature Flag
- `NEXT_PUBLIC_FEATURE_MAP_LIFECYCLE`: Master switch for the new system
  - `false` (default): Use existing pin system
  - `true`: Enable new pin management with tabs, clustering, and lifecycle

### Lifecycle Windows
- `RECENT_WINDOW_DAYS`: How long pins stay in "Recent" tab (default: 90 days)
- `TRENDING_WINDOW_DAYS`: Activity window for trending calculation (default: 14 days)
- `CLASSICS_MIN_AGE_DAYS`: Minimum age for "Classics" tab (default: 180 days)

### Thresholds
- `TRENDING_MIN_BURST`: Minimum activity for trending (default: 5 endorsements)
- `CLASSICS_MIN_TOTAL_ENDORSEMENTS`: Minimum endorsements for classics (default: 10)
- `DOWNVOTE_HIDE_THRESHOLD`: Downvotes before hiding (default: 10)
- `DECAY_HALF_LIFE_DAYS`: Score decay period (default: 30 days)

## Migration

The system automatically migrates existing pins when enabled:
1. Adds new fields to existing pins
2. Calculates initial scores and categories
3. Maintains backward compatibility

## Testing

1. Set `NEXT_PUBLIC_FEATURE_MAP_LIFECYCLE=true`
2. Restart the development server
3. Check browser console for migration logs
4. Verify new fields appear in pin data 
