

## Plan: Fix 4 Issues + Add Logging Time Analysis

### 1. Add "Time Spent Logging" Analysis

Currently, `AppSessionTimer` just shows a raw number (e.g., "12m 34s"). We'll add an `AppSessionAnalysis` component in the Analysis tab that:

- Shows daily logging time trends (chart of how much time you spent in the app each day over the past week)
- Calculates average daily logging time
- Shows "most active logging hour" (when you tend to open the app most)
- Compares current week vs previous week logging time
- Uses data already stored in `localStorage` via `useAppSessionTime` hook

**Files:** New `src/components/AppSessionAnalysis.tsx`, modify `src/pages/Index.tsx` to add it to the Analysis tab.

---

### 2. Fix Heatmap Issues

The heatmap has two problems:

- **Daily heatmap**: The `hourStart`/`hourEnd` dates are constructed from the activity's start time instead of the selected date, causing incorrect hour buckets when activities span midnight or are on different dates
- **Weekly heatmap**: Same date construction bug — uses `dayDate` correctly but the overlap calculation can fail for activities that span multiple days

**Fix:** Construct `hourStart`/`hourEnd` using the correct target date (from `selectedDate` for daily, from `dayDate` for weekly), ensuring the year/month/day components are correct.

**Files:** Modify `src/components/ProductivityHeatmap.tsx`

---

### 3. Fix Dark Mode Not Persisting

Currently dark mode state is initialized by checking if `dark` class exists on `<html>`, but nothing saves the preference. When you close the app, it resets.

**Fix:** Save dark mode preference to `localStorage` on toggle, and read it on initialization.

**Files:** Modify `src/pages/Index.tsx` — update `isDark` state initialization and the toggle effect.

---

### 4. Optimize UI for Installed App (Mobile APK)

The current layout isn't optimized for mobile app viewport. Issues include:

- Header buttons too close together on small screens
- Tab list may overflow
- Cards in the grid don't stack properly on narrow screens
- Heatmap cells too small and overflow horizontally
- Date navigation buttons cramped

**Fixes:**
- Add proper mobile-first responsive classes
- Make header icons wrap or use a dropdown menu on small screens
- Ensure single-column layout on mobile for all cards
- Add `viewport` meta tag optimization for installed app
- Add touch-friendly tap targets (min 44px)
- Reduce padding/margins on mobile
- Make heatmap cells responsive

**Files:** Modify `src/pages/Index.tsx`, `src/components/ProductivityHeatmap.tsx`, `src/index.css`, `index.html`

---

### 5. About the Accessibility Service (Native Code)

The native Android code (Java files for Accessibility Service, AppUsage Plugin, Persistent Notification Plugin) **cannot be created by me directly** — the `android/` folder only exists on your local machine after running `npx cap add android`.

The complete guide is already in `docs/NATIVE_INTEGRATION_GUIDE.md` with copy-paste-ready code. You need to:
1. Open the Android project in Android Studio
2. Create the Java files in the correct package directory
3. Update `AndroidManifest.xml` and `strings.xml`
4. Register plugins in `MainActivity.java`

This is the only way — there is no workaround for native platform code.

---

### Technical Summary

| Change | File(s) | Type |
|--------|---------|------|
| Logging time analysis | New `AppSessionAnalysis.tsx`, `Index.tsx` | New component |
| Heatmap fix | `ProductivityHeatmap.tsx` | Bug fix |
| Dark mode persistence | `Index.tsx` | Bug fix |
| Mobile UI optimization | `Index.tsx`, `ProductivityHeatmap.tsx`, `index.css`, `index.html` | Enhancement |

