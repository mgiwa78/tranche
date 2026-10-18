import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import { authApiSlice } from "./rtk/authSlice/authApiSlice";
import "./rtk/authSlice/registerEndpoints";
import { merchantApiSlice } from "./rtk/merchantSlice/merchantApiSlice";
import "./rtk/merchantSlice/registerEndpoints";
import { adminApiSlice } from "./rtk/adminSlice/adminApiSlice";
import "./rtk/adminSlice/registerEndpoints";
import { errorMiddleware } from "./rtk/errorMiddleware";
import authReducer, { getAuthState } from "./slices/authSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  [authApiSlice.reducerPath]: authApiSlice.reducer,
  [merchantApiSlice.reducerPath]: merchantApiSlice.reducer,
  [adminApiSlice.reducerPath]: adminApiSlice.reducer,
});

const authPreload = typeof window !== "undefined" ? getAuthState() : undefined;

const logger = createLogger({
  collapsed: true,
  diff: true,
  duration: true,
  timestamp: true,
});

const isDev = process.env.NODE_ENV === "development";

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: authPreload ? { auth: authPreload } : undefined,
  middleware: (getDefaultMiddleware) => {
    const base = getDefaultMiddleware()
      .concat(errorMiddleware)
      .concat(authApiSlice.middleware)
      .concat(merchantApiSlice.middleware)
      .concat(adminApiSlice.middleware);
    return isDev ? base.concat(logger) : base;
  },
});

/** Clears every cached query (sign-out, or switching accounts). */
export const resetApiState = () => {
  store.dispatch(authApiSlice.util.resetApiState());
  store.dispatch(merchantApiSlice.util.resetApiState());
  store.dispatch(adminApiSlice.util.resetApiState());
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
