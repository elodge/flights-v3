# Artist Filtering System

> **⚠️ CRITICAL COMPONENT** - This feature has been broken multiple times during development. Please read this document before making changes that might affect artist selection or filtering.

## Overview

The artist filtering system allows employees to filter the employee portal content by specific artists. It affects:

- Dashboard tour listings
- Booking queue selections  
- Navigation queue counts
- URL state and browser history
- Cookie persistence across sessions

## How It Works

### 1. Artist Selection Priority

```typescript
// CRITICAL: This logic is used everywhere - DO NOT CHANGE
const urlArtistId = getSelectedArtistIdFromSearchParams(searchParams)
const cookieArtistId = await getSelectedArtistIdFromCookie()
const selectedArtistId = urlArtistId || cookieArtistId

// Priority: URL parameter > Cookie > null (all artists)
```

### 2. Data Flow

```
User selects artist in dropdown
     ↓
Update URL parameter (?artist=uuid)
     ↓  
Update cookie for persistence
     ↓
Page components read URL + cookie
     ↓
Filter data by selectedArtistId
     ↓
Display filtered content
```

### 3. Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Artist Dropdown | `components/header.tsx` | UI for selecting artists |
| URL Parser | `lib/employeeArtist.ts` | Extract artist from URL |
| Cookie Manager | `lib/actions/artist-selection-actions.ts` | Server-side cookie operations |
| Dashboard Page | `app/(employee)/a/page.tsx` | Filter tours by artist |
| Queue Page | `app/(employee)/a/queue/page.tsx` | Filter selections by artist |
| Layout | `app/(employee)/layout.tsx` | Queue count (simplified to all artists) |

## Critical Rules

### ❌ DO NOT:

1. **Await searchParams** - This breaks Next.js compatibility
   ```typescript
   // ❌ WRONG - This has broken the system before
   const awaited = await searchParams
   
   // ✅ CORRECT 
   const urlArtistId = getSelectedArtistIdFromSearchParams(searchParams)
   ```

2. **Change the priority logic** - URL must always override cookies
   ```typescript
   // ❌ WRONG
   const selectedArtistId = cookieArtistId || urlArtistId
   
   // ✅ CORRECT
   const selectedArtistId = urlArtistId || cookieArtistId
   ```

3. **Modify artist filtering without testing** - Use the provided tests

4. **Use server client for artist data** - Use admin client to avoid RLS issues
   ```typescript
   // ❌ WRONG - RLS blocks this
   const supabase = await createServerClient()
   
   // ✅ CORRECT
   const supabase = createAdminClient()
   ```

### ✅ DO:

1. **Test all changes** - Run the artist filtering tests
2. **Use the helper functions** - Don't reimplement the logic
3. **Check both URL and cookies** - Maintain the priority system
4. **Update tests** - When adding new functionality that affects filtering

## Common Issues & Solutions

### Issue: "Artist dropdown empty"
**Cause:** Artist API not returning data due to RLS restrictions  
**Solution:** Use `createAdminClient()` in `/api/artists/route.ts`

### Issue: "Filter not working after page changes"
**Cause:** Not reading URL parameters correctly  
**Solution:** Ensure `getSelectedArtistIdFromSearchParams(searchParams)` is called

### Issue: "Queue count shows 0"
**Cause:** RLS blocking selection queries  
**Solution:** Use admin client for queue count queries

### Issue: "Filter resets on navigation"
**Cause:** URL parameters not being preserved  
**Solution:** Check that the artist dropdown updates URL correctly

## Testing

### Required Tests Before Deploying

```bash
# Run core filtering logic tests
npm run test tests/core/artist-filtering-core.test.ts

# Run E2E tests 
npm run test:e2e e2e/artist-filtering.spec.ts

# Manual verification
1. Select artist in dropdown → URL updates
2. Navigate to queue → filter maintained
3. Refresh page → filter persists
4. Clear filter → shows all artists
```

### Test Checklist

- [ ] Artist dropdown loads and shows options
- [ ] Selecting artist updates URL with `?artist=uuid`
- [ ] Page content filters by selected artist
- [ ] "Viewing: Artist Name" indicator appears
- [ ] "Clear filter" link works
- [ ] Filter persists across navigation
- [ ] Filter persists after page refresh
- [ ] Queue count updates appropriately
- [ ] Direct URL navigation works (`/a?artist=uuid`)

## Previous Breakage History

| Date | Issue | Cause | Fix |
|------|-------|-------|-----|
| Recent | "Booking Queue0" | RLS blocking queue count | Used admin client |
| Recent | Empty artist dropdown | RLS blocking artist API | Used admin client in API |
| Recent | Filter not working | Awaited searchParams | Removed await |
| Recent | Filter lost on nav | Layout overriding URL | Simplified layout logic |

## Emergency Fixes

If the artist filtering breaks in production:

1. **Immediate**: Revert to show all artists (remove filtering temporarily)
2. **Check**: Artist API returning data (`/api/artists`)
3. **Check**: URL parameters being read correctly
4. **Check**: RLS policies not blocking data access
5. **Test**: Core filtering functions with provided tests

## Code Examples

### Correct Implementation (Dashboard Page)
```typescript
export default async function EmployeePortalPage({ searchParams }) {
  // ✅ CORRECT: Read URL first, then cookie
  const urlArtistId = getSelectedArtistIdFromSearchParams(searchParams)
  const cookieArtistId = await getSelectedArtistIdFromCookie()
  const selectedArtistId = urlArtistId || cookieArtistId
  
  // ✅ CORRECT: Filter data
  const tours = await getEmployeeTours(selectedArtistId)
  
  // ✅ CORRECT: Display filter state
  const selectedArtistName = selectedArtistId && tours.length > 0 
    ? tours[0].artists.name 
    : null
}
```

### Correct Implementation (API Route)
```typescript
export async function GET() {
  // ✅ CORRECT: Use admin client
  const supabase = createAdminClient()
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name')
    .order('name')
  
  return NextResponse.json(artists || [])
}
```

---

**Remember**: This system is critical for user experience. When in doubt, run the tests and follow the established patterns. Every time this has broken, it was due to not following these guidelines.
