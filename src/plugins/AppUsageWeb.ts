import type { AppUsagePlugin, AppUsageInfo, ForegroundAppInfo } from './AppUsagePlugin';

/**
 * Web implementation - provides mock/limited functionality
 * Real implementation is in native Android code
 */
export class AppUsageWeb implements AppUsagePlugin {
  async hasPermission(): Promise<{ granted: boolean }> {
    console.log('AppUsage: Web platform - permission check not available');
    return { granted: false };
  }

  async requestPermission(): Promise<void> {
    console.log('AppUsage: Web platform - permission request not available');
    alert('App usage detection requires the native Android app. Please build and install the app on your device.');
  }

  async getUsageStats(_options: { startTime: number; endTime: number }): Promise<{ apps: AppUsageInfo[] }> {
    console.log('AppUsage: Web platform - usage stats not available');
    return { apps: [] };
  }

  async getForegroundApp(): Promise<ForegroundAppInfo> {
    console.log('AppUsage: Web platform - foreground app detection not available');
    return {
      packageName: 'web.browser',
      appName: 'Web Browser',
      timestamp: Date.now()
    };
  }

  async startMonitoring(_options: { intervalMs: number; workApps?: string[] }): Promise<void> {
    console.log('AppUsage: Web platform - monitoring not available');
  }

  async stopMonitoring(): Promise<void> {
    console.log('AppUsage: Web platform - monitoring not available');
  }

  async addListener(
    _eventName: 'appSwitched',
    _listenerFunc: (event: any) => void
  ): Promise<{ remove: () => void }> {
    console.log('AppUsage: Web platform - listeners not available');
    return { remove: () => {} };
  }
}
