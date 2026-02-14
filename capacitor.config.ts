import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b0feeaf118154c5c9f9fdbd480f63cdb',
  appName: 'A Lovable project',
  webDir: 'dist',
  // Uncomment the server block below ONLY for development hot-reload:
  // server: {
  //   url: 'https://b0feeaf1-1815-4c5c-9f9f-dbd480f63cdb.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    }
  }
};

export default config;
