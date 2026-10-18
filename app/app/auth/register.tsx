import { registerCustomerSchema, validateWith } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { errorMessage, fieldErrors } from '../../src/lib/apiError';
import { useAppDispatch } from '../../src/store/hooks';
import { useRegisterMutation } from '../../src/store/rtk/authSlice/auth.service';
import { setSession } from '../../src/store/slices/authSlice';
import { Button, StackPage, Text, TextField } from '../../src/ui';

type Draft = { firstName: string; lastName: string; email: string; phone: string; password: string };

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [draft, setDraft] = useState<Draft>({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const bind = (key: keyof Draft) => ({
    value: draft[key],
    onChangeText: (v: string) => setDraft((d) => ({ ...d, [key]: v })),
    error: errors[key],
  });

  async function submit() {
    const result = validateWith(registerCustomerSchema, { ...draft, phone: draft.phone.trim() || undefined });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    setServerError(null);
    try {
      const res = await register(result.data).unwrap();
      dispatch(setSession(res));
      router.replace('/(tabs)/shop');
    } catch (e) {
      setErrors(fieldErrors(e));
      setServerError(errorMessage(e));
    }
  }

  return (
    <StackPage
      title="Create account"
      heading="Create your account"
      intro="It takes a minute. No paperwork, no interest."
      footer={
        <View style={{ gap: 10 }}>
          <Button label="Create account" block loading={isLoading} onPress={submit} />
          <Text variant="footnote" color="ink3" align="center">
            By continuing you agree to the Tranche terms and privacy policy.
          </Text>
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField label="First name" autoComplete="given-name" {...bind('firstName')} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Last name" autoComplete="family-name" {...bind('lastName')} />
          </View>
        </View>
        <TextField
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          {...bind('email')}
        />
        <TextField label="Phone" hint="Optional" keyboardType="phone-pad" autoComplete="tel" {...bind('phone')} />
        <TextField
          label="Password"
          hint="8+ characters with a letter and a number"
          secureTextEntry
          autoComplete="new-password"
          {...bind('password')}
        />
        {serverError ? (
          <Text variant="footnote" color="danger">
            {serverError}
          </Text>
        ) : null}
      </View>
    </StackPage>
  );
}
