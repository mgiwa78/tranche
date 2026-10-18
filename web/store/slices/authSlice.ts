import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { decryptData, encryptData } from "@/helpers/encrypt-data";
import type { Me } from "@/types/global";

const STORAGE_KEY = "tranche-web-auth";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Me | null;
  hydrated: boolean;
}

interface PersistedAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Me | null;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
};

function persist(state: PersistedAuthState) {
  if (typeof window === "undefined") return;
  if (!state.accessToken) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    encryptData({ accessToken: state.accessToken, refreshToken: state.refreshToken, user: state.user }),
  );
}

export function getAuthState(): AuthState {
  if (typeof window === "undefined") {
    return initialState;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const persisted = decryptData<PersistedAuthState>(raw);
  if (!persisted) return initialState;
  return { ...persisted, hydrated: false };
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ accessToken: string; refreshToken: string; user: Me }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      persist(state);
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string; user?: Me }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      if (action.payload.user) state.user = action.payload.user;
      persist(state);
    },
    setUser(state, action: PayloadAction<Me>) {
      state.user = action.payload;
      persist(state);
    },
    initializeUser(state) {
      state.hydrated = true;
    },
    logOut(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      persist(state);
    },
  },
});

export const { setSession, setTokens, setUser, initializeUser, logOut } = authSlice.actions;
export default authSlice.reducer;
