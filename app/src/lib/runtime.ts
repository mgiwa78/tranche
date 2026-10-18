import Constants from 'expo-constants';

/** Expo Go can't receive remote push on Android and has no custom native modules. */
export const isExpoGo = Constants.appOwnership === 'expo';

export const nativeModulesAvailable = !isExpoGo;
