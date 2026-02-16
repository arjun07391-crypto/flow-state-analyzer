# TimeGuard Accessibility Service - Native Android Setup

This document contains the full native Android implementation for the Accessibility Service.
After running `npx cap add android`, place these files manually in your Android project.

---

## 1️⃣ Create the Accessibility Service Class

**File:** `android/app/src/main/java/com/timeguard/app/TimeGuardAccessibilityService.java`

```java
package com.timeguard.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

public class TimeGuardAccessibilityService extends AccessibilityService {

    private static final String TAG = "TIMEGUARD_ACCESS";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        if (event.getPackageName() != null) {
            String packageName = event.getPackageName().toString();
            int eventType = event.getEventType();

            switch (eventType) {
                case AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED:
                    Log.d(TAG, "Window Changed -> App: " + packageName);
                    break;
                case AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED:
                    Log.d(TAG, "Content Changed -> App: " + packageName);
                    break;
                default:
                    Log.d(TAG, "Event (" + eventType + ") -> App: " + packageName);
                    break;
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service Interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Service Connected");

        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                    | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.notificationTimeout = 100;
            info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                    | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            setServiceInfo(info);
        }

        Log.d(TAG, "Accessibility Service fully configured");
    }
}
```

---

## 2️⃣ Create the XML Config File

**File:** `android/app/src/main/res/xml/accessibility_service_config.xml`

> You may need to create the `res/xml/` directory if it doesn't exist.

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canRetrieveWindowContent="true"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:description="@string/accessibility_service_description" />
```

---

## 3️⃣ Add String Resource for Service Description

**File:** `android/app/src/main/res/values/strings.xml`

Add this inside `<resources>`:

```xml
<string name="accessibility_service_description">TimeGuard uses accessibility to detect which app is in the foreground to help you track your productivity and stay focused.</string>
```

---

## 4️⃣ Modify AndroidManifest.xml

**File:** `android/app/src/main/AndroidManifest.xml`

Add this **inside** the `<application>` tag:

```xml
<service
    android:name=".TimeGuardAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/accessibility_service_config" />
</service>
```

---

## 5️⃣ Java 17 Compatibility

In `android/app/build.gradle`, ensure:

```groovy
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

Do **NOT** use `VERSION_21`. Capacitor 8 targets Java 17.

---

## 6️⃣ Production Config Reminder

In `capacitor.config.ts`, ensure the `server` block is **commented out** for APK builds:

```ts
// server: {
//   url: '...',
//   cleartext: true
// },
```

And `webDir` is set to `'dist'`.

---

## 7️⃣ Build & Test Steps

```bash
# 1. Build the web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Build APK
# Android Studio → Build → Build Bundle(s) / APK(s) → Build APK(s)
```

After installing the APK:
1. Go to **Settings → Accessibility → TimeGuard**
2. Enable the service
3. Open apps — check Logcat for `TIMEGUARD_ACCESS` logs

---

## 8️⃣ Verifying via Logcat

```bash
adb logcat -s TIMEGUARD_ACCESS
```

You should see output like:
```
D/TIMEGUARD_ACCESS: Service Connected
D/TIMEGUARD_ACCESS: Accessibility Service fully configured
D/TIMEGUARD_ACCESS: Window Changed -> App: com.whatsapp
D/TIMEGUARD_ACCESS: Window Changed -> App: com.instagram.android
```
