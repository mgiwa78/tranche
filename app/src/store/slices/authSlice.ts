import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

import type { AuthTokens, MeView } from '../../types/api';

const STORAGE_KEY = 'tranche-auth-v1';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: MeView | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  hasSeenOnboarding: boolean;
}

interface PersistedAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: MeView | null;
  isAuthenticated: boolean;
  userId: string | null;
  hasSeenOnboarding: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  isAuthenticated: false,
  userId: null,
  hasSeenOnboarding: false,
};

function toPersisted(state: AuthState): PersistedAuthState {
  return {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    userId: state.userId,
    hasSeenOnboarding: state.hasSeenOnboarding,
  };
}

// Tokens live in the keychain / keystore, never AsyncStorage.
async function persist(state: AuthState) {
  try {
    const data = toPersisted(state);
    if (!data.accessToken && !data.isAuthenticated && !data.hasSeenOnboarding) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadPersistedAuth(): Promise<PersistedAuthState | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    return null;
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ accessToken: string; refreshToken: string; user: MeView }>) {
      const { accessToken, refreshToken, user } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isAuthenticated = true;
      state.userId = user.id;
      state.hasSeenOnboarding = true;
      void persist(state);
    },
    setTokens(state, action: PayloadAction<AuthTokens>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      void persist(state);
    },
    setUser(state, action: PayloadAction<MeView>) {
      state.user = action.payload;
      state.userId = action.payload.id;
      void persist(state);
    },
    setSeenOnboarding(state) {
      state.hasSeenOnboarding = true;
      void persist(state);
    },
    hydrateAuth(state, action: PayloadAction<PersistedAuthState | null>) {
      if (action.payload) Object.assign(state, action.payload);
      state.hydrated = true;
    },
    logOut(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.userId = null;
      void persist(state);
    },
  },
});

export const { setSession, setTokens, setUser, setSeenOnboarding, hydrateAuth, logOut } = authSlice.actions;
export default authSlice.reducer;
