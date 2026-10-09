import { signInRequestSchema, verifyCodeSchema } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm({
    resolver: zodResolver(signInRequestSchema),
    defaultValues: { email: '' },
  });
  const codeForm = useForm({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { email: '', code: '' },
  });

  const requestCode = emailForm.handleSubmit(async ({ email }) => {
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpError) return setError(otpError.message);
    codeForm.reset({ email, code: '' });
    setSentTo(email);
  });

  const verifyCode = codeForm.handleSubmit(async ({ email, code }) => {
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (verifyError) return setError('That code is invalid or expired. Request a new one.');
    if (router.canDismiss()) router.dismissAll();
    router.replace('/account');
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center gap-6 px-6">
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Sign in</Text>
            <Text className="text-base text-muted-foreground">
              {sentTo
                ? `Enter the 6-digit code we sent to ${sentTo}.`
                : 'Save cars, track inquiries, or manage your dealership.'}
            </Text>
          </View>

          {sentTo ? (
            <Controller
              control={codeForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <TextField
                  label="Sign-in code"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  error={fieldState.error?.message}
                  className="text-center text-xl tracking-[8px]"
                />
              )}
            />
          ) : (
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <TextField
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                  error={fieldState.error?.message}
                />
              )}
            />
          )}

          {error ? (
            <Text accessibilityRole="alert" className="text-sm text-destructive">
              {error}
            </Text>
          ) : null}

          {sentTo ? (
            <View className="gap-3">
              <Button
                title="Sign in"
                onPress={verifyCode}
                loading={codeForm.formState.isSubmitting}
              />
              <Button
                title="Use a different email"
                variant="ghost"
                onPress={() => setSentTo(null)}
              />
            </View>
          ) : (
            <Button
              title="Email me a sign-in code"
              onPress={requestCode}
              loading={emailForm.formState.isSubmitting}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
