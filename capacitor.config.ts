import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaccineroutine.app',
  appName: 'Vaccine Routine',
  webDir: 'dist',
  android: {
    backgroundColor: '#100F0E',
    adjustMarginsForEdgeToEdge: 'auto',
  },
};

export default config;
