import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velthor.app',
  appName: 'Time Guardian',
  webDir: 'dist',
  server: {
    url: 'https://536bd3b8-baca-4546-b08e-4d0b2414a9b0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    }
  }
};

export default config;
