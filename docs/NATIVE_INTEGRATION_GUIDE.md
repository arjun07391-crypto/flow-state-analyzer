# TimeGuard — Complete Native Android Integration Guide

This is the **single source of truth** for all native Android code. After running `npx cap add android`, place these files manually in your Android project.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Web Layer (Capacitor)              │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │ ActivityInput│  │DistractionPrmpt│  │ Notif Hook│ │
│  └──────┬───────┘  └───────┬───────┘  └─────┬─────┘ │
│         │                  │                │        │
│  ┌──────┴──────────────────┴────────────────┴──────┐ │
│  │          Capacitor Plugin Bridge                │ │
│  │   AppUsagePlugin    PersistentNotificationPlugin│ │
│  └──────┬──────────────────────────────────┬───────┘ │
├─────────┼──────────────────────────────────┼─────────┤
│         ▼           Native Android         ▼         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ AppUsage    │  │ Accessibility│  │ Persistent │  │
│  │ Plugin.java │  │ Service.java │  │ Notif.java │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘  │
│         │                │                           │
│         ▼                ▼                           │
│  UsageStatsManager   AccessibilityService API        │
│  (which app, how long) (real-time app switches)      │
└─────────────────────────────────────────────────────┘
```

### What Each Plugin Does

| Plugin | Purpose | Android API | Permission |
|--------|---------|-------------|------------|
| **Accessibility Service** | Detects which app is on screen in real-time | `AccessibilityService` | Manual enable in Settings |
| **AppUsage Plugin** | Queries app usage stats, monitors switches, detects distractions | `UsageStatsManager` | `PACKAGE_USAGE_STATS` |
| **Persistent Notification** | 24/7 notification with inline text reply for quick activity logging | `NotificationCompat` + `RemoteInput` | `POST_NOTIFICATIONS` |

---

## File Structure

After `npx cap add android`, create these files:

```
android/app/src/main/
├── java/com/timeguard/app/
│   ├── MainActivity.java              ← Modified (register plugins)
│   ├── TimeGuardAccessibilityService.java  ← NEW
│   ├── plugins/
│   │   ├── AppUsagePlugin.java        ← NEW
│   │   └── PersistentNotificationPlugin.java  ← NEW
├── res/
│   ├── xml/
│   │   └── accessibility_service_config.xml  ← NEW
│   └── values/
│       └── strings.xml                ← Modified (add description)
└── AndroidManifest.xml                ← Modified (permissions + service)
```

> **Note:** The package name in these files is `com.timeguard.app`. If your Capacitor project uses a different package (e.g., `app.lovable.b0feeaf118154c5c9f9fdbd480f63cdb`), replace all occurrences accordingly.

---

## 1️⃣ Accessibility Service

### `TimeGuardAccessibilityService.java`

```java
package com.timeguard.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

public class TimeGuardAccessibilityService extends AccessibilityService {

    private static final String TAG = "TIMEGUARD_ACCESS";
    private static String currentForegroundPackage = "";

    /**
     * Called by AppUsagePlugin to get the current foreground app
     * detected by the accessibility service (more reliable than UsageStats polling).
     */
    public static String getCurrentForegroundPackage() {
        return currentForegroundPackage;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String packageName = event.getPackageName().toString();
        int eventType = event.getEventType();

        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            // Only track full window changes (app switches), not content updates
            if (!packageName.equals(currentForegroundPackage)) {
                Log.d(TAG, "App Switch: " + currentForegroundPackage + " → " + packageName);
                currentForegroundPackage = packageName;
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
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
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

### `res/xml/accessibility_service_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canRetrieveWindowContent="true"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:description="@string/accessibility_service_description" />
```

---

## 2️⃣ App Usage Plugin

### `plugins/AppUsagePlugin.java`

```java
package com.timeguard.app.plugins;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.timeguard.app.TimeGuardAccessibilityService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

@CapacitorPlugin(name = "AppUsage")
public class AppUsagePlugin extends Plugin {

    private static final String TAG = "TIMEGUARD_USAGE";
    private Handler handler;
    private Runnable monitorRunnable;
    private boolean isMonitoring = false;
    private String lastForegroundApp = "";
    private List<String> workApps = new ArrayList<>();
    private List<String> distractionApps = new ArrayList<>();

    private static final String[] DEFAULT_DISTRACTION_APPS = {
        "com.whatsapp", "com.instagram.android", "com.facebook.katana",
        "com.twitter.android", "com.discord", "com.snapchat.android",
        "com.zhiliaoapp.musically", "com.google.android.youtube",
        "com.netflix.mediaclient", "com.reddit.frontpage"
    };

    @Override
    public void load() {
        handler = new Handler(Looper.getMainLooper());
        for (String app : DEFAULT_DISTRACTION_APPS) {
            distractionApps.add(app);
        }
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasUsageStatsPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getUsageStats(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Usage stats permission not granted");
            return;
        }

        long startTime = call.getLong("startTime", System.currentTimeMillis() - 86400000);
        long endTime = call.getLong("endTime", System.currentTimeMillis());

        UsageStatsManager usm = (UsageStatsManager) getContext()
            .getSystemService(Context.USAGE_STATS_SERVICE);

        Map<String, UsageStats> stats = usm.queryAndAggregateUsageStats(startTime, endTime);
        JSArray apps = new JSArray();
        PackageManager pm = getContext().getPackageManager();

        for (Map.Entry<String, UsageStats> entry : stats.entrySet()) {
            UsageStats us = entry.getValue();
            if (us.getTotalTimeInForeground() > 0) {
                JSObject app = new JSObject();
                app.put("packageName", us.getPackageName());
                app.put("lastTimeUsed", us.getLastTimeUsed());
                app.put("totalTimeInForeground", us.getTotalTimeInForeground());
                try {
                    ApplicationInfo ai = pm.getApplicationInfo(us.getPackageName(), 0);
                    app.put("appName", pm.getApplicationLabel(ai).toString());
                } catch (PackageManager.NameNotFoundException e) {
                    app.put("appName", us.getPackageName());
                }
                apps.put(app);
            }
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void getForegroundApp(PluginCall call) {
        // Try Accessibility Service first (more reliable)
        String accessibilityApp = TimeGuardAccessibilityService.getCurrentForegroundPackage();
        if (!accessibilityApp.isEmpty()) {
            JSObject result = new JSObject();
            result.put("packageName", accessibilityApp);
            result.put("appName", getAppName(accessibilityApp));
            result.put("timestamp", System.currentTimeMillis());
            call.resolve(result);
            return;
        }

        // Fallback to UsageStats
        if (!hasUsageStatsPermission()) {
            call.reject("Usage stats permission not granted");
            return;
        }

        String foregroundApp = getForegroundPackageViaUsageStats();
        JSObject result = new JSObject();
        result.put("packageName", foregroundApp);
        result.put("appName", getAppName(foregroundApp));
        result.put("timestamp", System.currentTimeMillis());
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Usage stats permission not granted");
            return;
        }

        int intervalMs = call.getInt("intervalMs", 2000);

        try {
            JSArray workAppsArray = call.getArray("workApps");
            if (workAppsArray != null) {
                workApps.clear();
                for (int i = 0; i < workAppsArray.length(); i++) {
                    workApps.add(workAppsArray.getString(i));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not parse workApps", e);
        }

        isMonitoring = true;

        // Use Accessibility Service if available, else UsageStats
        String initial = TimeGuardAccessibilityService.getCurrentForegroundPackage();
        lastForegroundApp = initial.isEmpty() ? getForegroundPackageViaUsageStats() : initial;

        monitorRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isMonitoring) return;

                String currentApp = TimeGuardAccessibilityService.getCurrentForegroundPackage();
                if (currentApp.isEmpty()) {
                    currentApp = getForegroundPackageViaUsageStats();
                }

                if (!currentApp.isEmpty() && !currentApp.equals(lastForegroundApp)) {
                    boolean isDistraction = distractionApps.contains(currentApp)
                        && !workApps.contains(currentApp);

                    JSObject event = new JSObject();
                    event.put("fromApp", lastForegroundApp);
                    event.put("toApp", currentApp);
                    event.put("toAppName", getAppName(currentApp));
                    event.put("timestamp", System.currentTimeMillis());
                    event.put("isDistraction", isDistraction);

                    notifyListeners("appSwitched", event);
                    lastForegroundApp = currentApp;
                }

                handler.postDelayed(this, intervalMs);
            }
        };

        handler.post(monitorRunnable);
        call.resolve();
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        isMonitoring = false;
        if (monitorRunnable != null) {
            handler.removeCallbacks(monitorRunnable);
        }
        call.resolve();
    }

    private boolean hasUsageStatsPermission() {
        AppOpsManager appOps = (AppOpsManager) getContext()
            .getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private String getForegroundPackageViaUsageStats() {
        UsageStatsManager usm = (UsageStatsManager) getContext()
            .getSystemService(Context.USAGE_STATS_SERVICE);
        long time = System.currentTimeMillis();
        List<UsageStats> stats = usm.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, time - 10000, time);

        if (stats != null && !stats.isEmpty()) {
            SortedMap<Long, UsageStats> sortedMap = new TreeMap<>();
            for (UsageStats us : stats) {
                sortedMap.put(us.getLastTimeUsed(), us);
            }
            if (!sortedMap.isEmpty()) {
                return sortedMap.get(sortedMap.lastKey()).getPackageName();
            }
        }
        return "";
    }

    private String getAppName(String packageName) {
        PackageManager pm = getContext().getPackageManager();
        try {
            ApplicationInfo ai = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(ai).toString();
        } catch (PackageManager.NameNotFoundException e) {
            return packageName;
        }
    }
}
```

---

## 3️⃣ Persistent Notification Plugin

### `plugins/PersistentNotificationPlugin.java`

```java
package com.timeguard.app.plugins;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PersistentNotification")
public class PersistentNotificationPlugin extends Plugin {

    private static final String CHANNEL_ID = "persistent_chat";
    private static final int NOTIFICATION_ID = 9001;
    private static final String KEY_TEXT_REPLY = "key_text_reply";
    private static final String ACTION_REPLY = "com.timeguard.app.ACTION_REPLY";

    private NotificationManager notificationManager;
    private String currentTitle = "💬 Quick Note";
    private String currentBody = "💬 Tap to open or reply with what you're doing";
    private BroadcastReceiver replyReceiver;

    @Override
    public void load() {
        notificationManager = (NotificationManager) getContext()
            .getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        registerReplyReceiver();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Messages", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Quick notes and messages");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void registerReplyReceiver() {
        replyReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
                if (remoteInput != null) {
                    CharSequence cs = remoteInput.getCharSequence(KEY_TEXT_REPLY);
                    if (cs == null) return;
                    String replyText = cs.toString();

                    JSObject data = new JSObject();
                    data.put("text", replyText);
                    notifyListeners("notificationReply", data);

                    currentBody = "✓ Got it: " + replyText;
                    showNotification();

                    getActivity().getWindow().getDecorView().postDelayed(() -> {
                        currentBody = "💬 Tap to open or reply with what you're doing";
                        showNotification();
                    }, 3000);
                }
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(replyReceiver,
                new IntentFilter(ACTION_REPLY), Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(replyReceiver,
                new IntentFilter(ACTION_REPLY));
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        currentTitle = call.getString("title", currentTitle);
        currentBody = call.getString("body", currentBody);
        showNotification();
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        currentBody = call.getString("body", currentBody);
        showNotification();
        call.resolve();
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        notificationManager.cancel(NOTIFICATION_ID);
        call.resolve();
    }

    private void showNotification() {
        RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
            .setLabel("Type here...").build();

        Intent replyIntent = new Intent(ACTION_REPLY);
        PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
            getContext(), 0, replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

        NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_edit, "Reply", replyPendingIntent)
            .addRemoteInput(remoteInput).build();

        Intent openIntent = getContext().getPackageManager()
            .getLaunchIntentForPackage(getContext().getPackageName());
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            getContext(), 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(currentTitle)
            .setContentText(currentBody)
            .setStyle(new NotificationCompat.MessagingStyle("You")
                .addMessage(currentBody, System.currentTimeMillis(), "Assistant"))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openPendingIntent)
            .addAction(replyAction)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .build();

        notificationManager.notify(NOTIFICATION_ID, notification);
    }

    @Override
    protected void handleOnDestroy() {
        if (replyReceiver != null) {
            getContext().unregisterReceiver(replyReceiver);
        }
        super.handleOnDestroy();
    }
}
```

---

## 4️⃣ MainActivity — Register All Plugins

### `MainActivity.java`

```java
package com.timeguard.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.timeguard.app.plugins.AppUsagePlugin;
import com.timeguard.app.plugins.PersistentNotificationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUsagePlugin.class);
        registerPlugin(PersistentNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

---

## 5️⃣ AndroidManifest.xml Changes

Add to the `<manifest>` tag:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

Add permissions **before** `<application>`:
```xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
    tools:ignore="ProtectedPermissions" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Add **inside** `<application>`:
```xml
<!-- Accessibility Service for real-time app detection -->
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

## 6️⃣ String Resources

Add to `res/values/strings.xml` inside `<resources>`:

```xml
<string name="accessibility_service_description">TimeGuard uses accessibility to detect which app is in the foreground to help you track your productivity and stay focused.</string>
```

---

## 7️⃣ Build Configuration

In `android/app/build.gradle`, ensure Java 17:

```groovy
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

**Do NOT use `VERSION_21`.** Capacitor 8 targets Java 17.

---

## 8️⃣ Build & Deploy

```bash
# 1. Build web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Build APK
# Android Studio → Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## 9️⃣ Post-Install Setup (User Must Do)

After installing the APK on your device:

### Enable Accessibility Service
1. **Settings → Accessibility → Downloaded Services → TimeGuard**
2. Toggle **ON** and confirm

### Grant Usage Access
1. Open the app → tap "Grant Permission" in Focus Protection
2. System Settings will open → find TimeGuard → toggle ON

### Enable Notifications
1. On Android 13+, the app will prompt for notification permission
2. Allow it for the persistent notification to work

### Verify via Logcat
```bash
adb logcat -s TIMEGUARD_ACCESS TIMEGUARD_USAGE
```

---

## 🔟 How It All Works Together

1. **You open the app** and log "Working on project report"
2. **Persistent Notification** appears as "💬 Quick Note" with your current activity
3. **Accessibility Service** starts watching which app is on screen
4. **You switch to Instagram** → Service detects `com.instagram.android`
5. **AppUsage Plugin** sees this is a known distraction app, starts timer
6. **You return to TimeGuard** after 3 minutes
7. **Distraction Prompt** appears: "You spent 3m on Instagram. Was this work-related?"
8. You tap "Distraction" → 3 minutes subtracted from productive time
9. **From notification**, you can type "switched to email" → app logs the new activity without opening

### Privacy
- Notification looks like a generic chat app message
- No time-tracking language visible to others
- Accessibility description is neutral
- All data stays on-device (except AI analysis calls)

---

## Capacitor Config Reminder

For **production APK** builds, ensure `capacitor.config.ts` has the server block **commented out**:

```ts
// server: {
//   url: '...',
//   cleartext: true
// },
```

For **development hot-reload**, uncomment it with your preview URL.
