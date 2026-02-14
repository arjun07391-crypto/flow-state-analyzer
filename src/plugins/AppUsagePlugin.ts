import { registerPlugin } from '@capacitor/core';

export interface AppUsageInfo {
  packageName: string;
  appName: string;
  lastTimeUsed: number;
  totalTimeInForeground: number;
}

export interface ForegroundAppInfo {
  packageName: string;
  appName: string;
  timestamp: number;
}

export interface AppUsagePlugin {
  /**
   * Check if usage stats permission is granted
   */
  hasPermission(): Promise<{ granted: boolean }>;
  
  /**
   * Request usage stats permission (opens system settings)
   */
  requestPermission(): Promise<void>;
  
  /**
   * Get usage stats for a time range
   */
  getUsageStats(options: { 
    startTime: number; 
    endTime: number;
  }): Promise<{ apps: AppUsageInfo[] }>;
  
  /**
   * Get the currently foreground app
   */
  getForegroundApp(): Promise<ForegroundAppInfo>;
  
  /**
   * Start monitoring foreground app changes
   */
  startMonitoring(options: { 
    intervalMs: number;
    workApps?: string[];
  }): Promise<void>;
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): Promise<void>;
  
  /**
   * Add listener for app switches
   */
  addListener(
    eventName: 'appSwitched',
    listenerFunc: (event: { 
      fromApp: string;
      toApp: string;
      toAppName: string;
      timestamp: number;
      isDistraction: boolean;
    }) => void
  ): Promise<{ remove: () => void }>;
}

// Register the plugin - will be implemented natively
const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage', {
  web: () => import('./AppUsageWeb').then(m => new m.AppUsageWeb()),
});

export default AppUsage;
