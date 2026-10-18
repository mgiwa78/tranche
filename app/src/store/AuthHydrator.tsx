import { useEffect, type ReactNode } from 'react';

import { useAppDispatch } from './hooks';
import { hydrateAuth, loadPersistedAuth } from './slices/authSlice';
import { hydrateSettings, loadPersistedSettings } from './slices/settingsSlice';

export function AuthHydrator({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [auth, settings] = await Promise.all([loadPersistedAuth(), loadPersistedSettings()]);
      if (cancelled) return;
      dispatch(hydrateAuth(auth));
      dispatch(hydrateSettings(settings));
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return <>{children}</>;
}
