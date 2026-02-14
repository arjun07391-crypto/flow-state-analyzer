import type { PersistentNotificationPlugin } from './PersistentNotificationPlugin';

/**
 * Web fallback - no-op since persistent notifications with input
 * require native Android APIs (Notification.Action with RemoteInput)
 */
export class PersistentNotificationWeb implements PersistentNotificationPlugin {
  async show(_options: { title: string; body: string; channelId?: string }): Promise<void> {
    console.log('PersistentNotification: Web platform - persistent notification not available');
  }

  async update(_options: { body: string }): Promise<void> {
    console.log('PersistentNotification: Web platform - update not available');
  }

  async dismiss(): Promise<void> {
    console.log('PersistentNotification: Web platform - dismiss not available');
  }

  async addListener(
    _eventName: 'notificationReply',
    _listenerFunc: (event: { text: string }) => void
  ): Promise<{ remove: () => void }> {
    console.log('PersistentNotification: Web platform - listeners not available');
    return { remove: () => {} };
  }
}
