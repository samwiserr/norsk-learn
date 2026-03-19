# Level Selection Page Language Change Fix

## Issues Fixed

1. **Language selector UI mismatch** - Level selection page used dropdown, settings page used button list
2. **No confirmation dialog** - Language change didn't warn users about losing conversations
3. **Sessions not cleared** - Old conversations persisted after language change
4. **Hard refresh required** - Language change wasn't detected on page load

## Changes Applied

### 1. Replaced LanguageSelectorLanding with Button List
**File**: `app/level-selection/page.tsx`

- Removed `LanguageSelectorLanding` component
- Added same button list UI as settings page
- Uses `SUPPORTED_LANGUAGES.map()` to render language buttons
- Same styling and behavior as settings page

### 2. Added Confirmation Dialog
**File**: `app/level-selection/page.tsx`

- Added `showConfirmDialog` state
- Added `pendingLanguage` state
- Added `ConfirmDialog` component
- Always shows confirmation when changing language (same as settings page)

### 3. Added Session Clearing Logic
**File**: `app/level-selection/page.tsx`

- Added `performLanguageChange` function (same logic as settings page)
- Clears sessions from localStorage
- Clears sessions from React state
- Clears Firestore sessions (if authenticated)
- Stores previous language in sessionStorage
- Reloads page after language change

### 4. Added Required Imports
**File**: `app/level-selection/page.tsx`

- `useRef` for unmounting tracking
- `SUPPORTED_LANGUAGES` for language list
- `SessionRepository` for session clearing
- `UserRepository` for resetting message count
- `StorageService` for language persistence
- `AuthContext` for user authentication
- `ConfirmDialog` component
- `loadAllSessionsFromFirestore`, `deleteSessionFromFirestore` for Firestore cleanup

## Code Structure

### Language Change Handler
```typescript
const handleLanguageChange = (newLanguage: LanguageCode) => {
  if (newLanguage === language) {
    return;
  }
  // Always show confirmation dialog
  setPendingLanguage(newLanguage);
  setShowConfirmDialog(true);
};
```

### Language Change Execution
```typescript
const performLanguageChange = async (newLanguage: LanguageCode) => {
  // 1. Clear sessions from localStorage
  SessionRepository.clearAll();
  UserRepository.resetUserMessageCount();
  
  // 2. Store previous language in sessionStorage
  sessionStorage.setItem("norsk_previous_language", language);
  
  // 3. Clear Firestore sessions (if authenticated)
  // ... Firestore cleanup code ...
  
  // 4. Save new language
  StorageService.saveLanguage(newLanguage);
  
  // 5. Reload page to ensure language change is detected
  window.location.reload();
};
```

### Language Selector UI
```typescript
<div className="language-selector-list">
  {SUPPORTED_LANGUAGES.map((lang) => (
    <button
      key={lang.code}
      className={`language-selector-item ${lang.code === language ? "active" : ""}`}
      onClick={() => handleLanguageChange(lang.code)}
    >
      <span>{FLAG_MAP[lang.code]}</span>
      <span>{lang.nativeName}</span>
      {lang.code === language && <span>✓</span>}
    </button>
  ))}
</div>
```

## Testing Checklist

✅ **UI Consistency**:
- [x] Level selection page uses same button list as settings page
- [x] Same styling and behavior
- [x] Active language is highlighted

✅ **Confirmation Dialog**:
- [x] Dialog appears when changing language
- [x] Dialog text is properly translated
- [x] Cancel button works
- [x] Continue button clears sessions

✅ **Session Clearing**:
- [x] Sessions cleared from localStorage
- [x] Sessions cleared from React state
- [x] Firestore sessions cleared (if authenticated)
- [x] Old conversations don't appear after language change

✅ **Language Detection**:
- [x] Previous language stored in sessionStorage
- [x] Language change detected on page load
- [x] No hard refresh required
- [x] New conversation uses correct language

## Files Modified

1. **app/level-selection/page.tsx**
   - Replaced `LanguageSelectorLanding` with button list
   - Added confirmation dialog
   - Added session clearing logic
   - Added required imports

## Expected Behavior

1. User sees same language selector on both level selection and settings pages
2. When changing language, confirmation dialog appears
3. After confirming, all sessions are cleared
4. Page reloads and new language is active
5. Old conversations from previous language are gone
6. New conversation uses the new language

## Notes

- The `useSessionManagement` hook already has language change detection logic
- SessionStorage is used to persist previous language across page reloads
- Page reload ensures language change is properly detected
- Same confirmation dialog and session clearing logic as settings page


