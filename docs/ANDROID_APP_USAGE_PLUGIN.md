# Android App Usage Plugin - Native Implementation

This document describes how to implement the native Android code for the AppUsage Capacitor plugin after exporting the project.

## Prerequisites

1. Export project to GitHub
2. Run `npm install`
3. Run `npx cap add android`
4. Run `npx cap sync`

## Step 1: Create the Plugin Class

Create file: `android/app/src/main/java/app/lovable/plugins/AppUsagePlugin.java`

```java
package app.lovable.plugins;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

@CapacitorPlugin(name = "AppUsage")
public class AppUsagePlugin extends Plugin {
    
    private Handler handler;
    private Runnable monitorRunnable;
    private boolean isMonitoring = false;
    private String lastForegroundApp = "";
    private List<String> workApps = new ArrayList<>();
    private List<String> distractionApps = new ArrayList<>();
    
    // Common distraction apps
    private static final String[] DEFAULT_DISTRACTION_APPS = {
        "com.whatsapp",
        "com.instagram.android",
        "com.facebook.katana",
        "com.twitter.android",
        "com.discord",
        "com.snapchat.android",
        "com.zhiliaoapp.musically",
        "com.google.android.youtube",
        "com.netflix.mediaclient",
        "com.reddit.frontpage"
    };
    
    @Override
    public void load() {
        handler = new Handler(Looper.getMainLooper());
        
        // Initialize distraction apps list
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
        if (!hasUsageStatsPermission()) {
            call.reject("Usage stats permission not granted");
            return;
        }
        
        String foregroundApp = getForegroundPackage();
        String appName = getAppName(foregroundApp);
        
        JSObject result = new JSObject();
        result.put("packageName", foregroundApp);
        result.put("appName", appName);
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
        
        // Get work apps from call
        try {
            JSArray workAppsArray = call.getArray("workApps");
            if (workAppsArray != null) {
                workApps.clear();
                for (int i = 0; i < workAppsArray.length(); i++) {
                    workApps.add(workAppsArray.getString(i));
                }
            }
        } catch (Exception e) {
            // Use defaults
        }
        
        isMonitoring = true;
        lastForegroundApp = getForegroundPackage();
        
        monitorRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isMonitoring) return;
                
                String currentApp = getForegroundPackage();
                
                if (!currentApp.equals(lastForegroundApp)) {
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
    
    private String getForegroundPackage() {
        UsageStatsManager usm = (UsageStatsManager) getContext()
            .getSystemService(Context.USAGE_STATS_SERVICE);
        
        long time = System.currentTimeMillis();
        List<UsageStats> stats = usm.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            time - 10000,
            time
        );
        
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

## Step 2: Register the Plugin

Edit `android/app/src/main/java/app/lovable/MainActivity.java`:

```java
package app.lovable;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.lovable.plugins.AppUsagePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUsagePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

## Step 3: Add Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" 
    tools:ignore="ProtectedPermissions" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

And add the tools namespace to the manifest tag:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

## Step 4: Build and Test

1. Run `npx cap sync android`
2. Open in Android Studio: `npx cap open android`
3. Build and run on device/emulator
4. Grant Usage Access permission when prompted

## How It Works

1. The plugin monitors which app is in the foreground every 2 seconds
2. When you switch to a known distraction app (WhatsApp, Instagram, etc.), it records the start time
3. When you return to Time Guardian, it calculates how long you were away
4. If > 30 seconds, you get a prompt asking if it was work-related
5. Non-work time is tracked and can be subtracted from your activity duration

## Adding More Distraction Apps

The app comes with common social/entertainment apps pre-configured. You can:
1. Use the "Manage App Categories" dialog in the app to mark apps as work/non-work
2. Add more package names to the database `app_categories` table
