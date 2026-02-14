import { registerPlugin } from '@capacitor/core';

export interface PersistentNotificationPlugin {
  /**
   * Show a persistent notification that looks like a chat message.
   * Includes a text input (RemoteInput) for quick activity logging.
   */
  show(options: {
    /** Title shown in notification - keep generic/innocuous */
    title: string;
    /** Body text - the "last message" shown */
    body: string;
    /** Notification channel ID */
    channelId?: string;
  }): Promise<void>;

  /**
   * Update the notification body text (e.g., show current activity)
   */
  update(options: {
    body: string;
  }): Promise<void>;

  /**
   * Dismiss the persistent notification
   */
  dismiss(): Promise<void>;

  /**
   * Listen for text input from the notification reply action
   */
  addListener(
    eventName: 'notificationReply',
    listenerFunc: (event: { text: string }) => void
  ): Promise<{ remove: () => void }>;
}

const PersistentNotification = registerPlugin<PersistentNotificationPlugin>(
  'PersistentNotification',
  {
    web: () => import('./PersistentNotificationWeb').then(m => new m.PersistentNotificationWeb()),
  }
);

export default PersistentNotification;
