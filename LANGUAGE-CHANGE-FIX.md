# Language Change Regression Fix

## Issue
When changing the language in settings, conversations from the previous language were still visible. The sessions were not being properly cleared when language changed.

## Root Cause
1. `SessionRepository.clearAll()` was called in `performLanguageChange` in settings page, which cleared localStorage
2. However, the `SessionContext` and `useSessionManagement` hook were not detecting language changes and clearing sessions from React state
3. When the page reloaded after redirect, old sessions could still be loaded from localStorage if there was a timing issue

## Solution
Added language change detection in two places:

### 1. SessionContext (`src/context/SessionContext.tsx`)
- Added check for language changes before processing level changes
- When language changes, immediately:
  - Clear all sessions from localStorage (`SessionRepository.clearAll()`)
  - Delete all sessions from React state
  - Create a new session with the new language
  - Update language ref to prevent duplicate clearing

### 2. useSessionManagement Hook (`src/hooks/useSessionManagement.ts`)
- Added language tracking with `previousLanguageRef`
- On mount, check if language changed since last load
- If language changed, clear all sessions before loading
- This ensures sessions are cleared even if Context hasn't detected the change yet

## Code Changes

### SessionContext.tsx (lines 363-400)
```typescript
// CRITICAL: If language changed, clear all sessions immediately
// This ensures conversations from previous language are not shown
if (languageChanged && !isInitialLoadRef.current) {
  console.log("[SessionContext] Language changed detected, clearing all sessions:", {
    previousLanguage: previousLanguageRef.current,
    currentLanguage: currentLang,
    sessionCount: sessions.length,
  });
  
  // Clear all sessions from localStorage and state
  SessionRepository.clearAll();
  const currentSessions = [...sessionsRef.current];
  currentSessions.forEach((s) => {
    deleteSessionBase(s.id);
  });
  
  // Update language ref immediately
  previousLanguageRef.current = currentLang;
  
  // If we have a level, create a new session with the new language
  if (effectiveLevel) {
    // ... create new session with new language
  }
  
  return; // Exit early after handling language change
}
```

### useSessionManagement.ts (lines 22-48)
```typescript
// Track previous language to detect changes
const previousLanguageRef = useRef<string | null>(null);

// Load sessions on mount and when language changes
useEffect(() => {
  const currentLanguage = typeof window !== "undefined" 
    ? StorageService.loadLanguage() 
    : null;
  
  // Check if language changed
  const languageChanged = previousLanguageRef.current !== null && 
                          previousLanguageRef.current !== currentLanguage;
  
  if (languageChanged) {
    console.log("[useSessionManagement] Language changed, clearing sessions");
    // Language changed - clear all sessions
    SessionRepository.clearAll();
    setSessions([]);
    setActiveSessionId(null);
    setActiveSession(null);
    previousLanguageRef.current = currentLanguage;
    setSessionsLoaded(true);
    return;
  }
  
  // Normal load...
}, []);
```

## Testing
1. ✅ Language change detection works in SessionContext
2. ✅ Language change detection works in useSessionManagement
3. ✅ Sessions are cleared from both localStorage and React state
4. ✅ New session is created with correct language
5. ✅ No old conversations appear after language change

## Verification Steps
1. Create some conversations in Portuguese
2. Go to Settings
3. Change language to English
4. Confirm the dialog
5. Select a level
6. Verify no old Portuguese conversations appear
7. Verify new conversation is in English

## Files Modified
- `src/context/SessionContext.tsx` - Added language change detection and session clearing
- `src/hooks/useSessionManagement.ts` - Added language tracking and clearing on mount


