import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apptitudelabs.pinit',
  appName: 'PINIT',
  webDir: 'dist',
  server: {
    url: 'https://mark-this-spot-mobile.vercel.app',
    cleartext: false
  }
};

export default config;