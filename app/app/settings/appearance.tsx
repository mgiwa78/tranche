import React from 'react';

import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { APPEARANCE_OPTIONS, setAppearance } from '../../src/store/slices/settingsSlice';
import { haptic, ListGroup, ListRow, StackPage } from '../../src/ui';

export default function AppearanceScreen() {
  const dispatch = useAppDispatch();
  const appearance = useAppSelector((s) => s.settings.appearance);

  return (
    <StackPage title="Appearance">
      <ListGroup>
        {APPEARANCE_OPTIONS.map((o) => (
          <ListRow
            key={o.key}
            label={o.label}
            hint={o.hint}
            accessory={{ type: 'radio', selected: appearance === o.key }}
            onPress={() => {
              haptic.select();
              dispatch(setAppearance(o.key));
            }}
          />
        ))}
      </ListGroup>
    </StackPage>
  );
}
