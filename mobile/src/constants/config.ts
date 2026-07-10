import Constants from 'expo-constants';

// Automatically detect host IP address for local network testing on physical devices
const getBaseUrl = (): string => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:3002/api`;
  }
  return 'http://localhost:3002/api';
};

export const API_URL = getBaseUrl();
console.log('[Zihai Config] Resolved API URL:', API_URL);
