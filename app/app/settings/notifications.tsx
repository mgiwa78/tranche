import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { pushPermissionGranted } from '../../src/lib/push';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setPushEnabled } from '../../src/store/slices/settingsSlice';
import { ListGroup, ListRow, StackPage } from '../../src/ui';

export default function NotificationsScreen() {
  const dispatch = useAppDispatch();
  const pushEnabled = useAppSelector((s) => s.settings.pushEnabled);
  const reminderDays = 3;
  const [osAllowed, setOsAllowed] = useState(true);

  useEffect(() => {
    void pushPermissionGranted().then(setOsAllowed);
  }, [pushEnabled]);

  return (
    <StackPage title="Notifications">
      <ListGroup
        footer={`Push reminders arrive ${reminderDays} days before and on the day of every payment, plus receipts when a payment clears. Everything is also kept in Activity.`}
      >
        <ListRow
          label="Payment reminders"
          hint="Push notifications on this phone"
          accessory={{ type: 'toggle', value: pushEnabled, onChange: (v) => dispatch(setPushEnabled(v)) }}
        />
      </ListGroup>
      {pushEnabled && !osAllowed ? (
        <ListGroup footer="Notifications are turned off for Tranche in your phone's settings.">
          <ListRow label="Open phone settings" icon="external" onPress={() => void Linking.openSettings()} />
        </ListGroup>
      ) : null}
    </StackPage>
  );
}
