import { loginSchema, UserRole, validateWith } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '../../src/lib/apiError';
import { useAppDispatch } from '../../src/store/hooks';
import { useLoginMutation } from '../../src/store/rtk/authSlice/auth.service';
import { setSession } from '../../src/store/slices/authSlice';
import { Button, StackPage, Text, TextField } from '../../src/ui';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function submit() {
    // Same schema the api validates with.
    const result = validateWith(loginSchema, { email, password });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    setServerError(null);
    try {
      const res = await login(result.data).unwrap();
      if (res.user.role !== UserRole.CUSTOMER) {
        setServerError('This is a merchant or staff account. Sign in on the Tranche dashboard instead.');
        return;
      }
      dispatch(setSession(res));
      router.replace('/(tabs)/shop');
    } catch (e) {
      setServerError(errorMessage(e));
    }
  }

  return (
    <StackPage
      title="Sign in"
      heading="Welcome back"
      intro="Sign in to see your plans and what's due next."
      footer={
        <View style={{ gap: 10 }}>
          <Button label="Sign in" block loading={isLoading} onPress={submit} />
          <Button label="Create an account" variant="quiet" block onPress={() => router.replace('/auth/register')} />
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email}
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          error={errors.password}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {serverError ? (
          <Text variant="footnote" color="danger">
            {serverError}
          </Text>
        ) : null}
        {__DEV__ ? (
          <Button
            label="Use demo shopper"
            variant="secondary"
            size="sm"
            onPress={() => {
              setEmail('customer@tranche.ng');
              setPassword('Tranche123!');
            }}
          />
        ) : null}
      </View>
    </StackPage>
  );
}
