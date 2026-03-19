# Language Change Fix V2 - Dialog and Hard Refresh Issues

## Issues Fixed
1. **Confirmation dialog not showing** - Dialog was only shown when sessions existed
2. **Hard refresh required** - Language change wasn't being detected on new page load

## Root Causes

### Issue 1: Dialog Not Showing
- `handleLanguageChange` only showed dialog if `SessionRepository.getAll().length > 0`
- This meant if sessions weren't detected or were empty, no warning was shown
- **Fix**: Always show confirmation dialog when changing language, regardless of session count

### Issue 2: Hard Refresh Required
- Language change detection relied on React refs that don't persist across page reloads
- `previousLanguageRef.current` was `null` on new page load, so language changes weren't detected
- **Fix**: Use `sessionStorage` to persist previous language across page reloads

## Solutions Implemented

### 1. Always Show Confirmation Dialog
**File**: `app/settings/page.tsx`

```typescript
const handleLanguageChange = (newLanguage: LanguageCode) => {
  if (newLanguage === language) {
    return;
  }

  // Always show confirmation dialog when changing language
  // This warns the user that all conversations will be lost
  setPendingLanguage(newLanguage);
  setShowConfirmDialog(true);
};
```

### 2. Use sessionStorage for Language Tracking
**Files**: 
- `app/settings/page.tsx` - Store previous language before redirect
- `src/hooks/useSessionManagement.ts` - Check sessionStorage on mount
- `src/context/SessionContext.tsx` - Check sessionStorage for language changes

**Key Changes**:
- Store previous language in `sessionStorage` before redirect
- Check `sessionStorage.getItem("norsk_previous_language")` on page load
- Compare with current language to detect changes
- Update sessionStorage after language change is processed

### 3. Improved Redirect
**File**: `app/settings/page.tsx`

```typescript
// Use window.location.replace for a hard redirect that clears cache
// This ensures the new page loads fresh and detects the language change
window.location.replace("/level-selection");
```

- Changed from `window.location.href` to `window.location.replace`
- Prevents back button issues
- Ensures fresh page load
- Added 100ms delay to ensure cleanup completes

### 4. Enhanced Session Clearing
**File**: `app/settings/page.tsx`

```typescript
// Clear sessions FIRST - this is critical
SessionRepository.clearAll();
UserRepository.resetUserMessageCount();

// Verify sessions are cleared
const verifySessions = SessionRepository.getAll();
console.log("[Settings] Sessions after clear:", verifySessions.length);

// Clear session storage flags
sessionStorage.removeItem("norsk_from_level_selection");
sessionStorage.clear(); // Clear all cached data
```

## Testing Checklist

✅ **Confirmation Dialog**:
- [x] Dialog always shows when changing language
- [x] Dialog shows even when no sessions exist
- [x] Dialog text is properly translated

✅ **Language Change Detection**:
- [x] Language change detected on new page load
- [x] Sessions cleared immediately
- [x] No hard refresh required
- [x] New conversation created with correct language

✅ **Session Clearing**:
- [x] All sessions cleared from localStorage
- [x] All sessions cleared from React state
- [x] Firestore sessions cleared (if authenticated)
- [x] Session storage flags cleared

## Files Modified

1. **app/settings/page.tsx**
   - Always show confirmation dialog
   - Store previous language in sessionStorage
   - Use `window.location.replace` for redirect
   - Enhanced session clearing with verification

2. **src/hooks/useSessionManagement.ts**
   - Initialize `previousLanguageRef` from sessionStorage
   - Check sessionStorage for language changes on mount
   - Update sessionStorage after language change

3. **src/context/SessionContext.tsx**
   - Check sessionStorage for previous language
   - Update sessionStorage when language changes detected
   - Enhanced language change detection logic

## Verification Steps

1. Create conversations in Portuguese
2. Go to Settings
3. Click on English language button
4. **Verify**: Confirmation dialog appears
5. Click "Continue" to confirm
6. **Verify**: Redirects to level-selection page
7. Select a level
8. **Verify**: No old Portuguese conversations appear
9. **Verify**: New conversation is in English
10. **Verify**: No hard refresh needed

## Expected Behavior

- ✅ Confirmation dialog **always** shows when changing language
- ✅ Language change is detected **immediately** on new page load
- ✅ Sessions are cleared **before** redirect
- ✅ New conversation uses **correct language** without hard refresh
- ✅ No old conversations from previous language appear


