import { updateProfileSchema, validateWith } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { errorMessage, fieldErrors } from '../../src/lib/apiError';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { useUpdateMeMutation } from '../../src/store/rtk/authSlice/auth.service';
import { setUser } from '../../src/store/slices/authSlice';
import { Button, StackPage, TextField } from '../../src/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [update, { isLoading }] = useUpdateMeMutation();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save() {
    const result = validateWith(updateProfileSchema, { firstName, lastName, phone: phone.trim() || null });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    try {
      dispatch(setUser(await update(result.data).unwrap()));
      router.back();
    } catch (e) {
      setErrors(fieldErrors(e));
      Alert.alert("Couldn't save", errorMessage(e));
    }
  }

  return (
    <StackPage title="Profile" footer={<Button label="Save" block loading={isLoading} onPress={save} />}>
      <View style={{ gap: 18 }}>
        <TextField label="First name" value={firstName} onChangeText={setFirstName} error={errors.firstName} />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} error={errors.lastName} />
        <TextField label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={errors.phone} />
        <TextField label="Email" value={user?.email ?? ''} editable={false} hint="Contact support to change your email" />
      </View>
    </StackPage>
  );
}
