# Persistent Notification Plugin - Native Android Implementation

This plugin shows a 24/7 persistent notification that looks like a **normal chat message** with a text reply action. No sensitive information is revealed — it appears as a generic messaging notification.

## What it does
- Shows an ongoing (non-dismissible) notification styled like a chat app
- Includes a **Reply** action with text input (Android RemoteInput API)
- When the user types and sends from the notification, it sends the text back to the web app
- The notification title shows "💬 Quick Note" — nothing about time tracking

## Native Implementation Required

Create this file in your Android project after running `npx cap add android`:

### File: `android/app/src/main/java/app/lovable/b0feeaf118154c5c9f9fdbd480f63cdb/PersistentNotificationPlugin.java`

```java
package app.lovable.b0feeaf118154c5c9f9fdbd480f63cdb;

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
    private static final String ACTION_REPLY = "app.lovable.ACTION_REPLY";

    private NotificationManager notificationManager;
    private String currentTitle = "💬 Quick Note";
    private String currentBody = "💬 Tap to open or reply with what you're doing";
    private BroadcastReceiver replyReceiver;

    @Override
    public void load() {
        notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        registerReplyReceiver();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Messages",  // Generic name - doesn't reveal app purpose
                NotificationManager.IMPORTANCE_LOW  // No sound, just visual
            );
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
                    String replyText = remoteInput.getCharSequence(KEY_TEXT_REPLY).toString();
                    
                    // Send reply back to web app
                    JSObject data = new JSObject();
                    data.put("text", replyText);
                    notifyListeners("notificationReply", data);
                    
                    // Update notification to show the reply was received
                    currentBody = "✓ Got it: " + replyText;
                    showNotification();
                    
                    // Reset body after 3 seconds
                    getActivity().getWindow().getDecorView().postDelayed(() -> {
                        currentBody = "💬 Tap to open or reply with what you're doing";
                        showNotification();
                    }, 3000);
                }
            }
        };
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(replyReceiver, new IntentFilter(ACTION_REPLY), Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(replyReceiver, new IntentFilter(ACTION_REPLY));
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
        // Create reply action with text input
        RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
            .setLabel("Type here...")  // Generic placeholder
            .build();

        Intent replyIntent = new Intent(ACTION_REPLY);
        PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
            getContext(), 0, replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );

        NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_edit,
            "Reply",
            replyPendingIntent
        ).addRemoteInput(remoteInput).build();

        // Open app intent
        Intent openIntent = getContext().getPackageManager()
            .getLaunchIntentForPackage(getContext().getPackageName());
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            getContext(), 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification that looks like a chat message
        Notification notification = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)  // Generic chat icon
            .setContentTitle(currentTitle)
            .setContentText(currentBody)
            .setStyle(new NotificationCompat.MessagingStyle("You")
                .addMessage(currentBody, System.currentTimeMillis(), "Assistant"))
            .setOngoing(true)  // Persistent - can't be swiped away
            .setPriority(NotificationCompat.PRIORITY_LOW)  // No sound
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

### Register the plugin in `MainActivity.java`:

```java
import app.lovable.b0feeaf118154c5c9f9fdbd480f63cdb.PersistentNotificationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PersistentNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

## How it looks to others

The notification appears as:
- 📧 envelope icon (generic messaging icon)
- Title: "💬 Quick Note"  
- Body: shows current activity or generic prompt
- Reply action: standard Android inline reply

**Nothing reveals it's a time tracker.** It looks like any chat/notes app notification.

## Privacy notes
- No sensitive data shown in notification content
- Activity descriptions are kept brief
- The notification channel is named "Messages" in system settings
