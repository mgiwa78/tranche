import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AppearanceMode = 'system' | 'light' | 'dark';

export interface SettingsState {
  appearance: AppearanceMode;
  /** Payment reminders and receipts by push. Off = in-app inbox only. */
  pushEnabled: boolean;
  hydrated: boolean;
}

const STORAGE_KEY = 'tranche-settings-v1';

const initialState: SettingsState = {
  appearance: 'system',
  pushEnabled: true,
  hydrated: false,
};

export const APPEARANCE_OPTIONS: { key: AppearanceMode; label: string; hint: string }[] = [
  { key: 'system', label: 'Match system', hint: 'Follows your phone: paper by day, navy at night.' },
  { key: 'light', label: 'Light', hint: 'Cool paper with navy text.' },
  { key: 'dark', label: 'Dark', hint: 'Brand navy throughout.' },
];

async function persist(state: SettingsState) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ appearance: state.appearance, pushEnabled: state.pushEnabled }),
    );
  } catch {}
}

export async function loadPersistedSettings(): Promise<Partial<SettingsState> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SettingsState>;
  } catch {
    return null;
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setAppearance(state, action: PayloadAction<AppearanceMode>) {
      state.appearance = action.payload;
      void persist(state);
    },
    setPushEnabled(state, action: PayloadAction<boolean>) {
      state.pushEnabled = action.payload;
      void persist(state);
    },
    hydrateSettings(state, action: PayloadAction<Partial<SettingsState> | null>) {
      if (action.payload) Object.assign(state, action.payload);
      state.hydrated = true;
    },
  },
});

export const { setAppearance, setPushEnabled, hydrateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
