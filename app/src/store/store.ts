import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { appApiSlice } from './rtk/appSlice/appApiSlice';
import './rtk/appSlice/registerEndpoints';
import { authApiSlice } from './rtk/authSlice/authApiSlice';
import './rtk/authSlice/registerEndpoints';
import { customerApiSlice } from './rtk/customerSlice/customerApiSlice';
import './rtk/customerSlice/registerEndpoints';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  settings: settingsReducer,
  [authApiSlice.reducerPath]: authApiSlice.reducer,
  [customerApiSlice.reducerPath]: customerApiSlice.reducer,
  [appApiSlice.reducerPath]: appApiSlice.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['meta.arg', 'meta.baseQueryMeta'],
      },
    })
      .concat(authApiSlice.middleware)
      .concat(customerApiSlice.middleware)
      .concat(appApiSlice.middleware),
});

/** Drops every cached query (sign-out). */
export function resetApiState() {
  store.dispatch(authApiSlice.util.resetApiState());
  store.dispatch(customerApiSlice.util.resetApiState());
  store.dispatch(appApiSlice.util.resetApiState());
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
