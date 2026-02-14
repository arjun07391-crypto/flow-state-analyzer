import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import PersistentNotification from '@/plugins/PersistentNotificationPlugin';

interface UsePersistentNotificationOptions {
  onReply: (text: string) => void;
  currentActivity?: string;
}

export function usePersistentNotification({ onReply, currentActivity }: UsePersistentNotificationOptions) {
  const [isActive, setIsActive] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Listen for notification replies
  useEffect(() => {
    if (!isNative) return;

    let removeListener: (() => void) | null = null;

    PersistentNotification.addListener('notificationReply', (event) => {
      if (event.text?.trim()) {
        onReply(event.text.trim());
      }
    }).then(handle => {
      removeListener = handle.remove;
    });

    return () => {
      removeListener?.();
    };
  }, [isNative, onReply]);

  // Update notification body when current activity changes
  useEffect(() => {
    if (!isNative || !isActive) return;

    const body = currentActivity
      ? `📍 ${currentActivity}`
      : '💬 Tap to open or reply with what you\'re doing';

    PersistentNotification.update({ body });
  }, [isNative, isActive, currentActivity]);

  const startNotification = useCallback(async () => {
    if (!isNative) return;

    await PersistentNotification.show({
      title: '💬 Quick Note',
      body: currentActivity
        ? `📍 ${currentActivity}`
        : '💬 Tap to open or reply with what you\'re doing',
      channelId: 'persistent_chat',
    });
    setIsActive(true);
  }, [isNative, currentActivity]);

  const stopNotification = useCallback(async () => {
    if (!isNative) return;

    await PersistentNotification.dismiss();
    setIsActive(false);
  }, [isNative]);

  return {
    isNative,
    isActive,
    startNotification,
    stopNotification,
  };
}
