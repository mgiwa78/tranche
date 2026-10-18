import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';

import { AppConfigGate } from '../src/session/AppConfigGate';
import { SessionManager } from '../src/session/SessionManager';
import { AuthHydrator } from '../src/store/AuthHydrator';
import { store } from '../src/store/store';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Completes the Paystack auth session when the app is reopened by the callback deep link (web/Android).
WebBrowser.maybeCompleteAuthSession();

function AppStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style={colors.statusBar} />
      <SessionManager />
      <AppConfigGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
            animation: 'default',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="checkout/[productId]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="checkout/result" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="checkout/callback" options={{ animation: 'none' }} />
        </Stack>
      </AppConfigGate>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthHydrator>
          <ThemeProvider>
            <AppStack />
          </ThemeProvider>
        </AuthHydrator>
      </Provider>
    </GestureHandlerRootView>
  );
}
